import { signup } from "@/lib/auth/handlers";

export const runtime = "nodejs";

export function POST(request: Request) {
  return signup(request, "user");
}
