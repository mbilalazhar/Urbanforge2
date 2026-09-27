import { login } from "@/lib/auth/handlers";

export const runtime = "nodejs";

export function POST(request: Request) {
  return login(request, "user");
}
