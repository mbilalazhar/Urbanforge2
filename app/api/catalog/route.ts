import { catalog } from "@/lib/admin/server";

export const runtime = "nodejs";
export function GET() { return catalog(); }
