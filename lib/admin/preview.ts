import type { AdminProduct, AdminOrder, AdminCustomer, AdminCoupon, AdminPromotion, ProductVariant, StockMovement } from "./types";

// Deliberately local sample data. Admin authentication is real; portal edits never call management APIs.
type PreviewStore = { products: AdminProduct[]; orders: AdminOrder[]; customers: AdminCustomer[]; coupons: AdminCoupon[]; promotions: AdminPromotion[]; movements: StockMovement[]; restoredOrders: string[] };
const stamp = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const round = (value: number) => Math.round(value * 100) / 100;

function seed(): PreviewStore {
  const now = new Date();
  const date = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString();
  const catalog: [string, string, number, number, string][] = [
    ["Urban Windbreaker Jacket", "Outerwear", 8490, 42, "/jacket.png"],
    ["Oversized Crop Hoodie", "Hoodies", 5490, 28, "/hoodie.png"],
    ["Shadow Graphic Tee", "T-Shirts", 2490, 84, "/tee.png"],
    ["Tactical Cargo Pants", "Bottoms", 6490, 4, "/bottoms.png"],
    ["Urban High-Top Sneakers", "Shoes", 8990, 32, "/shoes.png"],
    ["Everyday Crossbody Bag", "Accessories", 3990, 19, "/accessories.png"],
    ["Utility Chronograph Watch", "Watches", 12490, 0, "/watch.png"],
    ["Essential Black Hoodie", "Hoodies", 4990, 3, "/hoodie.png"],
    ["Relaxed Fit Cargo", "Bottoms", 5990, 0, "/bottoms.png"],
    ["Classic Street Tee", "T-Shirts", 2290, 56, "/tee.png"],
    ["Midnight Shell Jacket", "Outerwear", 9990, 5, "/jacket.png"],
    ["Everyday Low-Top Sneakers", "Shoes", 7490, 16, "/shoes.png"],
  ];
  const products = catalog.map(([name, category, price, stock, image], index): AdminProduct => {
    const id = `sample-product-${index + 1}`, sku = `UF-${String(index + 1).padStart(4, "0")}`;
    const wearable = !["Accessories", "Watches"].includes(category);
    const sizes = category === "Shoes" ? ["40", "41", "42"] : wearable ? ["S", "M", "L"] : ["One size"];
    const variants: ProductVariant[] = wearable ? sizes.map((size, variantIndex) => ({ id: `${id}-${size}`, sku: `${sku}-BK-${size}`, color: "Black", size, stock: Math.floor(stock / sizes.length) + (variantIndex === 0 ? stock % sizes.length : 0) })) : [];
    return { id, name, category, price, stock, sku, variants, images: [image], videos: [], colors: ["Black"], sizes,
      description: "Designed for the everyday explorer. A considered silhouette with durable materials and a relaxed streetwear feel.", shortDescription: "Everyday comfort. Signature UrbanForge style.", subcategory: category === "Shoes" ? "Sneakers" : "Essentials", brand: index % 3 === 0 ? "Forge Essentials" : "UrbanForge", gender: index % 4 === 1 ? "women" : "unisex", material: category === "Shoes" ? "Canvas and rubber" : "Premium cotton blend", tags: ["streetwear", "essential"],
      salePrice: index === 1 ? 4490 : null, status: index === 8 ? "inactive" : "active", featured: index < 5, newArrival: index === 0 || index === 10, bestseller: index === 2 || index === 4,
      seoTitle: `${name} | UrbanForge`, seoDescription: `Shop ${name} from UrbanForge.`, views: [1842, 1530, 1260, 940, 2160, 810, 690, 570, 340, 1050, 420, 980][index], createdAt: date(-160 + index * 10), updatedAt: date(-index),
    };
  });
  const names = ["Ali Khan", "Sara Ahmed", "Hamza Rafiq", "Ayesha Malik", "Bilal Shah", "Zain Ali", "Hira Khan", "Usman Tariq", "Maha Noor", "Daniyal Hassan"];
  const customers: AdminCustomer[] = names.map((name, index) => ({ id: `sample-customer-${index}`, name, email: `${name.toLowerCase().replace(/ /g, ".")}@urbanforge.example`, createdAt: date(-270 + index * 29), orders: 0, spent: 0, registered: true, contact: "", address: "", lastOrderAt: null }));
  const orders: AdminOrder[] = [];
  for (let month = 0; month < 12; month++) {
    const count = month < 6 ? 3 : 5;
    for (let row = 0; row < count; row++) {
      const index = orders.length, customer = customers[index % customers.length], product = products[(index * 3 + row) % products.length];
      const quantity = 1 + (index % 4), price = product.salePrice ?? product.price, subtotal = price * quantity;
      const createdAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + month, Math.min(now.getUTCDate(), 3 + row * 5), 9)).toISOString();
      orders.push({ id: `sample-order-${index}`, number: `#UF${1000 + index}`, customerName: customer.name, email: customer.email, phone: "", address: "Sample delivery address, Lahore, Pakistan", items: [{ productId: product.id, variantId: product.variants[0]?.id, name: product.name, sku: product.variants[0]?.sku ?? product.sku, quantity, price, image: product.images[0] }], subtotal, shipping: index % 3 ? 250 : 0, discount: 0, total: subtotal + (index % 3 ? 250 : 0), status: "delivered", paymentStatus: "paid", courier: "TCS", trackingNumber: `SAMPLE-${10000 + index}`, notes: "Sample order for the admin portal preview.", returnStatus: "none", createdAt, updatedAt: createdAt });
    }
  }
  const latest: AdminOrder["status"][] = ["processing", "shipped", "delivered", "cancelled", "new", "packed", "returned", "refunded"];
  latest.forEach((status, index) => {
    const order = orders[orders.length - 1 - index];
    order.status = status; order.createdAt = date(-index * .45); order.updatedAt = order.createdAt;
    order.paymentStatus = status === "refunded" ? "refunded" : ["new", "cancelled", "processing"].includes(status) ? "pending" : "paid";
    order.returnStatus = status === "returned" ? "approved" : "none";
  });
  const coupons: AdminCoupon[] = [
    { kind: "coupon", id: "sample-coupon-1", code: "SUMMER25", type: "percentage", value: 25, minimumPurchase: 5000, maximumDiscount: 2000, startsAt: date(-20), endsAt: date(25), usageLimit: 500, usedCount: 128, productIds: [], categories: [], customerEmails: [], firstOrderOnly: false, active: true, createdAt: date(-20) },
    { kind: "coupon", id: "sample-coupon-2", code: "WELCOME500", type: "fixed", value: 500, minimumPurchase: 3000, maximumDiscount: null, startsAt: date(-10), endsAt: date(45), usageLimit: 200, usedCount: 42, productIds: [], categories: [], customerEmails: [], firstOrderOnly: true, active: true, createdAt: date(-10) },
    { kind: "coupon", id: "sample-coupon-3", code: "FREESHIP", type: "free_shipping", value: 0, minimumPurchase: 7500, maximumDiscount: null, startsAt: date(5), endsAt: date(30), usageLimit: 100, usedCount: 0, productIds: [], categories: [], customerEmails: [], firstOrderOnly: false, active: true, createdAt: date(-2) },
  ];
  const promotions: AdminPromotion[] = [
    { id: "sample-promo-1", name: "The New Season Edit", banner: "/hero-bg.png", startsAt: date(-5), endsAt: date(20), productIds: [], categories: ["Men"], discountPercent: 20, active: true, state: "active", createdAt: date(-7) },
    { id: "sample-promo-2", name: "Weekend Essentials", banner: "/sales.png", startsAt: date(7), endsAt: date(10), productIds: [], categories: ["Women", "Accessories"], discountPercent: 30, active: true, state: "scheduled", createdAt: date(-2) },
    { id: "sample-promo-3", name: "Summer Clearance", banner: "/home-models.png", startsAt: date(-45), endsAt: date(-10), productIds: [], categories: [], discountPercent: 40, active: true, state: "ended", createdAt: date(-50) },
  ];
  const movements: StockMovement[] = products.slice(0, 8).map((product, index) => ({ id: `sample-movement-${index}`, productId: product.id, productName: product.name, variantId: product.variants[0]?.id ?? "", type: index % 2 ? "sold" : "added", quantity: index % 2 ? -2 : 10, before: (product.variants[0]?.stock ?? product.stock) + (index % 2 ? 2 : -10), after: product.variants[0]?.stock ?? product.stock, reason: index % 2 ? "Sample order fulfilled" : "Sample stock delivery", createdAt: date(-index * .5) }));
  // Keep illustrative opening balances nonnegative for low-stock products.
  movements.forEach(movement => { if (movement.before < 0) { movement.before = 0; movement.quantity = movement.after; } });
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { products, orders, customers, coupons, promotions, movements, restoredOrders: orders.filter(order => ["cancelled", "returned"].includes(order.status)).map(order => order.id) };
}

let store: PreviewStore | undefined;
export function resetPreview() { store = undefined; }
function current() { return store ??= seed(); }
function required<T>(record: T | undefined): T { if (!record) throw new Error("This preview record no longer exists."); return record; }
function customerList(data: PreviewStore) {
  const customers = new Map(data.customers.map(customer => [customer.email, { ...customer, orders: 0, spent: 0 }]));
  for (const order of data.orders) {
    const customer = customers.get(order.email) ?? { id: `customer-${order.id}`, name: order.customerName, email: order.email, createdAt: order.createdAt, orders: 0, spent: 0, registered: true, contact: "", address: "", lastOrderAt: null };
    customer.orders++;
    if (order.paymentStatus === "paid" && !["cancelled", "returned", "refunded"].includes(order.status)) customer.spent += order.total;
    customers.set(order.email, customer);
  }
  return [...customers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function promotions(data: PreviewStore) {
  const now = stamp();
  return data.promotions.map(promotion => ({ ...promotion, state: !promotion.active ? "inactive" : promotion.endsAt <= now ? "ended" : promotion.startsAt > now ? "scheduled" : "active" }));
}
function stockChange(data: PreviewStore, product: AdminProduct, variantId: string | undefined, quantity: number, type: StockMovement["type"], reason: string) {
  const variant = variantId ? required(product.variants.find(item => item.id === variantId)) : undefined;
  if (product.variants.length && !variant) throw new Error("Select a product variant.");
  const before = variant?.stock ?? product.stock;
  if (!Number.isInteger(quantity) || before + quantity < 0) throw new Error("The stock adjustment would leave an invalid stock quantity.");
  if (variant) variant.stock += quantity;
  product.stock = product.variants.length ? product.variants.reduce((sum, item) => sum + item.stock, 0) : before + quantity;
  product.updatedAt = stamp();
  data.movements.unshift({ id: uid(), productId: product.id, productName: product.name, variantId: variantId ?? "", type, quantity, before, after: before + quantity, reason, createdAt: stamp() });
}
function validateProduct(data: PreviewStore, product: AdminProduct) {
  const skus = [product.sku, ...product.variants.map(variant => variant.sku)].map(sku => sku.toUpperCase());
  const existing = data.products.filter(item => item.id !== product.id).flatMap(item => [item.sku, ...item.variants.map(variant => variant.sku)]).map(sku => sku.toUpperCase());
  if (new Set(skus).size !== skus.length || skus.some(sku => existing.includes(sku))) throw new Error("Choose a unique SKU for the product and each variant.");
  if (product.salePrice !== null && product.salePrice > product.price) throw new Error("Sale price cannot exceed the regular price.");
  if (product.variants.length) product.stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export async function previewRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [resource, id, action] = path.replace(/^\/api\/admin\//, "").split("/");
  const method = options.method ?? "GET";
  const data = structuredClone(current());
  let result: unknown;
  if (method === "GET") {
    if (resource === "dashboard") result = { products: data.products, orders: data.orders, customers: customerList(data) };
    else if (resource === "customers") result = { customers: customerList(data) };
    else if (resource === "inventory") result = { products: data.products, movements: data.movements };
    else if (resource === "promotions") result = { promotions: promotions(data) };
    else if (["products", "orders", "coupons"].includes(resource)) result = { [resource]: data[resource as "products" | "orders" | "coupons"] };
    else throw new Error("This preview screen is unavailable.");
    return result as T;
  }
  const input = typeof options.body === "string" ? JSON.parse(options.body) as Record<string, unknown> : {};
  if (resource === "products") {
    if (method === "DELETE") { data.products = data.products.filter(product => product.id !== id); result = { success: true }; }
    else {
      const source = id ? required(data.products.find(product => product.id === id)) : undefined;
      let product: AdminProduct;
      if (action === "duplicate") {
        const original = required(source), newId = uid(), suffix = newId.slice(0, 4).toUpperCase();
        product = { ...original, id: newId, name: `${original.name} (copy)`, sku: `${original.sku}-${suffix}`, stock: 0, status: "inactive", views: 0, variants: original.variants.map(variant => ({ ...variant, id: uid(), sku: `${variant.sku}-${suffix}`, stock: 0 })), createdAt: stamp(), updatedAt: stamp() };
      } else product = { ...source, ...input, id: source?.id ?? uid(), views: source?.views ?? 0, createdAt: source?.createdAt ?? stamp(), updatedAt: stamp() } as AdminProduct;
      validateProduct(data, product);
      if (source && action !== "duplicate") data.products[data.products.findIndex(item => item.id === id)] = product;
      else data.products.unshift(product);
      result = { product };
    }
  } else if (resource === "inventory") {
    const product = required(data.products.find(product => product.id === input.productId));
    stockChange(data, product, String(input.variantId || "") || undefined, Number(input.quantity), input.type as StockMovement["type"], String(input.reason));
    result = { product };
  } else if (resource === "orders") {
    if (method === "POST") {
      const items = (input.items as { productId: string; variantId?: string; quantity: number }[]).map(item => {
        const product = required(data.products.find(product => product.id === item.productId));
        const variant = product.variants.find(variant => variant.id === item.variantId);
        stockChange(data, product, item.variantId, -item.quantity, "sold", "Sample order created");
        return { productId: product.id, variantId: item.variantId, name: product.name, sku: variant?.sku ?? product.sku, quantity: item.quantity, price: product.salePrice ?? product.price, image: product.images[0] ?? "" };
      });
      const subtotal = round(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
      const shipping = Number(input.shipping || 0), discount = Number(input.discount || 0);
      if (discount > subtotal) throw new Error("Discount cannot exceed the product subtotal.");
      const order = { ...input, id: uid(), number: `#UF${1048 + data.orders.length - 48}`, items, subtotal, shipping, discount, total: round(subtotal + shipping - discount), status: "new", paymentStatus: input.paymentStatus || "pending", returnStatus: "none", courier: "", trackingNumber: "", createdAt: stamp(), updatedAt: stamp() } as AdminOrder;
      data.orders.unshift(order); result = { order };
    } else {
      const order = required(data.orders.find(order => order.id === id));
      if ((input.status === "refunded" || input.paymentStatus === "refunded") && order.status !== "refunded") { if (order.paymentStatus !== "paid" || !String(input.notes || "").trim()) throw new Error("Use a paid sample order and enter a refund note."); input.status = "refunded"; input.paymentStatus = "refunded"; }
      Object.assign(order, input, { updatedAt: stamp() });
      if (["cancelled", "returned"].includes(order.status) && !data.restoredOrders.includes(order.id)) {
        for (const item of order.items) { const product = data.products.find(product => product.id === item.productId); if (product) stockChange(data, product, item.variantId, item.quantity, "returned", `Sample ${order.status} order`); }
        data.restoredOrders.push(order.id);
      }
      result = { order };
    }
  } else if (resource === "coupons" || resource === "promotions") {
    const records = data[resource] as (AdminCoupon | AdminPromotion)[];
    if (method === "DELETE") { records.splice(records.findIndex(record => record.id === id), 1); result = { success: true }; }
    else {
      const original = id ? required(records.find(record => record.id === id)) : undefined;
      const record = { ...original, ...input, id: original?.id ?? uid(), createdAt: original?.createdAt ?? stamp(), ...(resource === "coupons" ? { usedCount: (original as AdminCoupon | undefined)?.usedCount ?? 0 } : {}) } as AdminCoupon | AdminPromotion;
      if (record.startsAt && record.endsAt && record.startsAt >= record.endsAt) throw new Error("End date must follow the start date.");
      if (resource === "coupons" && data.coupons.some(coupon => coupon.id !== record.id && coupon.code === (record as AdminCoupon).code)) throw new Error("That coupon code is already in use.");
      if (original) records[records.findIndex(record => record.id === id)] = record; else records.unshift(record);
      result = { [resource === "coupons" ? "coupon" : "promotion"]: record };
    }
  } else throw new Error("This preview action is unavailable.");
  store = data;
  return structuredClone(result) as T;
}
