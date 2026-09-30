"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-white px-6 text-center text-black"><h1 className="text-2xl font-semibold">We couldn’t load this product</h1><p>Please try again in a moment.</p><button onClick={reset} className="rounded bg-black px-6 py-3 text-white">Try again</button><Link href="/">Back to the store</Link></main>;
}
