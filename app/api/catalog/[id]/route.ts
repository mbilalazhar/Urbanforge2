import { catalogProduct } from "@/lib/admin/server";
export const runtime = "nodejs";
export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => catalogProduct(id));
}
