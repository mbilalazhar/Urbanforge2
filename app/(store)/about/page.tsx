import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Eye, Fingerprint, Heart, Leaf, PackageCheck, ShieldCheck, Sparkles, Users } from "lucide-react";
import ScrollReveal from "@/components/about/ScrollReveal";
import AboutTestimonials from "@/components/about/AboutTestimonials";
import { milestones, pressNames, statistics } from "@/components/about/about-content";
import styles from "@/components/about/about.module.css";

export const metadata: Metadata = {
  title: "Our Story | UrbanForge",
  description: "Built for the streets. Designed for real life. Discover the people, purpose, and creative spirit behind UrbanForge.",
};

function Photo({ src, alt, className = "", priority = false, sizes = "(max-width: 767px) 100vw, 40vw" }: { src: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  return <div className={`${styles.photo} ${className}`}><Image src={src} alt={alt} fill sizes={sizes} priority={priority} /></div>;
}

const values = [
  { icon: Fingerprint, title: "Our mission", text: "To make thoughtfully designed, built-to-last streetwear that inspires confidence and lets you be yourself." },
  { icon: Eye, title: "Our vision", text: "To be a global streetwear movement that connects communities, champions creativity, and shapes a more inclusive, inspired future." },
  { icon: Users, title: "Our values", text: "Authenticity\nQuality\nCreativity\nInclusivity\nA positive impact" },
];
const reasons = [
  { icon: ShieldCheck, title: "Premium quality", text: "Considered materials. Details for everyday life." },
  { icon: Fingerprint, title: "Built around you", text: "For your style, wherever life takes you." },
  { icon: PackageCheck, title: "Easy returns", text: "Find your fit with a little more confidence." },
  { icon: Heart, title: "A community", text: "More than customers. A global movement." },
];

export default function AboutPage() {
  return <main className={styles.page}>
    <ScrollReveal>
      <section className={styles.hero} aria-labelledby="about-title">
        <Image src="/hero2.png" alt="Two models in UrbanForge streetwear against a concrete city backdrop" fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroFade} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}><p className={styles.eyebrow}>Our story</p><h1 id="about-title">Built for<br />the streets.<br />Designed<br />for real life.</h1><p>UrbanForge is modern streetwear for those who move their own way. We design with purpose, create for the next generation, and build for the everyday.</p><Link href="#our-story" className={styles.button}>Our story, your style <ArrowDown size={14} /></Link></div>
          <p className={styles.heroMotto}>People.<br />Culture.<br />Better<br />streetwear.<span /></p>
        </div>
        <span className={styles.heroEdition}>URBANFORGE® — MADE FOR YOUR EVERYDAY</span>
      </section>

      <div className={styles.container}>
        <section id="our-story" className={styles.story} aria-labelledby="story-title">
          <div className={styles.storyCopy} data-reveal="left"><p className={styles.eyebrow}>The real story</p><h2 id="story-title">More than fashion.<br />A state of mind.</h2><p>UrbanForge was born from a simple belief — great style should empower people in their everyday lives. The sidewalk is a catwalk, culture is a playground, and clothes are an expression of the people who wear them.</p><p>What began as a passion project has grown into a global brand, but our mission remains the same: to create high-quality, modern essentials that help people express who they are.</p><span className={styles.redRule} /></div>
          <div className={styles.storyMosaic} data-reveal="wipe"><Photo src="/about/brand-hoodie.png" alt="UrbanForge printed on the back of a black cotton hoodie" className={styles.storyMain} /><div className={styles.storyAside}><div className={styles.quoteTile}><Image src="/hoodie.png" alt="" fill sizes="20vw" /><p>Good<br />people.<br />Better<br />places.</p></div><div className={styles.manifestoTile}><span>01 / THE MINDSET</span><p>Inspired<br />by real<br />life.</p><i /></div></div></div>
        </section>

        <section className={styles.purpose} aria-labelledby="purpose-title">
          <div className={styles.sectionIntro} data-reveal="up"><p className={styles.eyebrow}>Our purpose</p><h2 id="purpose-title">A stronger, brighter<br />streetwear culture.</h2><p>Everything we do is driven by a deeper purpose — to build a brand that inspires confidence, creativity, and positive change through fashion.</p></div>
          <div className={styles.valueCards}>{values.map(({ icon: Icon, title, text }) => <article key={title} className={styles.valueCard}><Icon size={27} strokeWidth={1.15} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>
      </div>

      <section className={styles.stats} aria-label="UrbanForge in numbers"><div className={styles.statsInner}>{statistics.map((stat, index) => <div key={stat.label} data-reveal="up" style={{ transitionDelay: `${index * 90}ms` }}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div></section>

      <div className={styles.container}>
        <section className={styles.world} aria-labelledby="world-title"><div data-reveal="up"><p className={styles.eyebrow}>Our world</p><h2 id="world-title">People. Places. Progress.</h2></div><div className={styles.worldGrid} data-reveal="scale">
          <Photo src="/hero2.png" alt="Streetwear in the city" sizes="(max-width: 600px) 50vw, 18vw" />
          <div className={styles.worldQuote}><p>Good<br />people.<br />Better<br />places.</p><span>THE URBANFORGE WAY</span></div>
          <Photo src="/about/brand-hoodie.png" alt="The details on our signature hoodie" sizes="(max-width: 600px) 50vw, 18vw" />
          <div className={styles.labelTile}><span>URBANFORGE</span><small>BUILT FOR THE STREETS<br />DESIGNED FOR REAL LIFE</small></div>
          <Photo src="/bottoms.png" alt="Black utility trousers and everyday boots" sizes="(max-width: 600px) 50vw, 18vw" />
          <Photo src="/about/craft-studio.png" alt="Inside a streetwear design studio" sizes="(max-width: 600px) 50vw, 18vw" />
        </div></section>

        <section className={styles.journey} aria-labelledby="journey-title"><div className={styles.sectionIntro} data-reveal="left"><p className={styles.eyebrow}>How it started</p><h2 id="journey-title">A journey<br />built on people.</h2><p>From a small idea to a global community, our journey has been shaped by passion, purpose, and the people who believe in what we do.</p></div><ol className={styles.timeline}>{milestones.map((milestone, index) => <li key={milestone.year} data-reveal="up" style={{ transitionDelay: `${index * 90}ms` }}><span className={styles.timelineDot} /><strong>{milestone.year}</strong><h3>{milestone.title}</h3><p>{milestone.description}</p></li>)}</ol></section>

        <section className={styles.craft} aria-labelledby="craft-title"><div data-reveal="wipe" className={styles.craftPhoto}><Photo src="/about/craft-studio.png" alt="A garment maker carefully sewing black fabric in a bright studio" /></div><div className={styles.craftCopy} data-reveal="up"><p className={styles.eyebrow}>Craftsmanship</p><h2 id="craft-title">Thoughtful details.<br />Lasting quality.</h2><p>We believe in pieces that earn their place in your everyday — with better materials, considered design, and a commitment to doing things right. Every piece is made to be worn, lived in, and made yours.</p><Link href="/search" className={styles.button}>Our essentials <ArrowRight size={14} /></Link></div><div className={styles.detailMosaic} data-reveal="right"><div className={styles.fabricLabel}><span>URBANFORGE<small>DESIGNED FOR REAL LIFE</small></span></div><div className={styles.detailBottom}><div className={styles.detailWords}>Quality<br />is never<br />just a<br />detail.<span /></div><Photo src="/watch.png" alt="Close-up of the construction and finish of a black utility jacket" sizes="20vw" /></div></div></section>

        <section className={styles.reasons} aria-labelledby="reasons-title"><div className={styles.sectionIntro} data-reveal="up"><p className={styles.eyebrow}>The difference</p><h2 id="reasons-title">More reasons<br />to choose us.</h2></div><div className={styles.reasonCards}>{reasons.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={25} strokeWidth={1.15} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></section>

        <AboutTestimonials />

        <section className={styles.press} aria-label="Press mentions"><div><p className={styles.eyebrow}>In the spotlight</p><h2>In good company.</h2></div><div className={styles.pressNames}>{pressNames.map(name => <span key={name}>{name}</span>)}</div></section>

        <section id="our-team" className={styles.team} aria-labelledby="team-title"><div data-reveal="wipe"><Photo src="/about/creative-team.png" alt="Four creatives in black streetwear gathered in a concrete courtyard" /></div><div className={styles.teamCopy} data-reveal="right"><p className={styles.eyebrow}>The people behind UrbanForge</p><h2 id="team-title">A global team.<br />With a shared vision.</h2><p>Designers, creators, thinkers, and doers — united in a desire to make everyday life better through thoughtful design. We’re a team built on individuality, shared ambition, and a belief in making a lasting impact.</p><Link href="/contact" className={styles.textLink}>Get to know us <ArrowRight size={15} /></Link></div></section>

        <section className={styles.collection} aria-labelledby="collection-title"><Image src="/about/brand-hoodie.png" alt="" fill sizes="100vw" /><div className={styles.collectionShade} /><div className={styles.collectionCopy} data-reveal="up"><p className={styles.eyebrow}>Ready to be part of the story?</p><h2 id="collection-title">Explore our collections.</h2><Link href="/search" className={styles.button}>Shop now <ArrowRight size={14} /></Link></div><p className={styles.collectionMotto}>Same<br />people.<br />New<br />possibilities.</p></section>
      </div>
      <div className={styles.endNote}><Leaf size={13} aria-hidden="true" /><span>Thoughtfully designed. Made to be lived in.</span><Sparkles size={13} aria-hidden="true" /></div>
    </ScrollReveal>
  </main>;
}
