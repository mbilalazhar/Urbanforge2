import { couponUpdate, couponDelete } from "@/lib/admin/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return couponUpdate(request, (await context.params).id);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return couponDelete(request, (await context.params).id);
}
