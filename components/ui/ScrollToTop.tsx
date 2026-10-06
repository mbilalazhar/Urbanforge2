"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useEffect(() => {
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    reset();
    // Run after the router's own scroll handling, including back/forward navigation.
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  return null;
}
