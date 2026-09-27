import "server-only";

import dbConnect from "@/lib/dbconnect";
import { hashToken } from "./session";
import { AuthError } from "./http";

// Database-backed counters are shared by all app instances.
export async function limitAuthAttempts(scope: string, email: string) {
  const db = await dbConnect();
  const attempts = db.collection<{ _id: string; count: number; expiresAt: Date }>("auth_attempts");
  await attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const result = await attempts.findOneAndUpdate(
    { _id: hashToken(`${scope}:${email}:${window}`) },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) } },
    { upsert: true, returnDocument: "after" },
  );
  if (result && result.count > 10) throw new AuthError("Too many attempts. Please try again in 15 minutes.", 429);
}
