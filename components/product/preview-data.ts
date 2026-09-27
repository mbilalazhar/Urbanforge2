// Static presentation data. Replace this lookup with the product API later.
const clothingSizes = ["S", "M", "L", "XL"];

const previews: Record<string, { description: string; details: string[]; sizes: string[] }> = {
  Shoes: {
    description: "Finish your everyday rotation with a streetwear staple. A high-top silhouette with clean details and a versatile finish.",
    details: ["High-top silhouette", "Lace-up fastening", "Easy to style with your everyday fit"],
    sizes: ["7", "8", "9", "10", "11", "12"],
  },
  Bags: {
    description: "Keep your everyday essentials close. A compact crossbody silhouette designed to move with you.",
    details: ["Adjustable crossbody strap", "Compact everyday storage", "Signature utility styling"],
    sizes: ["One size"],
  },
  Outerwear: {
    description: "Built for the everyday escape. A lightweight utility jacket with a relaxed silhouette and considered details, made to move from city streets to after-hours adventures.",
    details: ["Relaxed, layer-ready fit", "Lightweight woven shell", "Adjustable hood and secure pockets"],
    sizes: clothingSizes,
  },
  Hoodies: {
    description: "Your off-duty essential, reworked. Soft heavyweight fleece meets an oversized cropped silhouette for easy layering and all-day comfort.",
    details: ["Oversized cropped fit", "Soft brushed fleece", "Ribbed cuffs and dropped shoulders"],
    sizes: clothingSizes,
  },
  "T-Shirts": {
    description: "An everyday staple with a streetwear edge. A clean graphic finish and an easy, relaxed fit make this the first layer you reach for.",
    details: ["Relaxed everyday fit", "Soft cotton jersey", "Ribbed crew neckline"],
    sizes: clothingSizes,
  },
  Bottoms: {
    description: "Utility without compromise. A relaxed cargo silhouette with room to move and practical pockets for everything the day brings.",
    details: ["Relaxed straight-leg fit", "Durable woven fabric", "Spacious utility pockets"],
    sizes: ["28", "30", "32", "34", "36"],
  },
  Watches: {
    description: "A finishing touch for the modern explorer. A bold utility-inspired watch that brings a clean, considered detail to your everyday rotation.",
    details: ["Adjustable everyday fit", "Utility-inspired detailing", "Presented in an UrbanForge box"],
    sizes: ["One size"],
  },
};

export function getProductPreview(category: string) {
  return previews[category] ?? {
    description: "Premium streetwear for modern explorers. Considered details, an effortless fit, and a design that goes wherever the day takes you.",
    details: ["Designed for everyday wear", "Signature UrbanForge detailing", "Easy to style and layer"],
    sizes: clothingSizes,
  };
}
