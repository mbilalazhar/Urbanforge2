import { logout } from "@/lib/auth/handlers";

export const runtime = "nodejs";

export function POST(request: Request) {
  return logout(request, "admin");
}
