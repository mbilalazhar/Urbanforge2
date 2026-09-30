export default function Loading() {
  return <main className="min-h-[70vh] bg-white px-6 pb-12 pt-28 text-black" role="status"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2"><div className="aspect-square animate-pulse rounded-lg bg-neutral-100" /><div className="space-y-6"><p>Loading product…</p><div className="h-10 animate-pulse rounded bg-neutral-100" /><div className="h-32 animate-pulse rounded bg-neutral-100" /></div></div></main>;
}
