import { z } from "zod";
const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const short = z.string().trim().max(150);
export const checkoutItemSchema = z.object({ productId: identifier, variantId: identifier.optional(), color: short.optional(), size: short.optional(), quantity: z.number().int().min(1).max(99) }).strict();
const selection = { items: z.array(checkoutItemSchema).min(1).max(100), deliveryMethod: z.enum(["standard", "express"]), couponCode: z.string().trim().max(60).toUpperCase().default("") };
export const checkoutQuoteSchema = z.object({ ...selection, email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]).default("") }).strict();
export const checkoutOrderSchema = z.object({ ...selection,
  contact: z.object({ name: short.min(1, "Enter your full name."), email: z.string().trim().toLowerCase().email().max(254), phone: z.string().trim().min(6).max(30).regex(/^[+\d\s().-]+$/, "Enter a valid phone number.") }).strict(),
  address: z.object({ line1: z.string().trim().min(1).max(300), apartment: short.default(""), city: short.min(1), province: short.min(1), postalCode: z.string().trim().max(30).default(""), country: short.min(1), type: z.enum(["home", "work", "other"]).default("home") }).strict(),
  paymentMethod: z.literal("cod"), saveAddress: z.boolean().default(false), requestId: z.string().uuid(), quoteToken: z.string().length(64), accountId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
}).strict();
