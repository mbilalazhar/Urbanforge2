"use client";
import Link from "next/link";
import { FeedbackNotice } from "@/components/ui/Feedback";
import { PendingContent } from "@/components/ui/Skeleton";
import { useTransition } from "react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const [pending, startTransition] = useTransition();
  return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-white px-6 text-neutral-900">
    <FeedbackNotice>We couldn’t open this page. Please try again.</FeedbackNotice>
    <button type="button" disabled={pending} onClick={() => startTransition(reset)} className="rounded bg-black px-6 py-3 text-white"><PendingContent pending={pending}>Try again</PendingContent></button>
    <Link href="/">Back to the store</Link>
  </main>;
}
