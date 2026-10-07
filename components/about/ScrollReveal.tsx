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
    let heroObserver: IntersectionObserver | undefined;
    let frame = 0;
    const configure = () => {
      observer?.disconnect();
      heroObserver?.disconnect();
      cancelAnimationFrame(frame);
      if (preference.matches) {
        container.removeAttribute("data-motion");
        return;
      }
      const elements = container.querySelectorAll<HTMLElement>("[data-reveal]");
      if (!container.hasAttribute("data-motion")) {
        elements.forEach(element => element.setAttribute("data-visible", "false"));
      }
      container.setAttribute("data-motion", "enabled");
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          // Reverse while the element is still well inside the viewport.
          // Passed content stays revealed until it crosses this line on the way back.
          const aboveViewport = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
          entry.target.setAttribute("data-visible", String(entry.isIntersecting || aboveViewport));
        }
      }, { threshold: 0, rootMargin: `0px 0px -${Math.round(window.innerHeight * 0.38)}px 0px` });
      // The hero enters on load and replays when returning from further down the page.
      // Observe its stationary section so the animated children cannot retrigger it.
      heroObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.querySelectorAll("[data-reveal-hero]").forEach(element => {
            element.setAttribute("data-visible", String(entry.isIntersecting && entry.intersectionRatio >= 0.35));
          });
        });
      }, { threshold: 0.35 });
      // Paint the entrance positions before revealing initially visible content.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          elements.forEach(element => {
            if (!element.hasAttribute("data-reveal-hero")) observer?.observe(element);
          });
          container.querySelectorAll("[data-reveal-hero-root]").forEach(element => heroObserver?.observe(element));
        });
      });
    };
    configure();
    preference.addEventListener("change", configure);
    window.addEventListener("resize", configure);
    return () => {
      observer?.disconnect();
      heroObserver?.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", configure);
      window.removeEventListener("resize", configure);
      container.removeAttribute("data-motion");
    };
  }, []);

  return <div ref={root} className={styles.motionRoot}>{children}</div>;
}
