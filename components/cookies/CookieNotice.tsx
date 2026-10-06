"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { useFeedback } from "@/components/ui/Feedback";
import { saveCookiePreference, useCookiePreference, type CookiePreference } from "@/lib/cookie-preferences";
import styles from "./cookie-notice.module.css";

export default function CookieNotice() {
  const preference = useCookiePreference();
  const feedback = useFeedback();
  if (preference !== null) return null;

  function accept(choice: CookiePreference) {
    saveCookiePreference(choice);
    feedback.success(choice === "all" ? "All cookies accepted. Preferences saved." : "Necessary cookies only. Preferences saved.");
  }

  return <aside className={styles.notice} aria-labelledby="cookie-notice-title" aria-describedby="cookie-notice-description">
    <div className={styles.content}>
    <span className={styles.icon} aria-hidden="true"><Cookie size={27} strokeWidth={1.5} /></span>
    <div className={styles.copy}><h2 id="cookie-notice-title">Your cookies. Your choice.</h2><p id="cookie-notice-description">Necessary cookies and storage keep you signed in and remember your cart. Accept all to also allow product-view analytics. <Link href="/cookie-policy">Read our cookie policy</Link>.</p></div>
    <div className={styles.actions}>
      <button type="button" className={styles.necessary} onClick={() => accept("necessary")}>Necessary only</button>
      <button type="button" className={styles.acceptAll} onClick={() => accept("all")}>Accept all cookies</button>
    </div>
    </div>
  </aside>;
}
