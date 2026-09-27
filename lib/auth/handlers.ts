import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { authRoute, AuthError, checkOrigin, json, readBody } from "./http";
import { loginSchema, signupSchema } from "./validation";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";
import { accountModels, cookieName, getCurrentAccount, hashToken, newSession, setSessionCookie } from "./session";
import { limitAuthAttempts } from "./rate-limit";
import type { AccountRole } from "./types";

function checkProvisioningKey(request: Request) {
  const expected = process.env.ADMIN_PROVISIONING_KEY;
  if (!expected || expected.length < 32) throw new AuthError("Admin provisioning is not configured.", 503);
  const supplied = request.headers.get("x-admin-provisioning-key") ?? "";
  if (!timingSafeEqual(Buffer.from(hashToken(expected)), Buffer.from(hashToken(supplied)))) {
    throw new AuthError("Unauthorized.", 401);
  }
}

export function signup(request: Request, role: AccountRole) {
  return authRoute(async () => {
    if (role === "admin") checkProvisioningKey(request);
    const input = await readBody(request, signupSchema);
    await limitAuthAttempts(`${role}:signup`, input.email);
    const model = accountModels[role];
    const session = role === "user" ? newSession() : undefined;
    const account = await model.create({
      name: input.name, email: input.email, passwordHash: await hashPassword(input.password),
    }, session?.stored);
    const response = json({ account: model.toPublic(account) }, 201);
    if (session) setSessionCookie(response, role, session.token);
    return response;
  });
}

export function login(request: Request, role: AccountRole) {
  return authRoute(async () => {
    const input = await readBody(request, loginSchema);
    await limitAuthAttempts(`${role}:login`, input.email);
    const model = accountModels[role];
    const account = await model.findByEmail(input.email);
    const valid = await verifyPassword(input.password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!account || !valid) throw new AuthError("Invalid email or password.", 401);
    const session = newSession();
    await model.addSession(account._id, session.stored);
    const previous = (await cookies()).get(cookieName(role))?.value;
    if (previous && /^[a-f0-9]{64}$/.test(previous)) await model.removeSession(hashToken(previous));
    const response = json({ account: model.toPublic(account) });
    setSessionCookie(response, role, session.token);
    return response;
  });
}

export function session(role: AccountRole) {
  return authRoute(async () => json({ account: await getCurrentAccount(role) }));
}

export function logout(request: Request, role: AccountRole) {
  return authRoute(async () => {
    checkOrigin(request);
    const token = (await cookies()).get(cookieName(role))?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) await accountModels[role].removeSession(hashToken(token));
    const response = json({ account: null });
    setSessionCookie(response, role, "", 0);
    return response;
  });
}
