import type { heroScenes } from "./hero-scenes";

export type HeroContent = {
  eyebrow: string;
  heading: [string, string];
  description: [string, string];
  button: string;
  scene: keyof typeof heroScenes;
};

type CatalogSection = {
  slug: string;
  label: string;
  highlight?: boolean;
  hero: HeroContent;
};

export const homeHero: HeroContent = {
  eyebrow: "Urban Streetwear & Utility",
  heading: ["Built For", "The Streets."],
  description: ["Premium urban wear for everyday explorers.", "Jackets / Cargos / Boots / Backpacks / Accessories & More."],
  button: "Shop New Arrivals",
  scene: "home",
};

export const catalogSections: CatalogSection[] = [
  {
    slug: "women", label: "Women",
    hero: {
      eyebrow: "UrbanForge / Women's Collection",
      heading: ["Her Style.", "Her Rules."],
      description: ["Bold silhouettes. Uncompromising attitude.", "Discover streetwear made to move your way."],
      button: "Shop Women",
      scene: "women",
    },
  },
  {
    slug: "men", label: "Men",
    hero: {
      eyebrow: "UrbanForge / Men's Collection",
      heading: ["Built To", "Stand Out."],
      description: ["Everyday essentials with a utility edge.", "Explore bold layers, relaxed fits, and street-ready style."],
      button: "Shop Men",
      scene: "men",
    },
  },
  {
    slug: "new-in", label: "New In",
    hero: {
      eyebrow: "UrbanForge / The Latest Drop",
      heading: ["Fresh Fits.", "New Energy."],
      description: ["Your next rotation starts here.", "Discover the latest layers, essentials, and everyday favorites."],
      button: "Shop New In",
      scene: "newIn",
    },
  },
  {
    slug: "shoes", label: "Shoes",
    hero: {
      eyebrow: "UrbanForge / Footwear",
      heading: ["Make Your", "Next Move."],
      description: ["Street-ready from the ground up.", "Find the sneakers and statement pairs that finish your fit."],
      button: "Explore Shoes",
      scene: "shoes",
    },
  },
  {
    slug: "accessories", label: "Accessories",
    hero: {
      eyebrow: "UrbanForge / Accessories",
      heading: ["Small Details.", "Big Impact."],
      description: ["The finishing touches that make it yours.", "Explore bags, watches, caps, and everyday extras."],
      button: "Shop Accessories",
      scene: "accessories",
    },
  },
  {
    slug: "sale", label: "Sale", highlight: true,
    hero: {
      eyebrow: "UrbanForge / The Sale Edit",
      heading: ["Big Fits.", "Less Spend."],
      description: ["Freshen up your rotation for less.", "Explore the sale edit and find your next favorite fit."],
      button: "Explore the Sale",
      scene: "sale",
    },
  },
];

export const menuItems = catalogSections.map(({ slug, label, highlight }) => ({ label, href: `/${slug}`, highlight }));

export function getCatalogSection(slug: string) {
  return catalogSections.find(section => section.slug === slug);
}
