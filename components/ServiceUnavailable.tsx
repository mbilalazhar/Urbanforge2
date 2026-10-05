"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ServiceUnavailable({ title }: { title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 py-32 text-center text-neutral-900">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-neutral-600">We’re having trouble connecting. Please try again in a moment.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="rounded bg-neutral-900 px-6 py-3 text-white disabled:opacity-60"
      >
        {pending ? "Trying again…" : "Try again"}
      </button>
      <Link href="/" className="underline underline-offset-4">Back to the store</Link>
    </main>
  );
}
