import { productDuplicate } from "@/lib/admin/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return productDuplicate(request, (await context.params).id);
}
