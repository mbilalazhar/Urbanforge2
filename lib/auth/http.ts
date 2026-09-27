import "server-only";

import { MongoServerError } from "mongodb";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function authRoute(action: () => Promise<NextResponse>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AuthError) return json({ message: error.message }, error.status);
    if (error instanceof MongoServerError && error.code === 11000) {
      return json({ message: "An account with this email already exists." }, 409);
    }
    // Never send database connection details or credentials to the browser.
    return json({ message: "Authentication is temporarily unavailable. Please try again later." }, 503);
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new AuthError("Request origin is not allowed.", 403);
  }
}

export async function readBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  checkOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AuthError("Send a JSON request body.", 415);
  }
  // Bound streamed input as well as requests with a Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("A request body is required.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new AuthError("Request body is too large.", 413);
    }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AuthError("Invalid JSON request body.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message, 400);
  return parsed.data;
}
