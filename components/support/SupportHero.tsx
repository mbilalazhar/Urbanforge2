import Image from "next/image";
import styles from "./support.module.css";

export default function SupportHero({ title, eyebrow, description }: { title: string; eyebrow: string; description: string }) {
  return <header className={styles.hero}>
    <Image src="/hero-bg.png" alt="" fill priority sizes="100vw" className={styles.heroBackground} />
    <div className={styles.heroShade} />
    <Image src="/accessories.png" alt="" width={1122} height={1402} className={styles.heroModel} />
    <div className={styles.heroInner}>
      <p className={styles.heroMotto}>BUILT<br />FOR A<br />BOLDER<br />TOMORROW<span /></p>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      <p className={styles.heroMotto}>PEOPLE<br />STYLE<br />CITIES<br />HIGHER<span /></p>
    </div>
  </header>;
}
