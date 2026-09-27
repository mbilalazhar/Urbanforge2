import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128, "Password must be at most 128 characters."),
}).strict();

export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Enter your full name.").max(100),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be at most 128 characters."),
}).strict();
