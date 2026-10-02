import { productCategories } from "@/lib/product-categories";

export const offerCategories = Object.keys(productCategories);

export function mainCategory(value: string) {
  return offerCategories.find(category => category.toLowerCase() === value.trim().toLowerCase());
}

type OfferScope = { categories?: string[]; productIds?: string[] };

// Old product-specific offers require an explicit scope edit before they can apply.
// Never turn an old restricted offer into an unintended store-wide discount.
export function validOfferScope(offer: OfferScope) {
  return !offer.productIds?.length && Array.isArray(offer.categories) && offer.categories.every(category => Boolean(mainCategory(category)));
}

export function matchesOfferCategory(offer: OfferScope, category: string) {
  return validOfferScope(offer) && (!offer.categories!.length || offer.categories!.some(value => mainCategory(value) === mainCategory(category)));
}
