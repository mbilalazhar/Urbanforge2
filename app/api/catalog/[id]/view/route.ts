import { recordView } from "@/lib/admin/server";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return recordView(request, (await context.params).id); }
