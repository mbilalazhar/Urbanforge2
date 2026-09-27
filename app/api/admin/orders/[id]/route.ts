import { orderUpdate } from "@/lib/admin/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return orderUpdate(request, (await context.params).id);
}
