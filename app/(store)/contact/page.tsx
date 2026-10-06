import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import SupportHero from "@/components/support/SupportHero";
import ContactForm from "@/components/support/ContactForm";
import { exampleStore } from "@/lib/support";
import styles from "@/components/support/support.module.css";

export const metadata: Metadata = { title: "Contact Us", description: "Get in touch with UrbanForge for help with orders, products, delivery and returns." };

export default function ContactPage() {
  return <main className={styles.page}>
    <SupportHero title="Contact Us" eyebrow="GET IN TOUCH" description="We’re here to help with orders, products, returns, and support." />
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">Contact us</span></nav>
      <div className={styles.contactLayout}>
        <ContactForm />
        <div className={styles.contactAside}>
          <section className={styles.card} aria-labelledby="reach-title">
            <div className={styles.sectionHeading}><h2 id="reach-title">Other ways to reach us</h2><span className={styles.tinyLabel}>REAL PEOPLE. REAL SUPPORT.</span></div>
            <div className={styles.reachGrid}>
              <a href="mailto:info@urbanforge.com" className={styles.reachItem}><span className={styles.iconCircle}><Mail size={23} /></span><div><h3>Email support</h3><p>For general enquiries</p><span>info@urbanforge.com</span></div><ArrowRight size={14} /></a>
              <a href="tel:+61297560388" className={styles.reachItem}><span className={styles.iconCircle}><Phone size={22} /></span><div><h3>Call us</h3><p>Talk to our team</p><span>+61 2 9756 0388</span></div><ArrowRight size={14} /></a>
              <Link href="/faqs" className={styles.reachItem}><span className={styles.iconCircle}><MessageCircle size={23} /></span><div><h3>Quick answers</h3><p>A little help, anytime</p><span>Visit our FAQs</span></div><ArrowRight size={14} /></Link>
              <div className={styles.reachItem}><span className={styles.iconCircle}><Clock3 size={23} /></span><div><h3>Business hours</h3><p>Mon – Fri: 10am – 4pm</p><p>Sydney local time</p></div></div>
            </div>
          </section>
          <section className={`${styles.card} ${styles.mapCard}`} aria-labelledby="map-title">
            <div className={styles.sectionHeading}><h2 id="map-title">Find a store</h2><a href={exampleStore.directions} target="_blank" rel="noopener noreferrer">Get directions <ArrowRight size={14} /></a></div>
            <iframe title="Map showing Nike House of Innovation at 650 5th Avenue, New York" src={exampleStore.map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            <div className={styles.mapCaption}><MapPin size={20} /><div><h3>{exampleStore.name}</h3><p>{exampleStore.address}</p><small>Example US store location · Not an UrbanForge branch</small></div></div>
          </section>
        </div>
      </div>
      <section className={styles.visitStrip} aria-labelledby="visit-title"><div><p className={styles.eyebrow}>EXPLORE IN PERSON</p><h2 id="visit-title">A New York state of style.</h2><p>Discover a retail landmark in the heart of Fifth Avenue.</p></div><div className={styles.visitAddress}><span className={styles.iconCircle}><MapPin size={24} /></span><div><h3>{exampleStore.name}</h3><p>650 5th Avenue, New York, NY 10019</p><small>Example location</small></div></div><a className={styles.secondaryButton} href={exampleStore.directions} target="_blank" rel="noopener noreferrer"><Navigation size={16} /> Get directions <ArrowRight size={16} /></a></section>
    </div>
  </main>;
}
