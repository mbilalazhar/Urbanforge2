"use client";
import { FeedbackNotice } from "@/components/ui/Feedback";

import { PendingContent } from "@/components/ui/Skeleton";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Send } from "lucide-react";
import { supportSubjects } from "@/lib/support";
import styles from "./support.module.css";

export default function ContactForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    submitting.current = true;
    setPending(true);
    setError("");
    setReference("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Your message could not be sent. Please try again.");
      setReference(result.reference);
      form.reset();
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send your message. Please try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <section className={`${styles.card} ${styles.formCard}`} aria-labelledby="contact-form-title" id="ask-question">
    <p className={styles.eyebrow}>SEND US A MESSAGE</p>
    <h2 id="contact-form-title">How can we help?</h2>
    <p className={styles.intro}>Have a question, need support, or just want to say hello? Fill out the form below and let’s talk.</p>
    <form onSubmit={submit} className={styles.form}>
      <div className={styles.formGrid}>
        <label>Full name <span>*</span><input name="name" placeholder="Your full name" autoComplete="name" required maxLength={100} /></label>
        <label>Email address <span>*</span><input name="email" type="email" placeholder="you@example.com" autoComplete="email" required maxLength={254} /></label>
        <label>Phone number <small>(optional)</small><input name="phone" type="tel" placeholder="Your contact number" autoComplete="tel" maxLength={30} /></label>
        <label>Order number <small>(optional)</small><input name="orderNumber" placeholder="e.g. UF123456" maxLength={60} /></label>
      </div>
      <label>Subject <span>*</span><select name="subject" defaultValue="" required><option value="" disabled>Select a subject</option>{supportSubjects.map(subject => <option key={subject}>{subject}</option>)}</select></label>
      <label>Message <span>*</span><textarea name="message" placeholder="Tell us how we can help…" required minLength={10} maxLength={1000} value={message} onChange={event => setMessage(event.target.value)} aria-describedby="message-count" /><small id="message-count" className={styles.characterCount}>{message.length}/1000</small></label>
      <div className={styles.formActions}><button type="submit" className={styles.primaryButton} disabled={pending}><PendingContent pending={pending}><Send size={17} />{"Send message"}<ArrowRight size={16} /></PendingContent></button><Link href="/faqs" className={styles.secondaryButton}>Explore FAQs <ArrowRight size={16} /></Link></div>
      <p className={styles.privacy}><LockKeyhole size={12} />Your details are used to respond to your enquiry. <Link href="/privacy-policy">Privacy policy</Link></p>
      {error && <FeedbackNotice>{error} You can also email <a href="mailto:info@urbanforge.com">info@urbanforge.com</a>.</FeedbackNotice>}
      {reference && <FeedbackNotice kind="success"><div><strong>Message received. Thank you!</strong><p>Your reference is {reference}. Keep it handy for any follow-up.</p></div></FeedbackNotice>}
    </form>
  </section>;
}
