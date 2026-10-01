import "server-only";
import { subcategoriesFor, productTypesFor } from "@/lib/product-categories";
import { readProductBody } from "./product-upload";
import { readInventoryHistory, summarizeInventory } from "./inventory";

import { randomUUID } from "node:crypto";
import { MongoServerError, type ClientSession, type Db } from "mongodb";
import { z, type ZodType } from "zod";
import dbConnect from "@/lib/dbconnect";
import { AuthError, checkOrigin, json } from "@/lib/auth/http";
import { getCurrentAccount, hashToken } from "@/lib/auth/session";
import { orderStatuses, type AdminProduct, type AdminOrder, type AdminCoupon, type AdminPromotion, type StockMovement, type AdminCustomer } from "./types";

const text = z.string().trim().max(2000);
const short = z.string().trim().max(150);
const money = z.number().finite().min(0).max(1_000_000_000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, "Use at most two decimal places.");
const quantity = z.number().int().min(0).max(1_000_000);
const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, "Invalid identifier.");
const sku = z.string().trim().min(1).max(100).toUpperCase();
const media = z.string().trim().max(2000).refine(value => value.startsWith("/") && !value.startsWith("//") || /^https?:\/\//i.test(value), "Use an image path or an http(s) URL.");
const strings = z.array(short).max(100);
const timestamp = z.string().max(40).refine(value => value === "" || Number.isFinite(Date.parse(value)), "Enter a valid date.");
const variant = z.object({ id: identifier, sku, color: short, size: short, stock: quantity }).strict();
export const productSchema = z.object({
  name: short.min(1), description: text.default(""), shortDescription: text.default(""),
  category: short.min(1), subcategory: short.min(1), productType: short.default(""), brand: short.default(""), gender: short.default(""),
  price: money, salePrice: money.nullable().default(null), sku,
  images: z.array(media).min(1, "Add at least one product image.").max(30), videos: z.array(media).max(10).default([]),
  colors: strings.default([]), sizes: strings.default([]), material: short.default(""), stock: quantity.default(0), tags: strings.default([]),
  status: z.enum(["active", "inactive"]).default("inactive"), featured: z.boolean().default(false), newArrival: z.boolean().default(false), bestseller: z.boolean().default(false),
  seoTitle: short.default(""), seoDescription: text.default(""), variants: z.array(variant).max(200).default([]),
}).strict();
const orderCreateSchema = z.object({
  customerName: short.min(1), email: z.string().trim().toLowerCase().email().max(254), phone: short.default(""), address: text.default(""),
  items: z.array(z.object({ productId: identifier, variantId: identifier.optional(), quantity: z.number().int().min(1).max(10000) }).strict()).min(1).max(100),
  shipping: money.default(0), discount: money.default(0), couponCode: z.string().trim().max(60).toUpperCase().optional(), notes: text.default(""), paymentStatus: z.enum(["pending", "paid"]).default("pending"),
}).strict();
const orderPatchSchema = z.object({
  status: z.enum(orderStatuses).optional(), paymentStatus: z.enum(["pending", "paid", "refunded"]).optional(),
  courier: short.optional(), trackingNumber: short.optional(), notes: text.optional(),
  returnStatus: z.enum(["none", "requested", "approved", "rejected"]).optional(),
}).strict();
const inventorySchema = z.object({
  productId: identifier, variantId: identifier.optional(), quantity: z.number().int().min(-1_000_000).max(1_000_000).refine(value => value !== 0, "Enter a nonzero stock change."),
  type: z.enum(["added", "sold", "returned", "adjustment"]), reason: text.min(1), expectedStock: quantity.optional(),
}).strict();
const couponSchema = z.object({
  code: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/).toUpperCase(), type: z.enum(["percentage", "fixed", "free_shipping"]), value: money,
  minimumPurchase: money.default(0), maximumDiscount: money.nullable().default(null), startsAt: timestamp.default(""), endsAt: timestamp.default(""),
  usageLimit: quantity.default(0), productIds: z.array(identifier).max(1000).default([]), categories: strings.default([]),
  customerEmails: z.array(z.string().trim().toLowerCase().email()).max(1000).default([]), firstOrderOnly: z.boolean().default(false), active: z.boolean().default(true),
}).strict();
const promotionSchema = z.object({
  name: short.min(1), banner: z.union([media, z.literal("")]).default(""), startsAt: timestamp.refine(Boolean, "A start date is required."), endsAt: timestamp.refine(Boolean, "An end date is required."),
  productIds: z.array(identifier).min(1).max(1000), discountPercent: z.number().finite().min(0).max(100), active: z.boolean().default(true),
}).strict();

type ProductDoc = AdminProduct & { _id: string; skuKeys: string[]; deletedAt?: string };
type OrderDoc = AdminOrder & { _id: string; stockRestored: boolean; coupon?: { id: string; code: string; discount: number }; manualRefund?: { amount: number; note: string; adminId: string; recordedAt: string } };
type CouponDoc = AdminCoupon & { _id: string };
type PromotionDoc = Omit<AdminPromotion, "state"> & { _id: string };
type MovementDoc = StockMovement & { _id: string; adminId: string };
let databasePromise: Promise<Db> | undefined;
async function database() {
  if (!databasePromise) databasePromise = (async () => {
    const db = await dbConnect();
    await Promise.all([
      db.collection("admin_products").createIndex({ skuKeys: 1 }, { unique: true }),
      db.collection("admin_orders").createIndex({ number: 1 }, { unique: true }),
      db.collection("admin_orders").createIndex({ email: 1, createdAt: -1 }),
      db.collection("admin_coupons").createIndex({ code: 1 }, { unique: true }),
      db.collection("admin_stock_movements").createIndex({ productId: 1, createdAt: -1 }),
      db.collection("admin_stock_movements").createIndex({ createdAt: -1, _id: -1 }),
      db.collection("catalog_views").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return db;
  })().catch(error => { databasePromise = undefined; throw error; });
  return databasePromise;
}
function collections(db: Db) {
  return { products: db.collection<ProductDoc>("admin_products"), orders: db.collection<OrderDoc>("admin_orders"), coupons: db.collection<CouponDoc>("admin_coupons"), promotions: db.collection<PromotionDoc>("admin_promotions"), movements: db.collection<MovementDoc>("admin_stock_movements") };
}
function clean<T extends object>(document: T) {
  const result = { ...document } as Record<string, unknown>;
  for (const key of ["_id", "skuKeys", "deletedAt", "stockRestored", "manualRefund", "adminId", "coupon"]) delete result[key];
  return result;
}
async function body<T>(request: Request, schema: ZodType<T>): Promise<T> {
  checkOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new AuthError("Send a JSON request body.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("A request body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 262144) { await reader.cancel(); throw new AuthError("Request body is too large.", 413); }
    chunks.push(chunk.value);
  }
  let input: unknown;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AuthError("Invalid JSON request body.", 400); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message, 400);
  // Zod defaults inside optional fields must not reset fields omitted in a PATCH.
  if (request.method === "PATCH" && input && typeof input === "object" && !Array.isArray(input)) {
    const parsedObject = parsed.data as Record<string, unknown>;
    return Object.fromEntries(Object.keys(input).map(key => [key, parsedObject[key]])) as T;
  }
  return parsed.data;
}
export async function adminRoute(request: Request, action: (db: Db, adminId: string) => Promise<unknown>, status = 200) {
  return apiRoute(async () => {
    const account = await getCurrentAccount("admin");
    if (!account) throw new AuthError("Admin login is required.", 401);
    if (!["GET", "HEAD"].includes(request.method)) checkOrigin(request);
    return json(await action(await database(), account.id), status);
  });
}
async function apiRoute(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof AuthError) return json({ message: error.message }, error.status);
    if (error instanceof MongoServerError && error.code === 11000) return json({ message: "That SKU or code is already in use. Choose a unique value.", }, 409);
    if (error instanceof MongoServerError && error.code === 20) return json({ message: "Inventory writes require MongoDB Atlas or a replica set. Configure the database and retry." }, 503);
    return json({ message: "Store data is temporarily unavailable. Please try again." }, 503);
  }
}
async function transaction<T>(db: Db, action: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = db.client.startSession();
  try { return await session.withTransaction(() => action(session)); } finally { await session.endSession(); }
}
const now = () => new Date().toISOString();
const round = (value: number) => Math.round(value * 100) / 100;
function mustExist<T>(value: T | null): T { if (!value) throw new AuthError("Record not found.", 404); return value; }
function validateProduct(product: Omit<z.infer<typeof productSchema>, "productType"> & { productType?: string }) {
  if (!subcategoriesFor(product.category).includes(product.subcategory)) throw new AuthError("Select a valid category and subcategory.", 400);
  const types = productTypesFor(product.category, product.subcategory);
  if (types.length ? !types.includes(product.productType ?? "") : Boolean(product.productType)) throw new AuthError("Select a valid product type for this subcategory.", 400);
  if (product.category === "Brands" && !product.brand) throw new AuthError("Enter a brand name for the Brands category.", 400);
  if (!product.images.length) throw new AuthError("Add at least one product image.", 400);
  if (product.salePrice !== null && product.salePrice > product.price) throw new AuthError("Sale price cannot exceed the regular price.", 400);
  const skus = [product.sku, ...product.variants.map(item => item.sku)];
  if (new Set(skus).size !== skus.length) throw new AuthError("Product and variant SKUs must be unique.", 400);
  if (new Set(product.variants.map(item => item.id)).size !== product.variants.length) throw new AuthError("Variant identifiers must be unique.", 400);
  if (product.variants.length) product.stock = product.variants.reduce((total, item) => total + item.stock, 0);
  return skus;
}
async function audit(db: Db, session: ClientSession, product: AdminProduct, variantId: string, before: number, after: number, type: StockMovement["type"], reason: string, adminId: string) {
  if (before === after) return;
  const id = randomUUID();
  const variant = product.variants.find(item => item.id === variantId);
  const sku = variant?.sku ?? (variantId ? "" : product.sku);
  const variantLabel = variant ? [variant.color, variant.size].filter(Boolean).join(" / ") : variantId;
  await collections(db).movements.insertOne({ _id: id, id, productId: product.id, productName: product.name, sku, variantLabel, variantId, type, quantity: after - before, before, after, reason, createdAt: now(), adminId }, { session });
}
async function auditProductEdit(db: Db, session: ClientSession, before: AdminProduct | null, after: AdminProduct, adminId: string) {
  const previous = new Map(before?.variants.map(item => [item.id, item.stock]) ?? []);
  const next = new Map(after.variants.map(item => [item.id, item.stock]));
  if (!before?.variants.length && !after.variants.length) await audit(db, session, after, "", before?.stock ?? 0, after.stock, before ? "adjustment" : "added", before ? "Product stock edited" : "Opening stock", adminId);
  else {
    if (before && !before.variants.length && before.stock) await audit(db, session, after, "", before.stock, 0, "adjustment", "Stock moved to variants", adminId);
    for (const id of new Set([...previous.keys(), ...next.keys()])) await audit(db, session, next.has(id) ? after : { ...after, variants: before?.variants ?? [] }, id, previous.get(id) ?? 0, next.get(id) ?? 0, before ? "adjustment" : "added", before ? "Variant stock edited" : "Opening variant stock", adminId);
    if (!after.variants.length && after.stock) await audit(db, session, after, "", 0, after.stock, "adjustment", "Stock moved from variants", adminId);
  }
}
export function productList(request: Request) { return adminRoute(request, async db => ({ products: (await collections(db).products.find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray()).map(clean) })); }
export function productCreate(request: Request) { return adminRoute(request, async (db, adminId) => {
  const upload = await readProductBody(request, db, productSchema, body);
  try {
    const input = upload.input;
    const skuKeys = validateProduct(input), id = randomUUID(), timestamp = now();
    const product: ProductDoc = { ...input, _id: id, id, skuKeys, views: 0, createdAt: timestamp, updatedAt: timestamp };
    await transaction(db, async session => { await collections(db).products.insertOne(product, { session }); await auditProductEdit(db, session, null, product, adminId); });
    return { product: clean(product) };
  } catch (error) { await upload.cleanup(); throw error; }
}, 201); }
export function productUpdate(request: Request, id: string) { return adminRoute(request, async (db, adminId) => {
  const upload = await readProductBody(request, db, productSchema.partial(), body);
  try {
    const input = upload.input;
    const product = await transaction(db, async session => {
      const current = mustExist(await collections(db).products.findOne({ _id: id, deletedAt: { $exists: false } }, { session }));
      const updated = { ...current, ...input, updatedAt: now() };
      updated.skuKeys = validateProduct(updated);
      if (!current.variants.length && updated.variants.length && await collections(db).orders.findOne({ "items.productId": id, stockRestored: false }, { session })) throw new AuthError("This product has orders using its base SKU. Create a separate product for variants so returns can still restore the original stock.", 409);
      const removedVariantIds = current.variants.filter(item => !updated.variants.some(next => next.id === item.id)).map(item => item.id);
      if (removedVariantIds.length && await collections(db).orders.findOne({ "items.productId": id, "items.variantId": { $in: removedVariantIds }, stockRestored: false }, { session })) throw new AuthError("A variant used by an order cannot be removed; set its stock to zero instead.", 409);
      await collections(db).products.replaceOne({ _id: id }, updated, { session });
      await auditProductEdit(db, session, current, updated, adminId);
      return updated;
    });
    return { product: clean(product) };
  } catch (error) { await upload.cleanup(); throw error; }
}); }
export function productDelete(request: Request, id: string) { return adminRoute(request, async db => {
  const result = await collections(db).products.updateOne({ _id: id, deletedAt: { $exists: false } }, { $set: { deletedAt: now(), status: "inactive", updatedAt: now() } });
  if (!result.matchedCount) throw new AuthError("Product not found.", 404);
  return { success: true };
}); }
export function productDuplicate(request: Request, id: string) { return adminRoute(request, async db => {
  const original = mustExist(await collections(db).products.findOne({ _id: id, deletedAt: { $exists: false } }));
  const newId = randomUUID(), suffix = newId.slice(0, 8).toUpperCase(), timestamp = now();
  const product: ProductDoc = { ...original, _id: newId, id: newId, name: `${original.name.slice(0, 140)} (copy)`, sku: `${original.sku.slice(0, 85)}-${suffix}`, status: "inactive", stock: 0, views: 0, variants: original.variants.map(item => ({ ...item, id: randomUUID(), sku: `${item.sku.slice(0, 85)}-${suffix}`, stock: 0 })), createdAt: timestamp, updatedAt: timestamp };
  product.skuKeys = validateProduct(product);
  await collections(db).products.insertOne(product);
  return { product: clean(product) };
}, 201); }
export function inventoryList(request: Request) { return adminRoute(request, async db => {
  const c = collections(db);
  const includeHistory = new URL(request.url).searchParams.get("includeHistory") ?? "true";
  if (!["true", "false"].includes(includeHistory)) throw new AuthError("includeHistory must be true or false.", 400);
  const products = await c.products.find({ deletedAt: { $exists: false } }).sort({ name: 1, _id: 1 }).toArray();
  // Preserve the existing API response for callers; the UI uses paginated history.
  const movements = includeHistory === "true" ? (await c.movements.find().sort({ createdAt: -1, _id: -1 }).toArray()).map(clean) : undefined;
  return { products: products.map(clean), summary: summarizeInventory(products), ...(movements ? { movements } : {}) };
}); }
export function inventoryHistory(request: Request) { return adminRoute(request, db => readInventoryHistory(db, request)); }
async function changeStock(db: Db, session: ClientSession, input: z.infer<typeof inventorySchema>, adminId: string, allowDeleted = false) {
  const products = collections(db).products;
  const product = mustExist(await products.findOne({ _id: input.productId, ...(allowDeleted ? {} : { deletedAt: { $exists: false } }) }, { session }));
  const selected = input.variantId ? product.variants.find(item => item.id === input.variantId) : undefined;
  if (product.variants.length && !selected || input.variantId && !selected) throw new AuthError("Select an existing product variant.", 400);
  const before = selected ? selected.stock : product.stock, after = before + input.quantity;
  if (input.expectedStock !== undefined && input.expectedStock !== before) throw new AuthError("Stock changed since you loaded this product. Review the refreshed quantity and try again.", 409);
  if (after < 0) throw new AuthError(`Insufficient stock for ${product.name}${selected ? ` (${selected.color} ${selected.size})` : ""}.`, 409);
  if (after > 1_000_000) throw new AuthError("Stock exceeds the allowed quantity.", 400);
  if (selected) selected.stock = after;
  product.stock = product.variants.length ? product.variants.reduce((total, item) => total + item.stock, 0) : after;
  product.updatedAt = now();
  await products.replaceOne({ _id: product.id }, product, { session });
  await audit(db, session, product, input.variantId ?? "", before, after, input.type, input.reason, adminId);
  return product;
}
export function inventoryAdjust(request: Request) { return adminRoute(request, async (db, adminId) => {
  const input = await body(request, inventorySchema);
  if (input.type === "sold" && input.quantity > 0 || ["added", "returned"].includes(input.type) && input.quantity < 0) throw new AuthError("Sold stock must be negative; added and returned stock must be positive.", 400);
  const product = await transaction(db, session => changeStock(db, session, input, adminId));
  return { product: clean(product) };
}); }
export function orderList(request: Request) { return adminRoute(request, async db => ({ orders: (await collections(db).orders.find().sort({ createdAt: -1 }).toArray()).map(clean) })); }
async function activePromotions(db: Db, session?: ClientSession) {
  const instant = now();
  return collections(db).promotions.find({ active: true, startsAt: { $lte: instant }, endsAt: { $gt: instant } }, { session }).toArray();
}
function effectivePrice(product: AdminProduct, promotions: PromotionDoc[]) {
  const discount = Math.max(0, ...promotions.filter(promotion => promotion.productIds.includes(product.id)).map(promotion => promotion.discountPercent));
  return Math.min(product.salePrice ?? product.price, round(product.price * (1 - discount / 100)));
}
export function orderCreate(request: Request) { return adminRoute(request, async (db, adminId) => {
  const input = await body(request, orderCreateSchema);
  const order = await transaction(db, async session => {
    const c = collections(db), id = randomUUID(), timestamp = now();
    // Serialize orders for each email so concurrent first-order coupons cannot both qualify.
    await db.collection<{ _id: string; orders: number }>("admin_order_customers").updateOne({ _id: input.email }, { $inc: { orders: 1 } }, { session, upsert: true });
    const promotions = await activePromotions(db, session);
    const items: AdminOrder["items"] = [];
    const categories = new Map<string, string>();
    const number = `UF-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 6).toUpperCase()}`;
    for (const item of input.items) {
      const product = mustExist(await c.products.findOne({ _id: item.productId, status: "active", deletedAt: { $exists: false } }, { session }));
      const variant = product.variants.find(variant => variant.id === item.variantId);
      categories.set(product.id, product.category);
      await changeStock(db, session, { ...item, quantity: -item.quantity, type: "sold", reason: `Order ${number}` }, adminId);
      items.push({ productId: product.id, ...(item.variantId ? { variantId: item.variantId } : {}), name: product.name, sku: variant?.sku ?? product.sku, quantity: item.quantity, price: effectivePrice(product, promotions), image: product.images[0] ?? "" });
    }
    const subtotal = round(items.reduce((total, item) => total + item.quantity * item.price, 0));
    if (subtotal > 1_000_000_000) throw new AuthError("Order subtotal exceeds the maximum supported amount.", 400);
    if (input.discount > subtotal) throw new AuthError("Discount cannot exceed the product subtotal.", 400);
    const { couponCode, ...orderInput } = input;
    const coupon = couponCode ? await redeemCoupon(db, session, couponCode, input, items, categories, subtotal) : undefined;
    const discount = coupon?.discount ?? input.discount;
    const total = round(subtotal + input.shipping - discount);
    if (total > 1_000_000_000) throw new AuthError("Order total exceeds the maximum supported amount.", 400);
    const created: OrderDoc = { ...orderInput, discount, ...(coupon ? { coupon } : {}), items, _id: id, id, number, subtotal, total, status: "new", returnStatus: "none", courier: "", trackingNumber: "", stockRestored: false, createdAt: timestamp, updatedAt: timestamp };
    await c.orders.insertOne(created, { session });
    return created;
  });
  return { order: clean(order) };
}, 201); }
async function redeemCoupon(db: Db, session: ClientSession, code: string, input: z.infer<typeof orderCreateSchema>, items: AdminOrder["items"], categories: Map<string, string>, subtotal: number) {
  if (input.discount > 0) throw new AuthError("Use either a coupon or a manual discount on an order.", 400);
  const c = collections(db), coupon = await c.coupons.findOne({ code, active: true }, { session });
  const instant = now();
  if (!coupon || coupon.startsAt && coupon.startsAt > instant || coupon.endsAt && coupon.endsAt <= instant) throw new AuthError("This coupon is inactive, expired, or has not started.", 400);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AuthError("This coupon has reached its usage limit.", 409);
  if (subtotal < coupon.minimumPurchase) throw new AuthError(`This coupon requires a minimum purchase of Rs. ${coupon.minimumPurchase}.`, 400);
  if (coupon.customerEmails.length && !coupon.customerEmails.includes(input.email)) throw new AuthError("This coupon is not available to this customer.", 400);
  if (coupon.firstOrderOnly && await c.orders.findOne({ email: input.email, status: { $ne: "cancelled" } }, { session })) throw new AuthError("This coupon is only available for a customer's first order.", 400);
  const eligibleSubtotal = round(items.filter(item => !coupon.productIds.length && !coupon.categories.length || coupon.productIds.includes(item.productId) || coupon.categories.some(category => category.toLowerCase() === categories.get(item.productId)?.toLowerCase())).reduce((total, item) => total + item.price * item.quantity, 0));
  if (eligibleSubtotal <= 0) throw new AuthError("No products in this order qualify for the coupon.", 400);
  let discount = coupon.type === "free_shipping" ? input.shipping : coupon.type === "percentage" ? round(eligibleSubtotal * coupon.value / 100) : Math.min(coupon.value, eligibleSubtotal);
  if (coupon.maximumDiscount !== null) discount = Math.min(discount, coupon.maximumDiscount);
  if (discount <= 0) throw new AuthError("This coupon does not provide a discount for this order.", 400);
  await c.coupons.updateOne({ _id: coupon.id }, { $inc: { usedCount: 1 } }, { session });
  return { id: coupon.id, code: coupon.code, discount: round(discount) };
}
const transitions: Record<AdminOrder["status"], AdminOrder["status"][]> = {
  new: ["processing", "confirmed", "cancelled"], processing: ["confirmed", "packed", "cancelled"],
  confirmed: ["processing", "packed", "shipped", "cancelled"], packed: ["shipped", "cancelled"],
  shipped: ["delivered"], delivered: ["returned", "refunded"], cancelled: ["refunded"], returned: ["refunded"], refunded: [],
};
export function orderUpdate(request: Request, id: string) { return adminRoute(request, async (db, adminId) => {
  const input = await body(request, orderPatchSchema);
  const order = await transaction(db, async session => {
    const c = collections(db), current = mustExist(await c.orders.findOne({ _id: id }, { session }));
    const updated = { ...current, ...input, updatedAt: now() };
    if (updated.status !== current.status && !transitions[current.status].includes(updated.status)) throw new AuthError(`Cannot move an order from ${current.status} to ${updated.status}.`, 409);
    if (input.returnStatus && input.returnStatus !== current.returnStatus) {
      if (current.status !== "delivered") throw new AuthError("Returns can only be reviewed for delivered orders.", 409);
      if (input.returnStatus === "none") throw new AuthError("A return decision cannot be cleared.", 409);
      if (["approved", "rejected"].includes(current.returnStatus)) throw new AuthError("This return has already been reviewed.", 409);
    }
    if (updated.status === "returned" && updated.returnStatus !== "approved") throw new AuthError("Approve the return before recording returned stock.", 400);
    const refund = updated.status === "refunded" || updated.paymentStatus === "refunded";
    if (refund && current.status !== "refunded") {
      if (current.paymentStatus !== "paid") throw new AuthError("Only a paid order can be recorded as refunded.", 409);
      if (!["delivered", "returned", "cancelled"].includes(current.status)) throw new AuthError("Deliver, return, or cancel the order before recording a refund.", 409);
      if (!input.notes?.trim()) throw new AuthError("Describe the completed manual refund in order notes. This action does not transfer money.", 400);
      updated.status = "refunded"; updated.paymentStatus = "refunded";
      updated.manualRefund = { amount: current.total, note: input.notes, adminId, recordedAt: now() };
    }
    if (current.paymentStatus === "refunded" && updated.paymentStatus !== "refunded") throw new AuthError("A refunded payment cannot be changed.", 409);
    if (current.paymentStatus === "paid" && updated.paymentStatus === "pending") throw new AuthError("A paid order cannot be marked unpaid.", 409);
    // Refund-only orders retain delivered inventory; returned goods and cancellations restore it once.
    const shouldRestore = updated.status === "cancelled" || updated.status === "returned";
    if (shouldRestore && !current.stockRestored) {
      for (const item of current.items) await changeStock(db, session, { productId: item.productId, variantId: item.variantId, quantity: item.quantity, type: "returned", reason: `${updated.status === "cancelled" ? "Cancelled" : "Returned"} order ${current.number}` }, adminId, true);
      updated.stockRestored = true;
    }
    await c.orders.replaceOne({ _id: id }, updated, { session });
    return updated;
  });
  return { order: clean(order) };
}); }
async function customers(db: Db): Promise<AdminCustomer[]> {
  const [accounts, orders] = await Promise.all([
    db.collection("users").find({}, { projection: { _id: 1, name: 1, email: 1, createdAt: 1 } }).toArray(),
    collections(db).orders.find().toArray(),
  ]);
  const result = new Map<string, AdminCustomer>();
  for (const account of accounts) result.set(account.email, { id: String(account._id), name: account.name, email: account.email, createdAt: new Date(account.createdAt).toISOString(), orders: 0, spent: 0 });
  for (const order of orders) {
    let customer = result.get(order.email);
    if (!customer) { customer = { id: `order-${order.id}`, name: order.customerName, email: order.email, createdAt: order.createdAt, orders: 0, spent: 0 }; result.set(order.email, customer); }
    if (order.createdAt < customer.createdAt) customer.createdAt = order.createdAt;
    customer.orders += 1;
    if (order.paymentStatus === "paid" && !["cancelled", "returned", "refunded"].includes(order.status)) customer.spent = round(customer.spent + order.total);
  }
  return [...result.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function customerList(request: Request) { return adminRoute(request, async db => ({ customers: await customers(db) })); }
export function dashboard(request: Request) { return adminRoute(request, async db => {
  const c = collections(db);
  const [products, orders, customerRecords] = await Promise.all([c.products.find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray(), c.orders.find().sort({ createdAt: -1 }).toArray(), customers(db)]);
  return { products: products.map(clean), orders: orders.map(clean), customers: customerRecords };
}); }
function dateRange<T extends { startsAt: string; endsAt: string }>(input: T) {
  if (input.startsAt) input.startsAt = new Date(input.startsAt).toISOString();
  if (input.endsAt) input.endsAt = new Date(input.endsAt).toISOString();
  if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) throw new AuthError("End date must be after the start date.", 400);
}
function validateCoupon(input: z.infer<typeof couponSchema>) {
  dateRange(input);
  if (input.type === "percentage" && input.value > 100) throw new AuthError("Percentage discounts cannot exceed 100%.", 400);
  if (input.type === "free_shipping") input.value = 0;
}
function promotionState(promotion: PromotionDoc): AdminPromotion["state"] {
  if (!promotion.active) return "inactive";
  if (promotion.startsAt > now()) return "scheduled";
  return promotion.endsAt <= now() ? "ended" : "active";
}
function publicPromotion(promotion: PromotionDoc) { return { ...clean(promotion), state: promotionState(promotion) }; }
async function validateProductIds(db: Db, ids: string[]) {
  if (ids.length && await collections(db).products.countDocuments({ _id: { $in: [...new Set(ids)] }, deletedAt: { $exists: false } }) !== new Set(ids).size) throw new AuthError("One or more selected products no longer exist.", 400);
}
export function couponList(request: Request) { return adminRoute(request, async db => ({ coupons: (await collections(db).coupons.find().sort({ createdAt: -1 }).toArray()).map(clean) })); }
export function couponCreate(request: Request) { return adminRoute(request, async db => {
  const input = await body(request, couponSchema); validateCoupon(input); await validateProductIds(db, input.productIds);
  const id = randomUUID(), coupon: CouponDoc = { ...input, _id: id, id, usedCount: 0, createdAt: now() };
  await collections(db).coupons.insertOne(coupon); return { coupon: clean(coupon) };
}, 201); }
export function couponUpdate(request: Request, id: string) { return adminRoute(request, async db => {
  const input = await body(request, couponSchema.partial());
  const coupon = await transaction(db, async session => {
    const c = collections(db).coupons, current = mustExist(await c.findOne({ _id: id }, { session }));
    const updated = { ...current, ...input }; validateCoupon(updated); await validateProductIds(db, updated.productIds);
    if (updated.usageLimit && updated.usageLimit < current.usedCount) throw new AuthError("Usage limit cannot be below the number already redeemed.", 400);
    await c.replaceOne({ _id: id }, updated, { session }); return updated;
  });
  return { coupon: clean(coupon) };
}); }
export function couponDelete(request: Request, id: string) { return adminRoute(request, async db => {
  const result = await collections(db).coupons.deleteOne({ _id: id });
  if (!result.deletedCount) throw new AuthError("Coupon not found.", 404);
  return { success: true };
}); }
export function promotionList(request: Request) { return adminRoute(request, async db => ({ promotions: (await collections(db).promotions.find().sort({ createdAt: -1 }).toArray()).map(publicPromotion) })); }
export function promotionCreate(request: Request) { return adminRoute(request, async db => {
  const input = await body(request, promotionSchema); dateRange(input); await validateProductIds(db, input.productIds);
  const id = randomUUID(), promotion: PromotionDoc = { ...input, _id: id, id, createdAt: now() };
  await collections(db).promotions.insertOne(promotion); return { promotion: publicPromotion(promotion) };
}, 201); }
export function promotionUpdate(request: Request, id: string) { return adminRoute(request, async db => {
  const input = await body(request, promotionSchema.partial());
  const promotion = await transaction(db, async session => {
    const c = collections(db).promotions, current = mustExist(await c.findOne({ _id: id }, { session }));
    const updated = { ...current, ...input }; dateRange(updated); await validateProductIds(db, updated.productIds);
    await c.replaceOne({ _id: id }, updated, { session }); return updated;
  });
  return { promotion: publicPromotion(promotion) };
}); }
export function promotionDelete(request: Request, id: string) { return adminRoute(request, async db => {
  const result = await collections(db).promotions.deleteOne({ _id: id });
  if (!result.deletedCount) throw new AuthError("Promotion not found.", 404);
  return { success: true };
}); }
export function catalog() { return apiRoute(async () => {
  const db = await database(), c = collections(db);
  const [products, promotions, count] = await Promise.all([c.products.find({ status: "active", deletedAt: { $exists: false } }).sort({ createdAt: -1 }).toArray(), activePromotions(db), c.products.countDocuments({})]);
  return json({ managed: count > 0, products: products.map(product => { const price = effectivePrice(product, promotions); return { ...clean(product), salePrice: price < product.price ? price : product.salePrice }; }), promotions: promotions.map(publicPromotion) });
}); }
export function catalogProduct(id: string) { return apiRoute(async () => {
  if (!identifier.safeParse(id).success) throw new AuthError("Product not found.", 404);
  const db = await database(), c = collections(db);
  const product = await c.products.findOne({ _id: id, status: "active", deletedAt: { $exists: false } });
  if (!product) throw new AuthError("Product not found.", 404);
  const [related, promotions] = await Promise.all([
    c.products.find({ _id: { $ne: id }, category: product.category, status: "active", deletedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(6).toArray(),
    activePromotions(db),
  ]);
  const present = (item: ProductDoc) => { const price = effectivePrice(item, promotions); return { ...clean(item), salePrice: price < item.price ? price : item.salePrice }; };
  return json({ product: present(product), related: related.map(present) });
}); }
export function recordView(request: Request, id: string) { return apiRoute(async () => {
  checkOrigin(request);
  const input = await body(request, z.object({ visitorId: z.string().uuid() }).strict());
  const db = await database(), c = collections(db), product = await c.products.findOne({ _id: id, status: "active", deletedAt: { $exists: false } });
  if (!product) throw new AuthError("Product not found.", 404);
  const window = Math.floor(Date.now() / 86_400_000), key = hashToken(`${id}:${input.visitorId}:${window}`);
  const views = db.collection<{ _id: string; expiresAt: Date }>("catalog_views");
  const result = await views.updateOne({ _id: key }, { $setOnInsert: { expiresAt: new Date((window + 1) * 86_400_000) } }, { upsert: true });
  if (result.upsertedCount) await c.products.updateOne({ _id: id }, { $inc: { views: 1 } });
  return json({ recorded: Boolean(result.upsertedCount) });
}); }

// Wishlist entries use the same visibility and promotion pricing as the catalog.
export async function catalogProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = await database();
  const [products, promotions] = await Promise.all([
    collections(db).products.find({ _id: { $in: ids }, status: "active", deletedAt: { $exists: false } }).toArray(),
    activePromotions(db),
  ]);
  return products.map(product => {
    const price = effectivePrice(product, promotions);
    return { ...clean(product), salePrice: price < product.price ? price : product.salePrice } as AdminProduct;
  });
}
