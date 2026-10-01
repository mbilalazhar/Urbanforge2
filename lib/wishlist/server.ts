import "server-only";
import { z } from "zod";
import User from "@/models/User";
import { getCurrentAccount } from "@/lib/auth/session";
import { AuthError, authRoute, checkOrigin, json, readBody } from "@/lib/auth/http";
import { catalogProductsByIds } from "@/lib/admin/server";

const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, "Invalid product ID.");
const addSchema = z.object({ productId: identifier }).strict();
async function currentUser() {
  const account = await getCurrentAccount("user");
  if (!account) throw new AuthError("Create an account or sign in to save your wishlist.", 401);
  return account;
}
async function response(accountId: string, productIds: string[] | null) {
  if (!productIds) throw new AuthError("User not found.", 404);
  const products = await catalogProductsByIds(productIds);
  return json({ accountId, productIds, products });
}
export function getWishlist() {
  return authRoute(async () => {
    const account = await currentUser();
    return response(account.id, await User.getWishlist(account.id));
  });
}
export function addWishlistProduct(request: Request) {
  return authRoute(async () => {
    const account = await currentUser();
    const { productId } = await readBody(request, addSchema);
    if (!(await catalogProductsByIds([productId])).length) throw new AuthError("This product is no longer available.", 404);
    return response(account.id, await User.setWishlistProduct(account.id, productId, true));
  });
}
export function removeWishlistProduct(request: Request, productId: string) {
  return authRoute(async () => {
    const account = await currentUser();
    checkOrigin(request);
    if (!identifier.safeParse(productId).success) throw new AuthError("Invalid product ID.", 400);
    // Allow removing saved references even after a product has been archived.
    return response(account.id, await User.setWishlistProduct(account.id, productId, false));
  });
}
