import { customerOrderCreate, customerOrders } from "@/lib/admin/server";
export const runtime = "nodejs";
export const GET = customerOrders;
export const POST = customerOrderCreate;
