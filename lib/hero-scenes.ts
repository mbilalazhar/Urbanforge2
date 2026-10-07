import type { StaticImageData } from "next/image";
import background from "@/public/hero-bg.png";
import shoes from "@/public/shoes.png";
import sale from "@/public/sales.png";
import optimized from "./hero-image-manifest.json";

export type HeroImageAsset = {
  src: string | StaticImageData;
  width: number;
  height: number;
  alt?: string;
  optimized?: { src: string; avif: string; webp: string };
};

export type HeroSceneFrame = {
  background: HeroImageAsset;
  /** null supports a pre-composed photograph with no separate model layer. */
  model: HeroImageAsset | null;
  foreground?: HeroImageAsset | null;
  modelMode: "positioned" | "scene";
  backgroundX: string;
  backgroundY: string;
  modelLeft: string;
  modelBottom: string;
  modelWidth: string;
  modelHeight: string;
  modelScale: number;
  /** Compensates for transparent pixels below the visible soles. */
  footInset: string;
  shadowOpacity: number;
  shadowWidth: string;
  modelSizes: string;
};

export type HeroSceneConfig = {
  desktop: HeroSceneFrame;
  tablet?: Partial<HeroSceneFrame>;
  mobile?: Partial<HeroSceneFrame>;
};

export function resolveHeroScene(config: HeroSceneConfig) {
  const desktop = config.desktop;
  const tablet = { ...desktop, ...config.tablet };
  const mobile = { ...tablet, ...config.mobile };
  return { desktop, tablet, mobile };
}

const environment: HeroImageAsset = {
  src: background, width: background.width, height: background.height, optimized: optimized["hero-bg"],
};

const models = {
  home: { src: "/home-models.png", width: 1086, height: 1448, optimized: optimized["home-models"], alt: "Two models wearing UrbanForge streetwear" },
  women: { src: "/women.png", width: 1122, height: 1402, optimized: optimized.women, alt: "Woman wearing a black streetwear outfit and sneakers" },
  men: { src: "/MenSection.png", width: 1086, height: 1448, optimized: optimized.MenSection, alt: "Man wearing a black utility jacket and cargo pants" },
  newIn: { src: "/newIn.png", width: 1122, height: 1402, optimized: optimized.newIn, alt: "Man wearing a bomber jacket, cargo pants, and sneakers" },
  shoes: { src: shoes, width: shoes.width, height: shoes.height, optimized: optimized.shoes, alt: "Two models presenting the UrbanForge footwear collection" },
  accessories: { src: "/accessories.png", width: 1122, height: 1402, optimized: optimized.accessories, alt: "Man styling a cap, sunglasses, crossbody bag, and watch" },
  sale: { src: sale, width: sale.width, height: sale.height, optimized: optimized.sales, alt: "Models wearing the UrbanForge sale collection" },
} satisfies Record<string, HeroImageAsset>;

/** Retain the existing desktop editorial crop, including models continuing below the frame. */
function desktopFrame(model: HeroImageAsset, width = "58cqw", right = "4%", visibleHeight = "90%", shift = 0): HeroSceneFrame {
  return {
    background: environment,
    model,
    modelMode: "positioned",
    backgroundX: "50%",
    backgroundY: "50%",
    modelLeft: `calc(100% - ${right} - (${width} / 2) + (${width} * ${shift}))`,
    modelBottom: `calc(${visibleHeight} - (${width} * ${model.height / model.width}))`,
    modelWidth: width,
    modelHeight: "auto",
    modelScale: 1,
    footInset: "0%",
    shadowOpacity: 0,
    shadowWidth: "58%",
    modelSizes: width === "58cqw" ? "58vw" : width.replaceAll("cqw", "vw"),
  };
}

function standingScene(model: HeroImageAsset, bottomPadding: number, desktop = desktopFrame(model), left = "50%"): HeroSceneConfig {
  return {
    desktop,
    tablet: {
      // The wall meets the pavement around 92% down the source photograph.
      // Model, soles and contact shadow all use that same artwork coordinate.
      modelLeft: "62%",
      modelBottom: "8%",
      modelWidth: "auto",
      modelHeight: "80%",
      footInset: `${bottomPadding / model.height * 100}%`,
      shadowOpacity: 0.25,
      modelSizes: "80vw",
    },
    mobile: {
      modelLeft: left,
      modelHeight: "86%",
      modelSizes: "120vw",
    },
  };
}

function croppedScene(model: HeroImageAsset, desktop: HeroSceneFrame): HeroSceneConfig {
  return {
    desktop,
    tablet: {
      // These assets end at the thighs: continue the crop through the stage edge.
      modelLeft: "62%",
      modelBottom: "-3%",
      modelWidth: "auto",
      modelHeight: "92%",
      modelSizes: "85vw",
    },
    mobile: {
      modelLeft: "50%",
      modelBottom: "-3%",
      modelHeight: "100%",
      modelSizes: "150vw",
    },
  };
}

export const heroScenes = {
  home: standingScene(models.home, 15),
  women: standingScene(models.women, 12),
  men: standingScene(models.men, 20),
  newIn: standingScene(models.newIn, 18),
  shoes: croppedScene(models.shoes, desktopFrame(models.shoes, "min(42cqw, 80svh, 780px)", "7%", "88%")),
  accessories: standingScene(models.accessories, 18, desktopFrame(models.accessories, "58cqw", "4%", "90%", 0.14)),
  sale: croppedScene(models.sale, desktopFrame(models.sale, "min(34cqw, 60svh, 600px)", "10%", "86%")),
} satisfies Record<string, HeroSceneConfig>;
