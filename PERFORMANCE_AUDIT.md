# Agentic browsing follow-up — October 11, 2026

Added `public/llms.txt`, a plain-text Markdown guide to the public collections,
store information, sitemap and crawl rules. Root-relative links work on both
local previews and the deployed domain without a hard-coded hostname.

The baseline mobile audit reproduced **2/3**: requesting `/llms.txt` returned
the Next.js not-found HTML with HTTP 200, so Lighthouse flagged its missing
Markdown heading and links. Accessibility-tree and layout-stability checks
already passed.

Fresh Lighthouse 13.5.0 audits using headless Chrome 155 against the production
home page at `http://127.0.0.1:3100/` now pass **3/3 on mobile and desktop**:

| Check | Mobile | Desktop |
| --- | --- | --- |
| Accessibility tree | Pass | Pass |
| Cumulative layout shift | Pass | Pass |
| llms.txt | Pass | Pass |

Accessibility, best practices and SEO remain 100 on both profiles. Performance
was 88 mobile and 99 desktop in these single local lab runs; these are not
deployed-site measurements. Optional WebMCP and ARD checks are not applicable.

Production build (including TypeScript) and whitespace checks passed.
Verified `/llms.txt` returns HTTP 200 with `text/plain` and the exact file
contents; all 16 linked URLs return HTTP 200 without a Next.js not-found fallback.

Reports (HTML and matching JSON, outside the repository):

- `/tmp/urbanforge-agentic-mobile-before.report.html`
- `/tmp/urbanforge-agentic-mobile-after.report.html`
- `/tmp/urbanforge-agentic-desktop-after.report.html`

Changes are local, not deployed. Recheck the public URL after deployment.

---

# Mobile performance and search follow-up — October 11, 2026

Changes are local, not deployed. Search displays at most eight unique products
from the bestseller and featured selections, alternating between them when
available. Query/filter matching happens before selection, sorting is preserved,
and smaller result sets are not padded with unrelated products.

## Final production measurements

Lighthouse 13.5.0, headless Chrome, simulated throttling, localhost production
build using the existing catalog. These are single lab runs, not field results
or a guarantee of a deployed score.

| Device | Performance | Accessibility | Best practices | SEO | LCP | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 87 | 100 | 100 | 100 | 3.2 s | 280 ms |
| Desktop | 99 | 100 | 100 | 100 | 0.9 s | 10 ms |

The initial local runs scored 74 mobile (4.2 s LCP, 430 ms TBT) and 99 desktop.
The mobile baseline also fetched the catalog client-side, whereas the final run
used server hydration, so the timings are observations rather than a controlled
isolation of individual optimizations. The supplied Vercel screenshot's 82 is
from a different environment and is not the baseline for these local results.

## Implemented changes

- Mobile hero background variants retain the original center and full source
  height while omitting offscreen wall pixels. Model positions and desktop
  artwork are preserved. The audited background fell from 70,531 to 35,978 bytes.
  The existing image script regenerates all variants and the manifest.
- Home and category grids initially render 20 cards; Load more adds batches of
  20 until the complete catalog is visible. Loading placeholders reserve the
  same batch layout, keeping footer images away from the initial viewport.
- Catalog hydration includes only listing/search fields and color/size variant
  data. Full descriptions, inventory and other details still come from the live
  product endpoint when opening quick view or a product page. The public catalog
  API contract is unchanged; its browser download is not server-paginated yet.
- A shared price formatter replaces one formatter per card. Scroll cancellation
  listeners exist only during pending mouse previews. Product cards, the mobile
  cart link and the cookie-policy link no longer automatically prefetch routes.
  See [Next.js Link prefetch](https://nextjs.org/docs/app/api-reference/components/link#prefetch).
- No experimental Next.js configuration is enabled by this change.

## Verification

Production build and TypeScript passed. All 17 checks passed:

```sh
node --test --test-concurrency=1 tests/catalog-search.test.mjs tests/storefront.test.mjs tests/catalog.integration.mjs tests/product-preview.browser.mjs tests/seo.integration.mjs
```

Coverage includes selection overlap and small results, listing/card/search
equivalence, browser search limits and sorting, loading all 84 fixture products,
mobile layout, quick view, wishlist persistence and SEO. Browser polling now
waits for sorting to complete and tolerates the brief absence of a document body
during navigation. Mobile hero and search screenshots were visually inspected.

Final reports (outside the repository):

- `/tmp/urbanforge-mobile-optimized.report.html` and `.report.json`
- `/tmp/urbanforge-desktop-optimized.report.html` and `.report.json`

Recheck the deployed URL after publishing; mobile LCP remains the main remaining
opportunity. No deployment was performed in this pass.

---

# Lighthouse follow-up — October 7, 2026

The supplied screenshots showed desktop scores of 85 performance, 100
accessibility, 96 best practices, and 92 SEO at `http://localhost:3000/`.
That server was running Next.js development mode, including devtools and
development React bundles.

## Measurements

Lighthouse 13.5.0, fresh headless Chrome sessions, simulated throttling, local
home page with the existing public catalog. Desktop used the desktop preset;
mobile used Lighthouse's default mobile settings. These are single local lab
runs, not deployed-site or field measurements.

| Run | Performance | Accessibility | Best practices | SEO | LCP | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Development before | 86 | 100 | 96 | 100 | 1.8 s | 190 ms |
| Development after | 84 | 100 | 100 | 100 | 1.8 s | 220 ms |
| Production before | 99 | 100 | 100 | 100 | 0.8 s | 0 ms |
| Production after | 99 | 100 | 100 | 100 | 0.9 s | 20 ms |
| Production mobile after | 90 | 100 | 100 | 100 | 3.6 s | 90 ms |

The desktop production performance score was already 99 before this pass. The
main difference from the screenshot is the build mode, not a claimed 14-point
improvement from the code changes. Small timing differences between runs are
normal; see [Lighthouse scoring and variability](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).
The screenshot's SEO score of 92 was not reproduced: all fresh audits scored 100.

## Changes and evidence

- Fixed a wishlist hydration race in streamed product grids. The account query
  could finish before the grid hydrated, changing the button's disabled state,
  spinner, and saved state from its server HTML. Each button now uses its server
  snapshot during hydration, then displays live account state. The development
  audit reproduced the error before the change and reported no console errors
  afterward; best practices rose from 96 to 100.
- Added `fetchPriority="high"` to priority hero images. Lighthouse's LCP request
  discovery audit now passes.
- Added 800px and 1440px responsive hero variants at the existing quality settings.
  The audited desktop now requests an 800px model image and a 1440px background.
  Their combined payload fell from 158,260 to 122,182 bytes, about 35 KiB (23%).
- Switched browser cart validation to the already-installed `zod/mini` entry
  point, preserving validation rules. Transferred production JavaScript fell
  from 285,483 to 210,419 bytes, about 73 KiB (26%). No dependency was added to
  the project. Expanded persisted-cart validation checks cover malformed values.
- Hero regeneration reuses existing files keyed by source/encoder hashes.

## Verification and artifacts

Production build, TypeScript, ESLint, whitespace checks, cart/storefront unit
checks, and all 11 tests in the following production regression run passed:

```sh
node --test tests/product-preview.browser.mjs tests/checkout.browser.mjs tests/seo.integration.mjs tests/routes.integration.mjs
```

HTML reports and matching JSON files are saved outside the repository:

- `/tmp/urbanforge-lighthouse-dev.report.html`
- `/tmp/urbanforge-lighthouse-dev-after.report.html`
- `/tmp/urbanforge-lighthouse-before.report.html`
- `/tmp/urbanforge-lighthouse-after.report.html`
- `/tmp/urbanforge-lighthouse-mobile.report.html`

For representative local audits, build and start production on a separate port:

```sh
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

The follow-up preview was started on port 3100; the user's development server
on port 3000 was left running. Lighthouse was installed only in
`/tmp/urbanforge-audit-tools/`.

## Remaining work

- Mobile LCP is 3.6 s under simulated throttling. Further mobile-specific image
  cropping and critical rendering work should be measured independently.
- Framework legacy-JavaScript and render-blocking CSS insights remain; the
  production desktop audit estimates roughly 13 KiB and 30 ms respectively.
- Set the actual public HTTPS `SITE_URL` for deployment and rerun against that
  domain. Local SEO scores do not verify production canonical-domain settings.

## Completed follow-up

The separate testimonial-image issue is resolved. All eight existing portraits
now use local, content-hashed WebP assets (124,446 bytes total). The production
build and lint pass, and the full skeleton/loading/feedback browser suite passes,
including decoding all eight portraits and checking image resolution at 2x
pixel density. See `OPTIMIZATION_PROGRESS.md` for regeneration instructions.
