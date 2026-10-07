"use client";

import { useFeedback } from "@/components/ui/Feedback";
import { useState } from "react";
import Image from "next/image";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const feedback = useFeedback();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    feedback.warning("Newsletter subscriptions are not available yet. Please check back soon.");
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-black bg-cover bg-center bg-no-repeat"
    >
      <Image src="/footer.png" alt="" fill sizes="100vw" className="object-cover object-center" />

      {/* ── Content ── */}
      <div className="relative z-20 mx-auto max-w-4xl px-6 pb-20 pt-36 text-center sm:pb-24 sm:pt-44 md:pt-52">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Subscribe to our newsletter
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-300 sm:text-base">
          to stay up to date on all the latest news and offers from us
        </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-10 flex w-full max-w-xl items-center rounded-full bg-white p-1 shadow-lg"
          >
            <input
              aria-label="Email address for the newsletter"
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="min-w-0 flex-1 rounded-full bg-transparent px-5 py-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-rose-700 sm:text-base"
            />
            <button
              type="submit"
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-700 sm:px-8 sm:text-base"
            >
              Subscribe
            </button>
          </form>
      </div>
    </section>
  );
}
