import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import dbConnect from "@/lib/dbconnect";
import { mediaBucket } from "@/lib/admin/product-upload";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const bucket = mediaBucket(await dbConnect());
    const objectId = new ObjectId(id);
    const file = await bucket.find({ _id: objectId }).next();
    if (!file) return new Response(null, { status: 404 });
    const headers = new Headers({
      "Content-Type": file.metadata?.contentType ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    let start = 0, end = file.length - 1;
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || !match[1] && !match[2]) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.length}` } });
      start = match[1] ? Number(match[1]) : Math.max(0, file.length - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.length) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.length}` } });
      headers.set("Content-Range", `bytes ${start}-${end}/${file.length}`);
    }
    headers.set("Content-Length", String(end - start + 1));
    const stream = bucket.openDownloadStream(objectId, { start, end: end + 1 });
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
  } catch { return Response.json({ message: "Media is temporarily unavailable." }, { status: 503 }); }
}
