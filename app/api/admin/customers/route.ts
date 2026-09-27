import { customerList } from "@/lib/admin/server";

export const runtime = "nodejs";

export function GET(request: Request) { return customerList(request); }
