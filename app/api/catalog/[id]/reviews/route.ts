import { randomUUID } from "node:crypto";
import { z } from "zod";
import dbConnect from "@/lib/dbconnect";
import { AuthError, json, readBody } from "@/lib/auth/http";
import { getCurrentAccount } from "@/lib/auth/session";
import { limitAuthAttempts } from "@/lib/auth/rate-limit";
import type { ProductReview } from "@/lib/reviews/types";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
type ReviewDocument = ProductReview & { _id: string; userId: string | null };
const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const reviewSchema = z.object({
  rating: z.number({ error: "Please select a rating from 1 to 5 stars." }).int().min(1).max(5),
  comment: z.string().trim().max(2000, "Please keep your review within 2,000 characters.").default(""),
}).strict();

async function productReviews(id: string) {
  if (!identifier.safeParse(id).success) throw new AuthError("Product not found.", 404);
  const db = await dbConnect();
  const product = await db.collection<{ _id: string }>("admin_products").findOne(
    { _id: id, status: "active", deletedAt: { $exists: false } }, { projection: { _id: 1 } },
  );
  if (!product) throw new AuthError("Product not found.", 404);
  const reviews = db.collection<ReviewDocument>("product_reviews");
  await reviews.createIndex({ productId: 1, createdAt: -1, _id: -1 });
  return reviews;
}

function failure(error: unknown) {
  if (error instanceof AuthError) return json({ message: error.message }, error.status);
  return json({ message: "Reviews are temporarily unavailable. Please try again." }, 503);
}

export async function GET(request: Request, { params }: Context) {
  try {
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) throw new AuthError("Invalid review page.", 400);
    const { id } = await params;
    const collection = await productReviews(id);
    const limit = 20;
    const [result] = await collection.aggregate<{
      reviews: ProductReview[]; summary: { total: number; average: number }[];
    }>([
      { $match: { productId: id } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $facet: {
        reviews: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 0, id: 1, productId: 1, author: 1, rating: 1, comment: 1, createdAt: 1 } }],
        summary: [{ $group: { _id: null, total: { $sum: 1 }, average: { $avg: "$rating" } } }],
      } },
    ]).toArray();
    return json({ reviews: result.reviews, total: result.summary[0]?.total ?? 0, average: result.summary[0]?.average ?? 0, page, limit });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const input = await readBody(request, reviewSchema);
    const { id } = await params;
    const collection = await productReviews(id);
    const account = await getCurrentAccount("user");
    const visitor = account?.id ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "guest";
    await limitAuthAttempts("product-reviews", visitor);
    const review: ProductReview = {
      id: randomUUID(), productId: id, author: account?.name || "Guest",
      ...input, createdAt: new Date().toISOString(),
    };
    await collection.insertOne({ _id: review.id, ...review, userId: account?.id ?? null });
    return json({ review }, 201);
  } catch (error) { return failure(error); }
}
