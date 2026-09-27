import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import User from "@/models/User";
import Admin from "@/models/Admin";
import type { AccountRole } from "./types";

export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const accountModels = { user: User, admin: Admin };
export const cookieName = (role: AccountRole) => `urbanforge_${role}_session`;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function newSession() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    stored: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) },
  };
}

export async function getCurrentAccount(role: AccountRole) {
  const token = (await cookies()).get(cookieName(role))?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const model = accountModels[role];
  const account = await model.findBySession(hashToken(token));
  return account ? model.toPublic(account) : null;
}

export function setSessionCookie(response: NextResponse, role: AccountRole, token: string, maxAge = SESSION_SECONDS) {
  response.cookies.set(cookieName(role), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
