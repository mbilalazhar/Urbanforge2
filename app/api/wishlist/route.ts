import { addWishlistProduct, getWishlist } from "@/lib/wishlist/server";
export const runtime = "nodejs";
export function GET() { return getWishlist(); }
export function POST(request: Request) { return addWishlistProduct(request); }
