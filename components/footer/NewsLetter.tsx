"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section
      className="relative isolate overflow-hidden bg-black bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/footer.png')" }}
    >

      {/* ── Content ── */}
      <div className="relative z-20 mx-auto max-w-4xl px-6 pb-20 pt-36 text-center sm:pb-24 sm:pt-44 md:pt-52">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Subscribe to our newsletter
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-300 sm:text-base">
          to stay up to date on all the latest news and offers from us
        </p>

        {submitted ? (
          <p className="mt-10 text-sm font-medium text-emerald-400">
            Thanks! You&apos;re subscribed. 🎉
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-10 flex w-full max-w-xl items-center rounded-full bg-white p-1 shadow-lg"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 rounded-full bg-transparent px-5 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none sm:text-base"
            />
            <button
              type="submit"
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-700 sm:px-8 sm:text-base"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}