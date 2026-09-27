import { session } from "@/lib/auth/handlers";

export const runtime = "nodejs";

export function GET() {
  return session("user");
}
