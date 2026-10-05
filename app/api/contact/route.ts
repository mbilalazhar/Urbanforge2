import { randomUUID } from "node:crypto";
import { z } from "zod";
import dbConnect from "@/lib/dbconnect";
import { AuthError, json, readBody } from "@/lib/auth/http";
import { limitAuthAttempts } from "@/lib/auth/rate-limit";
import { supportSubjects } from "@/lib/support";

export const runtime = "nodejs";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(254).toLowerCase(),
  phone: z.string().trim().max(30).default(""),
  orderNumber: z.string().trim().max(60).default(""),
  subject: z.enum(supportSubjects, { error: "Please select a subject." }),
  message: z.string().trim().min(10, "Please include at least 10 characters in your message.").max(1000),
}).strict();

export async function POST(request: Request) {
  try {
    const input = await readBody(request, contactSchema);
    await limitAuthAttempts("contact", input.email);
    const db = await dbConnect();
    const reference = `UF-${randomUUID()}`;
    await db.collection("support_messages").insertOne({ ...input, reference, status: "new", createdAt: new Date() });
    return json({ reference }, 201);
  } catch (error) {
    if (error instanceof AuthError) return json({ message: error.message }, error.status);
    return json({ message: "We couldn’t save your message right now. Please try again later." }, 503);
  }
}
