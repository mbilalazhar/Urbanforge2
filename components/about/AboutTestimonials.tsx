"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { testimonials } from "./about-content";
import styles from "./about.module.css";

export default function AboutTestimonials() {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => setEdges({ start: element.scrollLeft < 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, []);

  function scroll(direction: number) {
    const element = track.current;
    if (!element) return;
    const cardWidth = element.firstElementChild?.getBoundingClientRect().width ?? element.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: direction * (cardWidth + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <section className={styles.testimonials} aria-labelledby="testimonials-title">
    <div className={styles.sectionIntro} data-reveal="left"><p className={styles.eyebrow}>Real stories</p><h2 id="testimonials-title">What our<br />customers say.</h2><p id="testimonial-help" className={styles.testimonialHint}>Explore {testimonials.length} stories from our community. Swipe, scroll, or use the arrows.</p><div className={styles.testimonialControls}><button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Previous testimonials" aria-controls="testimonial-track"><ArrowLeft size={19} /></button><button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label="Next testimonials" aria-controls="testimonial-track"><ArrowRight size={19} /></button></div></div>
    <div ref={track} id="testimonial-track" className={styles.testimonialCards} role="region" aria-label="Customer testimonials" aria-describedby="testimonial-help" tabIndex={0}>
      {testimonials.map(testimonial => <figure key={testimonial.name}><div className={styles.stars} role="img" aria-label="5 out of 5 stars">{[1, 2, 3, 4, 5].map(value => <Star key={value} size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}</div><h3>{testimonial.title}</h3><blockquote>“{testimonial.quote}”</blockquote><figcaption><Image src={testimonial.image} alt="" width={36} height={36} /><span><strong>{testimonial.name}</strong><small>UrbanForge community</small></span></figcaption></figure>)}
    </div>
  </section>;
}
