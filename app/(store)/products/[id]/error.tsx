"use client";
import { FeedbackNotice } from "@/components/ui/Feedback";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-white px-6 text-center text-black"><FeedbackNotice>We couldn’t load this product. Please try again in a moment.</FeedbackNotice><button onClick={reset} className="rounded bg-black px-6 py-3 text-white">Try again</button><Link href="/">Back to the store</Link></main>;
}
