import Image from "next/image";
import type { CSSProperties } from "react";
import SceneImage from "./SceneImage";
import { resolveHeroScene, type HeroSceneFrame } from "@/lib/hero-scenes";
import { ArrowDown, ArrowRight, Mouse } from "lucide-react";
import styles from "./hero.module.css";
import { homeHero, type HeroContent } from "@/lib/catalog-sections";

const collections = [
  { name: "Jackets", image: "/jacket.png", id: 1 },
  { name: "Cargos", image: "/bottoms.png", id: 4 },
  { name: "Hoodies", image: "/hoodie.png", id: 2 },
  { name: "Tees", image: "/tee.png", id: 3 },
  { name: "Accessories", image: "/watch.png", id: 5 },
];

type SceneVariables = CSSProperties & { [key: `--${string}`]: string | number };

function frameVariables(frame: HeroSceneFrame, prefix: string): SceneVariables {
  const aligned = frame.modelMode === "scene";
  return {
    [`--${prefix}-background-ratio`]: frame.background.width / frame.background.height,
    [`--${prefix}-background-x`]: frame.backgroundX,
    [`--${prefix}-background-y`]: frame.backgroundY,
    [`--${prefix}-model-display`]: frame.model ? "block" : "none",
    [`--${prefix}-model-left`]: aligned ? "50%" : frame.modelLeft,
    [`--${prefix}-model-bottom`]: aligned ? "0%" : frame.modelBottom,
    [`--${prefix}-model-width`]: aligned ? "100%" : frame.modelWidth,
    [`--${prefix}-model-height`]: aligned ? "100%" : frame.modelHeight,
    [`--${prefix}-model-ratio`]: frame.model ? frame.model.width / frame.model.height : 1,
    [`--${prefix}-model-scale`]: aligned ? 1 : frame.modelScale,
    [`--${prefix}-foot-inset`]: aligned ? "0%" : frame.footInset,
    [`--${prefix}-shadow-opacity`]: aligned ? 0 : frame.shadowOpacity,
    [`--${prefix}-shadow-width`]: frame.shadowWidth,
  };
}

export default function HeroSection({ content = homeHero }: { content?: HeroContent }) {
  const { desktop, tablet, mobile } = resolveHeroScene(content.scene);
  const sceneStyle = {
    ...frameVariables(desktop, "desktop"),
    ...frameVariables(tablet, "tablet"),
    ...frameVariables(mobile, "mobile"),
  };
  const environmentSizes = { desktop: "100vw", tablet: "180svh", mobile: "180svh" };
  const modelSizes = { desktop: desktop.modelSizes, tablet: tablet.modelSizes, mobile: mobile.modelSizes };

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.scene} style={sceneStyle}>
        <div className={styles.artwork}>
          <SceneImage desktop={desktop.background} tablet={tablet.background} mobile={mobile.background}
            sizes={environmentSizes} className={styles.backdrop} decorative />
          <div className={styles.models}>
            <div className={styles.contactShadow} aria-hidden="true" />
            <SceneImage desktop={desktop.model} tablet={tablet.model} mobile={mobile.model}
              sizes={modelSizes} className={styles.modelImage} />
          </div>
          <SceneImage desktop={desktop.foreground ?? null} tablet={tablet.foreground ?? null} mobile={mobile.foreground ?? null}
            sizes={environmentSizes} className={styles.foregroundArchitecture} decorative />
        </div>
        <div className={styles.sceneGrade} aria-hidden="true" />
        <div className={styles.readability} aria-hidden="true" />
        <div className={styles.content}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1 id="hero-heading" className={styles.headline}>
            <span>{content.heading[0]}</span><span>{content.heading[1]}</span>
          </h1>
          <p className={styles.description}>
            {content.description[0]}<br />
            {content.description[1]}
          </p>
          <a href="#new-arrivals" className={styles.shop}>
            {content.button} <ArrowRight size={16} strokeWidth={1.5} />
          </a>
          <a href="#collections" className={styles.discover}>Discover<br />Our Collections</a>
        </div>
        <a href="#collections" className={styles.scroll} aria-label="Scroll to collections">
          <span>Scroll</span><Mouse size={18} strokeWidth={1} /><ArrowDown size={18} strokeWidth={1} />
        </a>
        <div className={styles.drop} aria-label="New drop 026">
          <span>New Drop <i /></span><p><b>/</b> 026</p>
        </div>
        <p className={styles.motto}><span />Bigger Fits<br />Bolder Moves<br />Same Mission</p>
      </div>
      <nav id="collections" className={styles.collections} aria-label="Explore collections">
        <div className={styles.collectionTrack}>
          {[false, true].map((isDuplicate) => (
            <div key={String(isDuplicate)} className={styles.collectionGroup} aria-hidden={isDuplicate || undefined}>
              {collections.map((collection, index) => (
                <a
                  key={collection.name}
                  href={`#featured-product-${collection.id}`}
                  className={styles.collection}
                  tabIndex={isDuplicate ? -1 : undefined}
                >
                  <div className={styles.collectionImage}>
                    <Image src={collection.image} alt="" fill sizes="(min-width: 1024px) 10vw, 106px" />
                  </div>
                  <span className={styles.collectionLabel}>
                    <i /><span><small>0{index + 1}</small> {collection.name} <ArrowRight size={13} /></span>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </nav>
    </section>
  );
}
