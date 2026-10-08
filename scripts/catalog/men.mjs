// Editorial catalog data. Media is intentionally a single, replaceable local cover.
const men = [
  {
    name: 'Foundry Heavyweight Box Tee', code: 'TS', subcategory: 'Tops', productType: 'T-Shirts', price: 3900,
    colors: ['Washed Black', 'Bone', 'Olive'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '100% heavyweight cotton jersey', image: 'foundry-heavyweight-tee', tags: ['oversized', 'cotton', 'streetwear'],
    shortDescription: 'A substantial cotton tee with dropped shoulders, a wide body and a ribbed neckline for a clean, relaxed streetwear silhouette.',
    description: 'Built around a generous boxy shape, the Foundry tee brings structure to an everyday layer. Heavyweight cotton jersey gives the body a substantial drape, while dropped shoulders and roomy sleeves keep the fit easy through the upper arm. A close ribbed neckline balances the wider proportions, and a straight hem works worn loose over cargos or tucked into pleated trousers. Choose your usual size for the intended oversized fit. Wear it alone in mild weather or beneath an open overshirt when the temperature drops. Wash inside out on a cool cycle and reshape before drying in the shade.',
  },
  {
    name: 'Rawline Denim Trucker Jacket', code: 'JK', subcategory: 'Outerwear', productType: 'Jackets', price: 10900,
    colors: ['Vintage Indigo', 'Washed Black'], sizes: ['S', 'M', 'L', 'XL'], material: '100% cotton denim', image: 'rawline-denim-jacket', tags: ['denim', 'layering', 'relaxed fit'],
    shortDescription: 'A relaxed denim trucker with flap chest pockets, metal button closures and enough room to layer over your everyday cotton essentials.',
    description: 'Rawline keeps the familiar trucker silhouette and gives it a little more breathing room. Cotton denim holds the shape through the shoulders, while a relaxed body accommodates a tee or fine sweatshirt without feeling tight. Metal buttons, two flap chest pockets and vertical front seams bring definition to the simple profile. The jacket ends around the hip so it sits neatly above straight jeans, cargos or chinos. Wear it open for a softer outline or buttoned through on cooler evenings. Wash sparingly, turn inside out before cleaning and keep dark denim away from light fabrics while damp.',
  },
  {
    name: 'District Four-Pocket Utility Jacket', code: 'JK', subcategory: 'Outerwear', productType: 'Jackets', price: 11900,
    colors: ['Olive', 'Black', 'Stone'], sizes: ['S', 'M', 'L', 'XL'], material: 'Cotton canvas shell; polyester lining', image: 'district-utility-jacket', tags: ['utility', 'canvas', 'outerwear'],
    shortDescription: 'A cotton canvas field layer with four front pockets, a stand collar and a relaxed cut made for everyday city outfits.',
    description: 'Four generous patch pockets give the District jacket its practical character, with a clean front fastening keeping the overall look restrained. The canvas shell has a dry, lightly textured hand and enough body to sit comfortably over a knit or hoodie. A stand collar frames the neckline without adding the bulk of a hood, and the relaxed sleeves allow easy layering. Pair the olive option with dark denim or build a tonal outfit around the stone colorway. This is an everyday outer layer for mild and cooler conditions. Spot clean small marks and follow the garment care label for a full wash.',
  },
  {
    name: 'Baseline Contrast Collar Tee', code: 'TS', subcategory: 'Tops', productType: 'T-Shirts', price: 3200,
    colors: ['Cream / Black', 'White / Burgundy'], sizes: ['S', 'M', 'L', 'XL'], material: '100% cotton jersey', image: 'foundry-heavyweight-tee', tags: ['retro', 'cotton', 'contrast trim'],
    shortDescription: 'An easy cotton ringer tee with contrast neckline and sleeve bands, adding a subtle retro accent to a simple daily rotation.',
    description: 'A contrast rib collar and matching sleeve bands give Baseline a quiet retro reference without relying on a large graphic. The cotton jersey body is cut straight, with a little space through the chest and a hem that falls around the hip. It is an easy partner for worn denim, tailored shorts or loose workwear trousers. The lighter jersey makes it useful as a first layer under a cardigan or zip jacket, while the outlined sleeves keep it distinctive on its own. Wash with similar colors at a cool temperature and avoid ironing directly over the rib trim.',
  },
  {
    name: 'Avenue Cotton Pique Polo', code: 'PL', subcategory: 'Tops', productType: 'Polos', price: 4500,
    colors: ['Navy', 'White', 'Burgundy'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '100% cotton pique', image: 'foundry-heavyweight-tee', tags: ['polo', 'smart casual', 'summer'],
    shortDescription: 'A textured cotton polo with a neat two-button placket, ribbed collar and straight fit that moves easily between casual and smarter dressing.',
    description: 'Avenue uses the small raised texture of cotton pique to give a daily polo a little extra depth. The straight fit leaves room through the torso while the ribbed collar and short placket keep the neckline tidy. Small side vents let the hem sit comfortably over trousers, and the short sleeves finish with a soft rib edge. Wear it with clean sneakers and chinos for an uncomplicated workday outfit, or with drawstring shorts on a warm weekend. Button the collar higher for a sharper line. Wash on a gentle cycle, reshape the collar while damp and dry away from direct heat.',
  },
  {
    name: 'Coast Linen Blend Resort Shirt', code: 'SH', subcategory: 'Tops', productType: 'Shirts & Blouses', price: 5400,
    colors: ['Stone', 'White', 'Light Blue'], sizes: ['S', 'M', 'L', 'XL'], material: '55% linen, 45% cotton', image: 'contour-ribbed-top', tags: ['linen', 'resort collar', 'summer'],
    shortDescription: 'A breezy short-sleeve resort shirt with a relaxed open collar, straight hem and softly textured linen-cotton fabric for warm days.',
    description: 'Coast is an easy warm-weather shirt with an open resort collar and a softly squared hem. The linen-cotton blend brings a natural surface texture that suits a slightly rumpled finish, while the relaxed body allows room for movement. Simple front buttons and an understated chest pocket keep the detail practical. Wear it open over a vest on a weekend or button it through with loose trousers for dinner. The short sleeves are roomy enough to turn back once without pulling. Wash gently in cool water, smooth the seams while damp and use a warm iron if you prefer a crisper finish.',
  },
  {
    name: 'Gridline Oxford Overshirt', code: 'SH', subcategory: 'Tops', productType: 'Shirts & Blouses', price: 5900,
    colors: ['Light Blue', 'White', 'Navy'], sizes: ['S', 'M', 'L', 'XL'], material: '100% cotton Oxford weave', image: 'rawline-denim-jacket', tags: ['overshirt', 'cotton', 'layering'],
    shortDescription: 'A roomy Oxford shirt with a button front and softly curved hem, designed to work buttoned up or layered over a tee.',
    description: 'With a wider chest and a slightly lowered shoulder, Gridline sits between a classic shirt and a light overshirt. Cotton Oxford weave gives the fabric a subtle basket texture and enough weight to hold its shape without a lining. A single chest pocket and button cuffs keep the finish familiar, while the curved hem looks considered when left untucked. Layer it over a plain tee with jeans, or button it through with straight trousers. It is especially useful for changing temperatures indoors and out. Machine wash with similar colors, then hang to dry and press the collar as needed.',
  },
  {
    name: 'Interval Loopback Crew Sweatshirt', code: 'SW', subcategory: 'Tops', productType: 'Hoodies & Sweatshirts', price: 5600,
    colors: ['Grey', 'Navy', 'Bone'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '100% cotton loopback terry', image: 'foundry-heavyweight-tee', tags: ['sweatshirt', 'loopback', 'relaxed fit'],
    shortDescription: 'A relaxed crew-neck sweatshirt in cotton loopback terry, finished with ribbed cuffs and a clean front for easy everyday layering.',
    description: 'Interval is the layer to reach for when a tee feels too light and a jacket feels too much. Cotton loopback terry has a smooth outer face and small loops inside, giving the sweatshirt a comfortable midweight feel. Ribbed cuffs, neckline and hem bring the loose body into a tidy shape without a tight fit. The plain front leaves room for your choice of accessories, from a crossbody bag to a simple chain. Pair it with matching-tone joggers or balance it with a pressed trouser. Wash inside out, skip high tumble heat and reshape the ribbing before drying.',
  },
  {
    name: 'Atelier Textured Button Cardigan', code: 'KN', subcategory: 'Tops', productType: 'Sweaters & Cardigans', price: 6900,
    colors: ['Chocolate', 'Cream', 'Charcoal'], sizes: ['S', 'M', 'L', 'XL'], material: '100% cotton knit', image: 'contour-ribbed-top', tags: ['knitwear', 'cardigan', 'transitional'],
    shortDescription: 'A textured cotton cardigan with a relaxed V-neck, tonal buttons and ribbed edges for a softer approach to everyday layering.',
    description: 'A visible knit texture gives Atelier interest without a busy pattern. The cotton construction feels substantial in the hand, with a relaxed V-neck opening that leaves space for a crew tee or a shirt collar. Tonal buttons and a ribbed hem keep the finish quiet, while easy sleeves make it comfortable to wear at a desk or out through the evening. Leave the lower button open over pleated trousers, or wear it loose with denim and a tank. Fold this cardigan between wears rather than hanging it. Wash gently, avoid wringing and lay flat to dry to preserve its proportions.',
  },
  {
    name: 'Terminal Minimal Bomber Jacket', code: 'JK', subcategory: 'Outerwear', productType: 'Jackets', price: 9900,
    colors: ['Black', 'Olive', 'Navy'], sizes: ['S', 'M', 'L', 'XL'], material: 'Nylon shell; polyester lining', image: 'existing-jacket', tags: ['bomber', 'lightweight', 'urban'],
    shortDescription: 'A clean nylon bomber with a metal zip, angled hand pockets and ribbed edges that give relaxed outfits a defined finish.',
    description: 'Terminal takes the familiar bomber shape and pares it back to the details you use every day. A smooth nylon shell sits over a light lining, with a front zip that lets you control how the jacket layers. Angled pockets keep small essentials within reach, and ribbed cuffs and hem create a gently rounded profile. The regular body has room for a tee or thin knit without a bulky outline. Wear it with wide jeans and low-top sneakers, or with tailored trousers after dark. Clean according to the care label and avoid high heat against the shell or ribbed trim.',
  },
  {
    name: 'Northline Relaxed City Coat', code: 'CT', subcategory: 'Outerwear', productType: 'Coats', price: 14900,
    colors: ['Charcoal', 'Taupe'], sizes: ['S', 'M', 'L', 'XL'], material: '60% polyester, 40% wool; polyester lining', image: 'existing-jacket', tags: ['coat', 'winter', 'tailored'],
    shortDescription: 'A relaxed wool-blend city coat with notched lapels, discreet pockets and a smooth lining that slips comfortably over cold-weather layers.',
    description: 'Northline adds a longer, cleaner line to an everyday winter wardrobe. The wool-blend outer has a softly brushed texture, while a smooth lining helps the coat slide over knitwear. Notched lapels, a simple button front and side pockets keep the shape considered rather than formal. A back vent gives the hem room to move when you walk or sit, and the relaxed shoulder accommodates an extra layer. Try it over a hoodie and denim for contrast, or keep it tonal with trousers and boots. Air between wears, brush gently to remove surface lint and have it professionally cleaned when needed.',
  },
  {
    name: 'Rail Straight-Leg Denim Jeans', code: 'JN', subcategory: 'Bottoms', productType: 'Jeans', price: 6200,
    colors: ['Vintage Indigo', 'Washed Black', 'Light Blue'], sizes: ['28', '30', '32', '34', '36', '38'], material: '100% cotton denim', image: 'existing-bottoms', tags: ['denim', 'straight leg', 'five pocket'],
    shortDescription: 'Straight-leg cotton jeans with a regular rise and classic five-pocket construction, cut for a clean line from the hip to the hem.',
    description: 'Rail is built around an uncomplicated straight leg that works with both low sneakers and heavier boots. The regular-rise waist sits comfortably with a belt, and the cotton denim has a structured feel that softens with wear. Five pockets, metal rivets and a zipped fly keep the construction familiar. A full-length hem can be worn loose or turned back to show a little ankle. Choose the darker washes for a cleaner outfit or light blue for a more casual rotation. Turn inside out for washing, use cool water and allow to dry naturally to help preserve the finish.',
  },
  {
    name: 'Frame Tapered Cotton Chinos', code: 'TR', subcategory: 'Bottoms', productType: 'Pants & Trousers', price: 5200,
    colors: ['Stone', 'Navy', 'Olive'], sizes: ['28', '30', '32', '34', '36', '38'], material: '98% cotton, 2% elastane twill', image: 'studio-wide-leg-trousers', tags: ['chino', 'tapered', 'smart casual'],
    shortDescription: 'Cotton twill chinos with an easy thigh, gently tapered leg and a touch of stretch for comfortable movement throughout the day.',
    description: 'Frame offers a tidy alternative to denim without feeling stiff or overly formal. Cotton twill gives the trousers a fine diagonal texture, with a small amount of elastane for movement as you sit and walk. The thigh is comfortable and the leg narrows gradually towards the ankle. Side pockets and rear welt pockets maintain a clean outline, while belt loops let you finish the waist your way. Wear them with a polo for work or turn up the hems with a boxy tee at the weekend. Wash with similar tones and press inside out for a smooth finish.',
  },
  {
    name: 'Studio Relaxed Pleated Trousers', code: 'TR', subcategory: 'Bottoms', productType: 'Pants & Trousers', price: 6800,
    colors: ['Black', 'Taupe', 'Charcoal'], sizes: ['28', '30', '32', '34', '36'], material: '65% polyester, 32% viscose, 3% elastane', image: 'studio-wide-leg-trousers', tags: ['pleated', 'tailored', 'wide leg'],
    shortDescription: 'Relaxed pleated trousers with a fluid drape, a defined waistband and a generous straight leg for modern everyday tailoring.',
    description: 'Front pleats give these Studio trousers room through the upper leg while keeping the waistband neatly defined. The woven viscose blend has a smooth surface and a fluid fall, creating a longer line over sneakers or loafers. Side pockets hold the essentials, and discreet rear pockets keep the back clean. A button and zip fastening makes the fit easy to secure without an elasticated look. Balance the generous leg with a fitted knit, or lean into the proportions with an oversized tee. Use a gentle wash or professional clean as directed, then steam lightly to refresh the drape.',
  },
  {
    name: 'Weekend Drawstring Twill Shorts', code: 'ST', subcategory: 'Bottoms', productType: 'Shorts', price: 3800,
    colors: ['Stone', 'Black', 'Olive'], sizes: ['S', 'M', 'L', 'XL'], material: '100% cotton twill', image: 'existing-bottoms', tags: ['shorts', 'summer', 'drawstring'],
    shortDescription: 'Relaxed cotton twill shorts with an elasticated drawstring waist, practical side pockets and an easy length that sits above the knee.',
    description: 'Weekend shorts combine the texture of a woven chino with the ease of a pull-on waist. Soft cotton twill holds a simple shape through the leg, while an internal drawstring lets you adjust the fit without a belt. Side pockets and a rear patch pocket provide space for small daily items. The hem sits above the knee for a balanced proportion with a loose tee or short-sleeve shirt. Keep the styling casual with canvas sneakers, or add a polo and leather sandals for a summer evening. Wash with similar colors and smooth the waistband before line drying.',
  },
  {
    name: 'Motion Tapered Jersey Joggers', code: 'JG', subcategory: 'Bottoms', productType: 'Leggings & Joggers', price: 4900,
    colors: ['Charcoal', 'Black', 'Grey'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '80% cotton, 20% polyester loopback jersey', image: 'existing-bottoms', tags: ['joggers', 'loungewear', 'tapered'],
    shortDescription: 'Soft loopback joggers with a relaxed seat, tapered legs and ribbed cuffs, finished with a drawstring waist for an adjustable fit.',
    description: 'Motion keeps the comfort of a jersey trouser in a silhouette that looks tidy outside the house. The cotton-rich loopback fabric has a smooth face and a softly textured inside, while the relaxed seat gives room to move. Tapered legs end in rib cuffs that sit above your shoes, and the adjustable waistband lets you find an easy fit. Side pockets hold a phone or keys during everyday errands. Wear them with a crew sweatshirt for a coordinated feel, or add a plain tee and a structured jacket. Wash inside out and dry at a low temperature or on a line.',
  },
  {
    name: 'Harbor Seersucker Camp Shirt', code: 'SH', subcategory: 'Tops', productType: 'Shirts & Blouses', price: 4800,
    colors: ['Cream', 'Navy', 'Olive'], sizes: ['S', 'M', 'L', 'XL'], material: '100% cotton seersucker', image: 'contour-ribbed-top', tags: ['seersucker', 'textured', 'summer'],
    shortDescription: 'A relaxed camp-collar shirt in puckered cotton seersucker, with short sleeves and a straight hem that keeps warm-weather dressing simple.',
    description: 'The gently puckered surface of Harbor gives this summer shirt its character. Cotton seersucker keeps a naturally uneven texture, so the fabric looks relaxed without needing a perfectly pressed finish. A camp collar lies open at the neck, while a button front and straight hem make it easy to wear over a vest or on its own. The sleeves have enough width for a loose turn-up, and the body sits comfortably away from the torso. Pair it with drawstring shorts, straight chinos or light denim. Wash gently and hang to dry; avoid flattening the texture with heavy ironing.',
  },
];

export default men;
