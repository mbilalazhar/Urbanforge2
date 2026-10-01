import { removeWishlistProduct } from "@/lib/wishlist/server";
export const runtime = "nodejs";
export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  return removeWishlistProduct(request, (await params).productId);
}
