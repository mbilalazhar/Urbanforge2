import type { AdminOrder, OrderStatus } from "./types";

// Admins can record the actual fulfilment stage without saving each intermediate
// step. Terminal states retain their inventory and refund protections.
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["processing", "confirmed", "packed", "shipped", "delivered", "cancelled"],
  processing: ["confirmed", "packed", "shipped", "delivered", "cancelled"],
  confirmed: ["processing", "packed", "shipped", "delivered", "cancelled"],
  packed: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned", "refunded"],
  cancelled: ["refunded"],
  returned: ["refunded"],
  refunded: [],
};

export function editableOrderStatuses(order: Pick<AdminOrder, "status" | "returnStatus">) {
  return [order.status, ...orderTransitions[order.status].filter(status =>
    status !== "refunded" && (status !== "returned" || order.returnStatus === "approved"),
  )];
}

export function canRecordRefund(order: Pick<AdminOrder, "status" | "paymentStatus">) {
  return order.paymentStatus === "paid" && orderTransitions[order.status].includes("refunded");
}
