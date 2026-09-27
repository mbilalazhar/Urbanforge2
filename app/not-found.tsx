import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import background from "@/public/404.png";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Image src={background} alt="" fill priority sizes="100vw" className={styles.background} />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.content}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Page not found</span>
        </nav>
        <p className={styles.eyebrow}><span />Looks like a wrong turn</p>
        <h1><span className={styles.code}>4<span>0</span>4</span><span className={styles.title}>Off the <em>grid.</em></span></h1>
        <p className={styles.description}>This page couldn’t be found.<br />Your next fit is still out there. Let’s get you back on track.</p>
        <div className={styles.actions}>
          <Link href="/" className={styles.home}><ArrowLeft size={16} strokeWidth={1.5} />Back to home</Link>
          <Link href="/search" className={styles.search}><Search size={16} strokeWidth={1.5} />Find your fit</Link>
        </div>
        <Link href="/new-in" className={styles.explore}>Explore new arrivals<ArrowRight size={15} strokeWidth={1.5} /></Link>
      </div>
      <div className={styles.signature} aria-hidden="true"><span />UrbanForge<br />Built for the streets.</div>
      <p className={styles.errorLabel}>Error 404 / Page not found</p>
    </main>
  );
}
