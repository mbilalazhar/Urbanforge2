import { promotionUpdate, promotionDelete } from "@/lib/admin/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return promotionUpdate(request, (await context.params).id);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return promotionDelete(request, (await context.params).id);
}
