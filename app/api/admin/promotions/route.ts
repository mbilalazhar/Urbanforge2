import { promotionList, promotionCreate } from "@/lib/admin/server";

export const runtime = "nodejs";

export function GET(request: Request) { return promotionList(request); }

export function POST(request: Request) { return promotionCreate(request); }
