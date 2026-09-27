import { productList, productCreate } from "@/lib/admin/server";

export const runtime = "nodejs";

export function GET(request: Request) { return productList(request); }

export function POST(request: Request) { return productCreate(request); }
