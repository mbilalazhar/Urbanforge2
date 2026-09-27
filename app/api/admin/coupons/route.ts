import { couponList, couponCreate } from "@/lib/admin/server";

export const runtime = "nodejs";

export function GET(request: Request) { return couponList(request); }

export function POST(request: Request) { return couponCreate(request); }
