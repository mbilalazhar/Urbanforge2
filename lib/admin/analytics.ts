import type { AdminDashboard, AdminOrder } from "./types";

export function storeDate(value: string | number | Date) {
  return new Date(new Date(value).getTime() + 5 * 60 * 60 * 1000);
}
export function countsAsRevenue(order: AdminOrder) {
  return order.paymentStatus === "paid" && !["cancelled", "returned", "refunded"].includes(order.status);
}
export function dashboardMetrics(data: AdminDashboard, now = new Date()) {
  const today = storeDate(now);
  const todayKey = today.toISOString().slice(0, 10);
  const monthKey = today.toISOString().slice(0, 7);
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const weekKey = monday.toISOString().slice(0, 10);
  const paid = data.orders.filter(countsAsRevenue);
  const amount = (orders: AdminOrder[]) => orders.reduce((sum, order) => sum + order.total, 0);
  const dateKey = (createdAt: string) => storeDate(createdAt).toISOString().slice(0, 10);
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11 + index, 1));
    const key = date.toISOString().slice(0, 7);
    const orders = data.orders.filter(order => dateKey(order.createdAt).startsWith(key));
    const revenueOrders = orders.filter(countsAsRevenue);
    return { key, label: date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }), revenue: amount(revenueOrders), orders: orders.length, sales: revenueOrders.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0), customers: data.customers.filter(customer => dateKey(customer.createdAt).startsWith(key)).length };
  });
  const sold = new Map<string, { units: number; revenue: number; name: string; image: string }>();
  for (const order of paid) for (const item of order.items) {
    const existing = sold.get(item.productId) ?? { units: 0, revenue: 0, name: item.name, image: item.image };
    sold.set(item.productId, { ...existing, units: existing.units + item.quantity, revenue: existing.revenue + item.quantity * item.price });
  }
  const bestsellers = [...sold].map(([id, value]) => ({ id, ...value, category: data.products.find(product => product.id === id)?.category ?? "Archived product" })).sort((a, b) => b.units - a.units);
  const categories = new Map<string, number>();
  for (const product of bestsellers) categories.set(product.category, (categories.get(product.category) ?? 0) + product.units);
  const currentRevenue = months.at(-1)!.revenue;
  const previousRevenue = months.at(-2)!.revenue;
  return {
    revenue: amount(paid), today: amount(paid.filter(order => dateKey(order.createdAt) === todayKey)),
    week: amount(paid.filter(order => dateKey(order.createdAt) >= weekKey && dateKey(order.createdAt) <= todayKey)),
    month: currentRevenue, growth: previousRevenue ? (currentRevenue - previousRevenue) / previousRevenue * 100 : null,
    average: paid.length ? amount(paid) / paid.length : 0,
    pending: data.orders.filter(order => ["new", "processing", "confirmed", "packed", "shipped"].includes(order.status)).length,
    completed: data.orders.filter(order => order.status === "delivered").length,
    cancelled: data.orders.filter(order => order.status === "cancelled").length,
    returned: data.orders.filter(order => ["returned", "refunded"].includes(order.status)).length,
    low: data.products.filter(product => product.stock > 0 && product.stock <= 5).length,
    out: data.products.filter(product => product.stock === 0).length,
    inStock: data.products.filter(product => product.stock > 5).length,
    newCustomers: data.customers.filter(customer => dateKey(customer.createdAt).startsWith(monthKey)).length,
    months, bestsellers, categories: [...categories].sort((a, b) => b[1] - a[1]),
  };
}
