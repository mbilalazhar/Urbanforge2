import { productUpdate, productDelete } from "@/lib/admin/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return productUpdate(request, (await context.params).id);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return productDelete(request, (await context.params).id);
}
