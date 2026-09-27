import { orderList, orderCreate } from "@/lib/admin/server";

export const runtime = "nodejs";

export function GET(request: Request) { return orderList(request); }

export function POST(request: Request) { return orderCreate(request); }
