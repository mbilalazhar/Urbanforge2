"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./about.module.css";

export default function ScrollReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    if (!container || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      container.removeAttribute("data-motion");
      if (preference.matches) return;
      container.setAttribute("data-motion", "enabled");
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-visible", "true");
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
      container.querySelectorAll<HTMLElement>("[data-reveal]").forEach(element => {
        // Above-the-fold content stays visible, including when arriving at an anchor.
        if (element.getBoundingClientRect().top < window.innerHeight) element.setAttribute("data-visible", "true");
        else observer?.observe(element);
      });
    };
    configure();
    preference.addEventListener("change", configure);
    return () => { observer?.disconnect(); preference.removeEventListener("change", configure); container.removeAttribute("data-motion"); };
  }, []);

  return <div ref={root} className={styles.motionRoot}>{children}</div>;
}
