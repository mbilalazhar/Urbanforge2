# Optimization and SEO progress

Updated October 7, 2026. This records the current working tree, including changes
that were already in progress when this work resumed. Changes are not deployed.

The October 7 Lighthouse follow-up is recorded in [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md):
production desktop scores 99/100/100/100; mobile scores 90/100/100/100. The
development hydration error is fixed, hero request priority and responsive
sizes are improved, and transferred production JavaScript is 26% smaller.

## Implemented

- Shared canonical URLs, Open Graph/Twitter metadata, and a social preview image.
- Organization, WebSite, Product, Offer, and breadcrumb JSON-LD. Product offers
  use the catalog's effective promotion price and current stock.
- Sitemap for public pages and active, non-deleted products, with a public-page
  fallback during database outages.
- Noindex metadata on account, authentication, search, cart, checkout, wishlist,
  and admin pages. Crawlers can read these directives; `/api/` is blocked except
  for public `/api/media/` product assets.
- Responsive, content-hashed hero AVIF/WebP files and immutable asset caching;
  optimized local/uploaded product images and lazy-loaded quick view.
- Live server-rendered catalog cards on the home and collection pages. A
  request-local React Query cache hydrates the browser without an immediate
  duplicate catalog request. A separate loading boundary lets the hero render
  while storage is queried. Prices and stock are not cached in the production build.
- Collection loading and loaded content share the same heading and layout.
- Known collection slugs are enumerated; unknown category URLs render the
  non-indexable not-found page.
- Inter is bundled locally with its license, eliminating the Google Fonts
  download that prevented the production build. Other pages have an explicit
  font fallback. Product card links have descriptive accessible names.
- All eight existing testimonial portraits are bundled as 320px WebP assets,
  totaling 124,446 bytes. Content-hashed filenames use the existing immutable
  caching rule. The About page no longer depends on runtime Unsplash requests.
  Original source URLs and the regeneration script are stored under `scripts/`.
- Default Next.js metadata streaming is restored. The all-user-agent blocking
  override did not prevent streamed not-found/redirect responses in this app.

## Verification

Latest results:

- Production build, TypeScript, ESLint, and whitespace checks passed.
- Storefront/cart/admin unit checks passed.
- Admin, authentication, checkout, contact, and review integration suites passed.
- SEO, outage-route, and product-preview browser checks passed together: 10 tests,
  zero failures. Chrome verified no duplicate catalog request after collection
  hydration, working quick view, and desktop/mobile width constraints.
- The previously incomplete skeleton browser suite now passes in full. It
  checks loading states, button spinners, toast/modal feedback, and all eight
  local testimonial images. The images decode correctly and retain sufficient
  resolution at 2x pixel density. The final screenshot was visually checked.
- After completing the portrait changes, production build, TypeScript, ESLint,
  and whitespace checks passed again.

Use `npm run test:seo` to build and verify rendered collection links, canonical
and social metadata, promotion pricing and stock in JSON-LD, product visibility,
sitemap entries, robots directives, public routes, and storage-outage behavior.

Additional checks:

```sh
npm run lint
npm run build
node --test tests/*.test.mjs
node --test tests/admin.integration.mjs tests/auth.integration.mjs tests/checkout.integration.mjs tests/contact.integration.mjs tests/reviews.integration.mjs
node --test tests/product-preview.browser.mjs tests/skeletons.browser.mjs
```

Integration tests use disposable MongoDB instances. They need permission to bind
local ports and may download MongoDB on the first run. Browser tests use
`CHROME_PATH` or `/usr/bin/google-chrome`.

Next.js loading boundaries can send HTTP 200 before an asynchronous missing-product
lookup or account redirect resolves. Tests verify the rendered not-found page,
`noindex`, absence of Product offers, and the login meta redirect in these cases.
Unknown categories must render a non-indexable not-found page, never a collection.
See [Next.js loading/status behavior](https://nextjs.org/docs/app/api-reference/file-conventions/loading#status-codes)
and [streamed redirects](https://nextjs.org/docs/app/api-reference/functions/redirect).

## Deployment and follow-up

- Set `SITE_URL` to the actual public HTTPS origin at both build and runtime;
  metadata defaults to localhost for development. Docker Compose already passes
  the build argument. Rebuild when changing the canonical origin.
- Verify the public domain's rendered canonical URLs, social image, robots.txt,
  and sitemap.xml after deployment, then submit the sitemap in Search Console.
- Measure deployed mobile/desktop Core Web Vitals and Lighthouse results. Local
  production-build results are recorded in `PERFORMANCE_AUDIT.md`; deployed
  performance and ranking changes have not been measured.
- The catalog still reads/serializes all active products. Add server pagination
  and smaller listing payloads when catalog scale warrants it, keeping the
  shared search and client query behavior consistent.
- The sitemap currently caps product entries at 49,000. Split it into multiple
  sitemaps before the catalog reaches that limit.

Regenerate hero assets after replacing original hero artwork:

```sh
node scripts/optimize-hero-images.mjs
```

To replace testimonial portraits, update `scripts/testimonial-image-sources.json`
and regenerate their local assets and manifest (requires curl and network access):

```sh
node scripts/optimize-testimonial-images.mjs
```

The application build uses the checked-in assets; it does not download portraits.
