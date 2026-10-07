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
