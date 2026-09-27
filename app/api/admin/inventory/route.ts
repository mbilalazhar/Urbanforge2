import { inventoryList, inventoryAdjust } from "@/lib/admin/server";

export const runtime = "nodejs";

export function GET(request: Request) { return inventoryList(request); }

export function POST(request: Request) { return inventoryAdjust(request); }
