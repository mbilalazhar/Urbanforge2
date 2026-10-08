# UrbanForge catalog expansion

This catalog adds 83 products to the five existing men's products, for an expected
88 active products: 22 each in Men, Women, Shoes and Accessories. Existing records
are preserved. New In is a flag, never a separate category.

The scope was revised to product data with one temporary cover per new product.
No external photos or videos are downloaded by these scripts. Eight completed
showcase images from the earlier session are reused; other covers reuse project
images and are deliberately temporary.

## Commands

Run from the repository root after installing dependencies:

```sh
npm run validate:catalog
npm run seed:catalog -- --dry-run
npm run seed:catalog -- --apply
```

The seed loads `.env.local`/`.env` through Next's environment loader and uses the
same `MONGODB_URI`, `MONGODB_DB` (default `urbanforge`) and optional
`MONGODB_DNS_SERVERS` as the app. It requires a replica set, as the existing admin
inventory and order flows do. `--dry-run` is the default and performs no writes.

`--apply` uses stable product SKUs and `$setOnInsert` upserts in a transaction. It
only inserts absent products and their opening inventory movements. Repeating it
does not reset prices, stock, media, descriptions, reviews, or archive states.
Existing products with matching SKUs are left untouched. Name or cross-product
variant-SKU collisions abort the insertion. Users, admins, carts, wishlists,
orders, reviews, coupons and promotions are not seeded or modified.

## Editing media later

Open **Admin → Products**, find the product by name or SKU, and edit it. Remove the
temporary path from **Image URLs** when uploading a replacement cover: the admin
form places existing URLs before newly uploaded files. Add your gallery and
optional video through the existing uploader and save normally. Rerunning this
seed will preserve those changes.

`media-review.json` lists every new SKU, its current cover and the remaining media
work. It is a handoff checklist generated at seed time, not a live reflection of
later admin edits. Media status is tracked here rather than adding fields to the
product database schema.

## Data and validation

- `men.mjs`, `women.mjs`, `shoes.mjs`, `accessories.mjs`: unique editorial records.
- `catalog.mjs`: deterministic SKUs, option combinations, stock totals, sale prices
  and collection flags, plus validation against the app's category taxonomy.
- `seed.mjs`: database dry run and transactional insert-only upserts.
- `seed-report.json`: actual active catalog totals after application.

Every new product has a 15–30 word short description, an 80–180 word detailed
description, material, gender, brand, tags, SEO copy, price, variants and stock.
Each has 2–4 colors; footwear uses EU sizes, while accessories use meaningful
adjustable, one-size, measurement or ring-size options. Clothing uses letter or
waist sizes. Sale prices exist on 27 of the 83 new products; percentage discounts
remain derived from prices by the existing storefront.

The new records supply 24 new arrivals, 12 featured products, 16 bestsellers and
24 essentials across all four categories. Existing flags may increase these
totals. Top Rated continues to require real reviews; no ratings, orders or reviews
are fabricated to populate it.

The only taxonomy addition is Women → Dresses → Midi Dresses / Shirt Dresses.
There is no product-schema migration or change to Next.js remote image hosts.
Search now includes subcategories, product types, materials, tags and option
colors. New palette names and colorways have usable card swatches.

Cards still request only their cover image; videos remain absent on new records.
The existing admin pagination, image lazy loading and responsive 4:5 card layout
are retained. Local WebP covers are at most 960 pixels wide.

## Reused showcase assets

The built-in image-generation tool was used earlier; this revision generates no
additional images. Completed images were copied and compressed into
`public/products/catalog/`:

| SKU | Product | Asset |
| --- | --- | --- |
| UF-M-TS-001 | Foundry Heavyweight Box Tee | foundry-heavyweight-tee.webp |
| UF-M-JK-002 | Rawline Denim Trucker Jacket | rawline-denim-jacket.webp |
| UF-M-JK-003 | District Four-Pocket Utility Jacket | district-utility-jacket.webp |
| UF-W-TR-001 | Studio Wide-Leg Tailored Trousers | studio-wide-leg-trousers.webp |
| UF-W-TP-002 | Contour Long-Sleeve Ribbed Top | contour-ribbed-top.webp |
| UF-W-JK-003 | Afterhours Cropped Biker Jacket | afterhours-cropped-jacket.webp |
| UF-S-SNK-001 | Vector Chunky Street Runner | vector-street-runner.webp |
| UF-S-BOT-002 | Shift Lug-Sole Chelsea Boots | shift-chelsea-boots.webp |

The common prompt for the last seven was: “Use case: product-mockup. Asset: one
UrbanForge e-commerce product cover. Subject: [subject below]. Premium
photorealistic studio garment or product photography. Warm pale grey seamless
background, soft directional professional lighting, realistic material texture,
product centered and entirely visible with generous margins. Portrait 4:5
composition. Clothing photographed on an invisible ghost mannequin; accessories
isolated. No people, no text, no watermark, no external logos, no other products.
Create ONLY one cover image.”

Subjects: vintage indigo relaxed trucker jacket with copper buttons; olive canvas
four-pocket utility jacket; black high-waisted pleated wide-leg trousers; bone
fitted long-sleeve ribbed top; black cropped asymmetric biker jacket; cream/taupe
mesh-and-suede chunky sneakers; black leather lug-sole Chelsea boots.

The tee prompt specified one unbranded washed-black heavyweight cotton crew-neck
tee, dropped shoulders, a boxy fit and thick rib neckline; ghost-mannequin front
three-quarter photography on a warm light-grey studio background, entire garment
visible, 4:5 portrait composition, no person, logos, text or other garments.

## Tests

```sh
npm run build
npm run lint
npm run test:catalog
node --test tests/admin.integration.mjs tests/storefront.test.mjs
```

Integration tests use an isolated temporary MongoDB replica set. They verify dry
runs, idempotence, opening stock history, preservation of existing records and
admin edits, actual admin schema acceptance for all 83 products, public detail
APIs, local cover responses, storefront routes and real Chrome interactions.
Chrome tests are skipped only if Chrome is not installed; set `CHROME_PATH` if it
is not at `/usr/bin/google-chrome`.
