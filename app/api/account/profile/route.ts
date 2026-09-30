import { z } from "zod";
import User from "@/models/User";
import { getCurrentAccount } from "@/lib/auth/session";
import { authRoute, AuthError, json, readBody } from "@/lib/auth/http";

export const runtime = "nodejs";
const phone = z.string().trim().max(30).refine(value => value === "" || /^[+\d][\d\s().-]{5,29}$/.test(value), "Enter a valid contact number.");
const required = z.string().trim().min(1, "Complete all required address fields.").max(150);
const address = z.object({
  recipient: required, contact: phone.refine(value => value !== "", "Enter a delivery contact number."),
  line1: required, line2: z.string().trim().max(150).default(""), city: required,
  region: required, postalCode: z.string().trim().max(20).default(""), country: required,
}).strict();
const profileUpdate = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100).optional(),
  contact: phone.optional(), defaultAddress: address.nullable().optional(),
  preferences: z.object({ orders: z.boolean(), news: z.boolean() }).strict().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Select profile details to update.");

export function GET() {
  return authRoute(async () => {
    const account = await getCurrentAccount("user");
    if (!account) throw new AuthError("Sign in to view your profile.", 401);
    const profile = await User.getProfile(account.id);
    if (!profile) throw new AuthError("User not found.", 404);
    return json({ profile });
  });
}
export function PATCH(request: Request) {
  return authRoute(async () => {
    const account = await getCurrentAccount("user");
    if (!account) throw new AuthError("Sign in to update your profile.", 401);
    const input = await readBody(request, profileUpdate);
    const profile = await User.updateProfile(account.id, input);
    if (!profile) throw new AuthError("User not found.", 404);
    return json({ profile });
  });
}
