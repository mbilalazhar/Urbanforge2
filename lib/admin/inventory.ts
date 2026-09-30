import "server-only";
import { z } from "zod";
import type { Db, Filter } from "mongodb";
import { AuthError } from "@/lib/auth/http";
import type { AdminProduct, InventorySummary, StockMovement } from "./types";

export function summarizeInventory(products: AdminProduct[]): InventorySummary {
  const stocks = products.flatMap(product => product.variants.length ? product.variants.map(variant => variant.stock) : [product.stock]);
  return {
    units: stocks.reduce((sum, stock) => sum + stock, 0), trackedSkus: stocks.length,
    lowStockSkus: stocks.filter(stock => stock > 0 && stock <= 5).length,
    outOfStockSkus: stocks.filter(stock => stock === 0).length,
  };
}
const historyQuery = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  type: z.enum(["added", "sold", "returned", "adjustment"]).optional(),
  productId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  search: z.string().trim().max(150).default(""),
}).strict();
type MovementDoc = StockMovement & { _id: string; adminId: string };
export async function readInventoryHistory(db: Db, request: Request) {
  const parsed = historyQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new AuthError("Invalid stock history filters or pagination.", 400);
  const { page: requestedPage, limit, type, productId, search } = parsed.data;
  const filter: Filter<MovementDoc> = {};
  if (type) filter.type = type;
  if (productId) filter.productId = productId;
  if (search) {
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["productName", "reason", "sku", "variantLabel"].map(field => ({ [field]: { $regex: pattern, $options: "i" } }));
  }
  const collection = db.collection<MovementDoc>("admin_stock_movements");
  const [total, products] = await Promise.all([
    collection.countDocuments(filter),
    collection.aggregate<{ id: string; name: string }>([
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$productId", name: { $first: "$productName" } } },
      { $project: { _id: 0, id: "$_id", name: 1 } }, { $sort: { name: 1, id: 1 } },
    ]).toArray(),
  ]);
  const pages = Math.max(1, Math.ceil(total / limit)), page = Math.min(requestedPage, pages);
  const movements = await collection.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).project<StockMovement>({ _id: 0, adminId: 0 }).toArray();
  return { movements, products, total, page, pages, limit };
}
