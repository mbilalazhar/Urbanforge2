import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, MessageCircle, Plus } from "lucide-react";
import SupportHero from "@/components/support/SupportHero";
import { faqGroups } from "@/components/support/faq-data";
import styles from "@/components/support/support.module.css";

export const metadata: Metadata = pageMetadata("/faqs", "Frequently Asked Questions", "Find answers to 25 common questions about UrbanForge orders, shipping, returns, sizing and accounts.");

export default function FAQsPage() {
  return <main className={styles.page}>
    <SupportHero title="Frequently Asked Questions" eyebrow="A LITTLE HELP GOES A LONG WAY" description="From finding your fit to tracking your order. Let’s clear things up." />
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">FAQs</span></nav>
      <div className={styles.faqLayout}>
        <aside className={styles.faqSidebar}><p className={styles.eyebrow}>FIND YOUR ANSWER</p><h2>Good questions.<br />Clear answers.</h2><p>Choose a topic, then open a question to find out more.</p><nav aria-label="FAQ topics">{faqGroups.map((group, index) => <a href={`#${group.id}`} key={group.id}><span>0{index + 1}</span>{group.title}<ArrowRight size={14} /></a>)}</nav><div className={styles.sidebarHelp}><MessageCircle size={23} /><h3>Prefer to talk to us?</h3><p>Our team is here to help.</p><Link href="/contact#ask-question">Send us a message <ArrowRight size={14} /></Link></div></aside>
        <div className={styles.faqList}>{faqGroups.map((group, index) => <section className={styles.faqGroup} id={group.id} key={group.id}><div className={styles.faqGroupTitle}><span>0{index + 1}</span><h2>{group.title}</h2><small>5 QUESTIONS</small></div>{group.questions.map(([question, answer]) => <details className={styles.faqItem} key={question}><summary>{question}<Plus size={18} aria-hidden="true" /></summary><div className={styles.faqAnswer}><p>{answer}</p></div></details>)}</section>)}</div>
      </div>
      <section className={styles.questionCta} aria-labelledby="still-have-questions"><span className={styles.iconCircle}><MessageCircle size={28} /></span><div><p className={styles.eyebrow}>LET’S TALK</p><h2 id="still-have-questions">Didn’t find your question?</h2><p>Ask us anything about your UrbanForge experience. We’re here to help.</p></div><Link href="/contact#ask-question" className={styles.primaryButton}>Ask your question <ArrowRight size={17} /></Link></section>
    </div>
  </main>;
}
