/** Shared by the admin form and API. */
const clothing = (women: boolean) => ({
  Tops: ["T-Shirts", "Shirts & Blouses", "Polos", "Sweaters & Cardigans", "Hoodies & Sweatshirts"],
  Bottoms: ["Jeans", "Pants & Trousers", "Shorts", ...(women ? ["Skirts"] : []), "Leggings & Joggers"],
  Outerwear: ["Jackets", "Coats", "Blazers", "Vests"],
  Activewear: ["Gym Shorts", "Tracksuits"],
  "Intimates / Underwear": [...(!women ? ["Boxers & Briefs"] : []), "Socks", "Sleepwear & Loungewear"],
  Swimwear: [...(!women ? ["Swim Trunks"] : []), "Cover-ups"],
});
export const productCategories: Record<string, Record<string, readonly string[]>> = {
  Women: clothing(true), Men: clothing(false),
  Kids: {
    "Baby (0-24 Months)": ["Bodysuits & Onesies", "Sleep & Play", "Outerwear", "Accessories"],
    "Toddler (2-5 Years)": ["Tops", "Bottoms", "Dresses", "Outerwear"],
    "Boys (6-14 Years)": ["Tops", "Bottoms", "Activewear", "Outerwear"],
    "Girls (6-14 Years)": ["Tops", "Bottoms", "Activewear", "Outerwear"],
  },
  Accessories: {
    "Bags & Backpacks": ["Handbags", "Crossbody Bags", "Backpacks", "Totes", "Wallets"],
    "Jewelry & Watches": ["Necklaces", "Earrings", "Rings", "Bracelets", "Watches"],
    "Other Accessories": ["Belts", "Hats & Beanies", "Sunglasses", "Scarves & Gloves"],
  },
  Shoes: { "Sneakers & Athletic": [], Boots: [], "Heels & Wedges (Women)": [], "Flats & Loafers": [], "Sandals & Slides": [] },
  Brands: { Women: [], Men: [], Kids: [], Accessories: [], Shoes: [] },
};
export function subcategoriesFor(category: string) {
  return Object.hasOwn(productCategories, category) ? Object.keys(productCategories[category]) : [];
}
export function productTypesFor(category: string, subcategory: string): readonly string[] {
  return subcategoriesFor(category).includes(subcategory) ? productCategories[category][subcategory] : [];
}
