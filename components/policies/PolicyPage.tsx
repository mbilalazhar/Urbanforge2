import Link from "next/link";
import { ArrowDown, ArrowRight, ChevronRight, Cookie, FileText, Mail, ShieldCheck } from "lucide-react";
import { policies, policyLinks, type PolicyKey } from "./policy-data";
import styles from "./policies.module.css";

const icons = { privacy: ShieldCheck, terms: FileText, cookies: Cookie };
export default function PolicyPage({ policyKey }: { policyKey: PolicyKey }) {
  const policy = policies[policyKey];
  const Icon = icons[policyKey];
  return <main className={styles.page} id="policy-top">
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} /><span aria-current="page">{policy.title}</span></nav>
      <header className={styles.hero}>
        <div><p className={styles.eyebrow}>{policy.eyebrow}</p><h1>{policy.title}</h1><p className={styles.description}>{policy.description}</p><div className={styles.meta}><span>URBANFORGE / STORE POLICIES</span><span>Last updated <time dateTime={policyKey === "cookies" ? "2026-10-06" : "2026-10-03"}>{policyKey === "cookies" ? "6 October 2026" : "3 October 2026"}</time></span></div></div>
        <div className={styles.heroIcon} aria-hidden="true"><Icon size={66} strokeWidth={1} /><span>SHOP WITH<br />CONFIDENCE.</span></div>
      </header>
      <nav className={styles.policyTabs} aria-label="Store policies">{policyLinks.map(link => { const TabIcon = icons[link.key]; return <Link href={link.href} key={link.key} aria-current={link.key === policyKey ? "page" : undefined}><TabIcon size={17} />{link.title}<ArrowRight size={14} /></Link>; })}</nav>
      <div className={styles.layout}>
        <aside className={styles.sidebar}><nav aria-label="On this page"><p className={styles.eyebrow}>ON THIS PAGE</p><ol>{policy.sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol></nav><div className={styles.help}><Mail size={22} strokeWidth={1.5} /><h2>Let’s clear things up.</h2><p>Have a question? We’re here to help.</p><a href="mailto:info@urbanforge.com">Email UrbanForge <ArrowRight size={14} /></a></div></aside>
        <article className={styles.article} aria-label={policy.title}>
          <div className={styles.summary}><Icon size={23} strokeWidth={1.5} /><p>{policy.summary}</p></div>
          {policy.sections.map((section, index) => <section className={styles.section} id={section.id} key={section.id}><div className={styles.sectionTitle}><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2></div>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}{policyKey === "cookies" && section.id === "storage-used" && <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Store browser storage"><table><caption>Cookies and browser storage at a glance</caption><thead><tr><th scope="col">Storage</th><th scope="col">Purpose</th><th scope="col">Duration</th></tr></thead><tbody><tr><th scope="row">Sign-in cookie</th><td>Keeps customer and administrator sessions authenticated separately.</td><td>Up to 7 days, or until sign-out.</td></tr><tr><th scope="row">Cart storage</th><td>Remembers cart items on this device, separately for guests and signed-in accounts.</td><td>Until updated, removed or browser data is cleared.</td></tr><tr><th scope="row">Tab sync signals</th><td>Notifies other tabs of account and wishlist changes.</td><td>Replaced when a change occurs, or cleared with site data.</td></tr><tr><th scope="row">Cookie preference</th><td>Remembers whether you chose all cookies or necessary cookies only.</td><td>Until browser storage is cleared.</td></tr><tr><th scope="row">Product-view identifier (optional)</th><td>Counts daily product visits only after you accept all cookies.</td><td>Until necessary-only is selected or browser storage is cleared.</td></tr></tbody></table></div>}</section>)}
          <div className={styles.articleFooter}><p>Keep exploring, with the details covered.</p><a href="#policy-top">Back to top <ArrowDown size={14} /></a></div>
        </article>
      </div>
    </div>
  </main>;
}
