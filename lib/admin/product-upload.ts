import "server-only";
import { GridFSBucket, ObjectId, type Db } from "mongodb";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ZodType } from "zod";
import { AuthError } from "@/lib/auth/http";
import { IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_MEDIA_BYTES } from "@/lib/product-media";

export const mediaBucket = (db: Db) => new GridFSBucket(db, { bucketName: "product_media" });

function matchesType(bytes: Buffer, type: string) {
  switch (type) {
    case "image/jpeg": return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case "image/png": return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/gif": return ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6));
    case "image/webp": return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    case "video/mp4": case "video/quicktime": return bytes.toString("ascii", 4, 8) === "ftyp";
    case "video/webm": return bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    default: return false;
  }
}

export async function readProductBody<T>(request: Request, db: Db, schema: ZodType<T>, readJson: (request: Request, schema: ZodType<T>) => Promise<T>) {
  const bucket = mediaBucket(db);
  const uploaded: ObjectId[] = [];
  const cleanup = async () => { await Promise.allSettled(uploaded.map(id => bucket.delete(id))); };
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "multipart/form-data") {
    return { input: await readJson(request, schema), cleanup };
  }
  // Bound actual bytes as well as Content-Length; clients can omit or forge that header.
  const limit = MAX_MEDIA_BYTES + 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new AuthError("Uploads must total no more than 100 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("A request body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > limit) { await reader.cancel(); throw new AuthError("Uploads must total no more than 100 MB.", 413); }
    chunks.push(chunk.value);
  }
  let form: FormData;
  try { form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new AuthError("Invalid multipart form data.", 400); }
  if ([...form.keys()].some(key => !["data", "images", "videos"].includes(key)) || form.getAll("data").length !== 1) throw new AuthError("Send one data JSON field and optional images and videos files.", 400);
  const data = form.get("data");
  if (typeof data !== "string" || Buffer.byteLength(data) > 262144) throw new AuthError("Product data must be JSON smaller than 256 KB.", 400);
  let input: Record<string, unknown>;
  try { input = JSON.parse(data); } catch { throw new AuthError("Invalid product JSON.", 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthError("Product data must be an object.", 400);
  const pending: { id: ObjectId; bytes: Buffer; type: string }[] = [];
  let mediaSize = 0;
  for (const kind of ["images", "videos"] as const) {
    const files = form.getAll(kind);
    if (!files.length) continue;
    const existing = input[kind] ?? [];
    const maximum = kind === "images" ? 30 : 10;
    if (!Array.isArray(existing) || existing.length + files.length > maximum) throw new AuthError(`Use at most ${maximum} ${kind}.`, 400);
    const urls = [...existing];
    for (const file of files) {
      if (typeof file === "string" || !file.size) throw new AuthError(`Select a nonempty ${kind === "images" ? "image" : "video"} file.`, 400);
      const types = kind === "images" ? IMAGE_TYPES : VIDEO_TYPES;
      if (!types.includes(file.type)) throw new AuthError("Supported files: JPEG, PNG, WebP, GIF, MP4, WebM, and MOV.", 400);
      if (file.size > (kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) throw new AuthError("Images must be at most 10 MB and videos at most 50 MB.", 413);
      mediaSize += file.size;
      if (mediaSize > MAX_MEDIA_BYTES) throw new AuthError("Uploads must total no more than 100 MB.", 413);
      const bytes = Buffer.from(await file.arrayBuffer());
      if (!matchesType(bytes, file.type)) throw new AuthError("File contents do not match the selected media type.", 400);
      const id = new ObjectId();
      pending.push({ id, bytes, type: file.type });
      urls.push(`/api/media/${id.toHexString()}`);
    }
    input[kind] = urls;
  }
  const result = schema.safeParse(input);
  if (!result.success) throw new AuthError(result.error.issues[0].message, 400);
  const parsed = request.method === "PATCH"
    ? Object.fromEntries(Object.keys(input).map(key => [key, (result.data as Record<string, unknown>)[key]])) as T
    : result.data;
  try {
    for (const file of pending) {
      uploaded.push(file.id);
      await pipeline(Readable.from([file.bytes]), bucket.openUploadStreamWithId(file.id, file.id.toHexString(), { metadata: { contentType: file.type } }));
    }
    return { input: parsed, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
