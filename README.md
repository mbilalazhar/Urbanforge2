This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### MongoDB

Copy `.env.example` to `.env.local`, set `MONGODB_URI` to your MongoDB connection
string, and set `MONGODB_DB` to the database name (defaults to `urbanforge`).
The example URI requires a local MongoDB server. Restart the development server
after changing environment variables. Keep real credentials in `.env.local`;
it is excluded from Git.

Use the server-only helper in a Node.js server component, server action, or route
handler when database access is needed:

```ts
import dbConnect from "@/lib/dbconnect";

const db = await dbConnect();
await db.command({ ping: 1 });
```

The helper connects on its first call, reuses the connection pool, and allows a
retry after a failed connection. Do not close the shared client after requests.
See the [MongoDB driver documentation](https://www.mongodb.com/docs/drivers/node/current/connect/).

If pages report `queryTxt ETIMEOUT` or `querySrv ETIMEOUT`, the DNS resolver is
failing to resolve the Atlas connection records. Set `MONGODB_DNS_SERVERS` to
comma-separated DNS server IPs approved for your network, then restart the dev
server. Leave it empty to use system DNS. This setting affects Node's
promise-based DNS resolver throughout the app process; it does not change OS DNS.
Account and admin pages show a retry screen during a database outage and retain
the existing session. Authentication APIs continue to return 503 while storage
is unavailable.

Run `npm run build && node --test tests/routes.integration.mjs` to verify public
pages, footer destinations, redirects, and unavailable-database page recovery.
The test uses no real database.

### Authentication

`models/User.ts` and `models/Admin.ts` use separate MongoDB collections (`users`
and `admins`) with unique normalized email indexes. Passwords use salted scrypt
hashes. Sessions last seven days and use separate HttpOnly cookies for each role
(Secure in production); only token hashes are stored in MongoDB. Logout revokes
the session. Each account supports up to five sessions.

| Method | Endpoint | Body / behavior |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{ "name", "email", "password" }`; creates and signs in a user |
| POST | `/api/auth/login` | `{ "email", "password" }`; signs in a user |
| GET | `/api/auth/session` | Returns `{ "account": ... }` or `{ "account": null }` |
| POST | `/api/auth/logout` | Revokes the user session |
| POST | `/api/admin/create` | `{ "name", "email", "password" }`; requires provisioning header |
| POST | `/api/admin/signup` | Alias for `/api/admin/create`; requires the same provisioning header |
| POST | `/api/admin/login` | `{ "email", "password" }`; signs in an admin |
| GET | `/api/admin/session` | Returns the current admin or null |
| POST | `/api/admin/logout` | Revokes the admin session |

Send JSON request bodies. Names must be 1–100 characters, emails valid and at
most 254 characters, and new passwords 8–128 characters. Validation failures
return 400, invalid credentials 401, duplicate emails 409, and unavailable
storage 503. Login and signup are limited to 10 attempts per normalized email,
role, and action per 15-minute window, backed by the `auth_attempts` collection.

The login/signup forms use TanStack Query mutations, show API errors and pending
states, and take signed-in users to `/account`. That page checks the user session
on the server. Type `/adminroute` manually to sign in as an admin; successful
login opens the admin portal, with dashboard, product, inventory, order, customer,
coupon, and promotion screens. All screens, including Overview, use live MongoDB data through
the authenticated admin APIs. The overview refreshes automatically every 30 seconds and after admin changes. Admin login, signup, sessions, and logout remain real MongoDB-backed
authentication. The storefront navbar and footer are hidden throughout the admin
route. No public navigation link or admin creation UI is provided. User sessions
cannot authenticate admin requests.
For future protected API routes, call `getCurrentAccount("user")` or
`getCurrentAccount("admin")` from `lib/auth/session.ts` and reject a null result.
Password reset and Google/Apple sign-in remain unimplemented.

#### Create an admin through the API

Generate a key with `openssl rand -hex 32`, put it in `ADMIN_PROVISIONING_KEY` in
`.env.local`, then restart the app. The key must contain at least 32 characters.
Keep it on the server and in your API client; never use a `NEXT_PUBLIC_` variable.
If it is unset, admin creation is disabled. This key does not affect admin login.

In an API client, send `POST /api/admin/create` with `Content-Type: application/json`
and `X-Admin-Provisioning-Key: <your configured key>`, using this JSON body:

```json
{
  "name": "Store Admin",
  "email": "admin@example.com",
  "password": "replace-with-a-strong-password"
}
```

A 201 response creates the admin without signing the API caller in. Use that
email and password on `/adminroute`. Production cookies require HTTPS.

#### Authentication tests

Run `npm run test:auth`. The suite builds the app and starts an isolated MongoDB
server and app process to test validation, duplicate accounts, password hashing,
login, role separation, session expiration/revocation, rate limits, and protected
pages. It never uses your configured database. The first run downloads a MongoDB
binary into `/tmp/urbanforge-mongodb-binaries` and requires network access.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Admin products and commerce APIs

The admin portal uses the existing `urbanforge_admin_session` cookie. `/api/admin/signup` is an alias for the provisioning endpoint at `/api/admin/create`: both require the server's `ADMIN_PROVISIONING_KEY` in the `x-admin-provisioning-key` header. Public signup cannot create administrators.

Every admin screen uses the authenticated commerce APIs. The overview loads `GET /api/admin/dashboard`, including server-calculated revenue periods, 12-month charts, category sales, bestsellers, customer growth, order counts, recent records, product views, and variant-aware inventory totals. It refreshes every 30 seconds, on window focus, after admin mutations, or with Refresh. Revenue uses paid order totals grouped by order date in Pakistan Standard Time and excludes cancelled, returned and refunded orders. Archived products are excluded from catalog/inventory counts while retaining their historical sales categories. Empty databases display zeros and empty states; API failures show a retry control. No preview data is used by the portal. Customers lists every registered website user, including users with no orders, plus guest order contacts. It shows saved contact/address details, join date, last order, order count and paid spending; passwords and sessions are never returned. The homepage, category listings, search, and product detail pages display active products from the public catalog APIs. No sample commerce records are inserted into MongoDB.

The product, inventory, order, coupon, and promotion APIs persist data in MongoDB. **Use MongoDB Atlas or a MongoDB replica set for these commerce APIs**: product stock edits, order creation, inventory audit records, returns, and coupon redemptions use transactions to prevent partial writes and overselling. A standalone MongoDB server returns an explicit configuration error for transaction-dependent writes. The existing `MONGODB_URI` and optional `MONGODB_DB` configure the connection. Read-only overview and authentication requests do not require a replica set.

`GET /api/catalog` powers storefront listings and returns active managed products with effective promotion prices. Its `managed` flag indicates whether any managed product has been created, including products later deactivated or archived. There is no sample-product fallback when the catalog is empty or unavailable. Scheduled promotions take effect from their start timestamp until their end timestamp without a background job. Product view counts record one browser visitor per product per UTC day; they are approximate analytics, not unique verified people.

Orders created through the prepared API snapshot catalog prices and decrement stock atomically. Optional `couponCode` applies percentage, fixed, or shipping offers with dates, limits, minimum purchases, maximum discounts, main-category eligibility, customer eligibility, and first-order rules enforced by the server. Coupons and promo codes share the checkout code field. Offers apply to the entire store (`categories: []`) or a combination of canonical main categories: Women, Men, Kids, Accessories, Shoes, and Brands. All subcategories and future products within those categories are included. Individual product IDs and subcategory names are rejected on create/update. Sales use the same scope, apply automatically in catalog, wishlist, quotes and orders, and use the lowest price when offers overlap. One eligible code can also apply to sale prices. Legacy product-specific offers cannot apply until their scope is explicitly edited; they are flagged in the admin list. A coupon cannot be combined with an additional manual order discount. Successful order creation consumes one redemption; cancellation does not restore that redemption.

Admins can save any later fulfilment stage directly (for example, New → Delivered). The order form and API share the allowed transitions in `lib/admin/order-workflow.ts`; terminal orders cannot be reactivated, returns require approval, and paid payments cannot revert to pending. Saving Paid immediately includes eligible orders in the customer’s total spent, and admin mutations invalidate the customer directory cache. Cancelled, returned and refunded orders remain excluded.

Order cancellation restores stock once. Return approval records a decision; setting the order to returned records physical receipt and restores stock once. Refunding a delivered order alone does not imply that goods were returned. Refund actions **record an already completed manual refund** and require an explanatory note; there is no payment provider integration and these actions do not transfer money. Product deletion archives its record so historical order and return records remain valid. SKUs remain reserved after deletion.

The dashboard/list APIs return complete store records. Before connecting a larger store, move these queries to paginated lists and server aggregates. Run `npm run build` followed by `node --test tests/admin.integration.mjs` to exercise the commerce APIs against an isolated disposable replica set. Existing authentication coverage remains in `tests/auth.integration.mjs`.

Run `npm run build` followed by `node --test tests/admin.integration.mjs tests/checkout.integration.mjs tests/admin-offers.browser.mjs tests/admin-orders.browser.mjs` for customer details, main-category eligibility, offer persistence, checkout pricing, and browser form coverage (Chrome is required for the browser test).

Run `npm run test:admin-preview` for checks of the legacy sample-data helper, which is retained only for explicit preview callers and tests. The admin client defaults to the live API. Run `node --test tests/admin-analytics.test.mjs` for empty-state and Pakistan-date analytics checks.

### Creating products

Sign in at `/adminroute`, open **Products**, and choose **Add product**. The form
saves all editable product fields, including descriptions, category, subcategory,
product type, brand, gender, prices, SKU, colors, sizes, material, stock, tags,
visibility flags, SEO fields, and variants. IDs, timestamps, and views are generated
by the server. Edits, duplication, and deletion in this screen also persist.

`POST /api/admin/products` requires an admin session and accepts either JSON or
`multipart/form-data`. For multipart requests, send a single `data` field containing
the product JSON and repeated `images` / `videos` file fields. Do not manually set
the Content-Type header when using browser FormData. `PATCH /api/admin/products/:id`
supports the same formats; omitted fields stay unchanged. New files append to the
image/video URL arrays in `data`; include existing URLs when retaining media.

Example `data` (attach at least one image file when `images` is empty):

```json
{
  "name": "Everyday tee",
  "sku": "UF-TEE-001",
  "category": "Men",
  "subcategory": "Tops",
  "productType": "T-Shirts",
  "price": 2000,
  "stock": 10,
  "status": "active",
  "images": [],
  "videos": []
}
```

Every product needs at least one image (uploaded file or existing URL/path);
videos are optional. Uploads accept JPEG, PNG, WebP, and GIF images up to 10 MB
each, and MP4, WebM, and MOV videos up to 50 MB each. Limits are 30 images,
10 videos, and 100 MB of uploaded files per request. Configure your hosting/proxy
request-size limits accordingly. File signatures are checked against MIME types.

Media is stored in MongoDB GridFS (`product_media.files` / `product_media.chunks`)
and served through `GET /api/media/:id`, including byte ranges for video playback.
New uploads are removed if product saving fails. Media URLs are public; successfully
saved assets are retained when removed from a product or when a product is archived,
so copied products and historical references keep working.

Fixed choices live in `lib/product-categories.ts`, shared by the form and server.
Category/subcategory/product-type combinations are validated on create and update.
For Brands, select a department and enter the brand name; no brand list was supplied.
Existing records with legacy free-text categories need valid selections on their
next edit. Product writes require MongoDB Atlas or a replica set for transactions.

Run `npm run test:admin` for creation, upload, media retrieval, validation, cleanup,
SKU conflicts, variant stock, and other commerce API integration coverage.

### User profiles and saved addresses

The `/account` page loads the signed-in user's MongoDB profile. Name, optional
contact number, delivery address, and notification preferences are persisted.
The Payment Methods section has been removed; no payment details are stored.

User documents include `contact: ""`, `defaultAddress: null`, `currentOrderIds: []`,
`pastOrderIds: []`, and `preferences: { orders: true, news: false }` when created.
Existing users receive missing defaults on sign-in or an authenticated session
lookup, preserving saved fields. Signing in again does not clear contact details.

- `GET /api/account/profile` returns the current user's profile, including the
  saved address and order references, without passwords or session tokens.
- `PATCH /api/account/profile` accepts any subset of `name`, `contact`,
  `defaultAddress`, and `preferences`. The user ID comes from the session.
  Email, roles, order references, and other protected fields cannot be edited here.
- `defaultAddress` contains `recipient`, `contact`, `line1`, optional `line2`,
  `city`, `region`, optional `postalCode`, and `country`. Send `null` to remove it.
- `currentOrderIds` and `pastOrderIds` are maintained by checkout and admin order
  status updates. Account order history uses `GET /api/orders`, scoped to the
  signed-in user. New accounts show one shared empty state.

The Addresses tab starts with an empty state and offers a form to save, edit,
or remove the default delivery address. Checkout prefills these saved details and can save a new default address. Wishlist items are stored per user in MongoDB.
Run `npm run test:auth` for profile validation, persistence, role and user isolation,
legacy defaults, and account-page coverage.

The root body uses `suppressHydrationWarning` only on that element to accommodate
browser extensions (such as Grammarly) adding attributes before hydration.
Descendant hydration checks remain enabled.


### Storefront product pages

Product cards link to `/products/:id`. `GET /api/catalog/:id` returns the active
product and up to six active products in the same category, with current promotion
prices. Missing, inactive, and archived products return 404. Product pages include
metadata, image/video galleries, image zoom, color and size choices, stock-aware
quantities, product descriptions/specifications, and related products. Reviews
and shipping/return information have honest empty states until implemented.

The homepage, category listings, and search use `/api/catalog` with loading,
error/retry, and empty states. Product cards open a live details modal after a
700 ms mouse hover; leaving the card, scrolling, or clicking cancels the timer.
The Quick View button opens the same modal for keyboard and touch users. Card
clicks still navigate to the full product page. The modal uses real descriptions,
prices, variants, stock limits, and the persisted cart. Uploaded and external product images are
rendered without requiring Next.js remote image host configuration.

Add to Cart stores the selected live product/variant in the guest or signed-in account's
Zustand cart, uses PKR prices, and caps quantities at available stock. Each signed-in
account restores its own cart from local storage. Buy Now opens `/checkout` with only the selected item and does not add it to the cart.
Cart checkout uses all current cart items. Checkout revalidates prices and stock on the server. Run `node --test tests/storefront.test.mjs` for
catalog-card and cart logic checks; public product API and page coverage is included
in `npm run test:admin`.


### Live inventory

Open **Inventory** in `/adminroute` to view saved product/variant SKUs, stock totals,
low stock (1–5 units), and out-of-stock counts. Search, stock filters, and SKU
pagination use live product data. Stock and history refresh every 30 seconds,
on window focus, after successful changes, or with **Refresh**.

All inventory endpoints require an admin session:

| Route | Behavior |
| --- | --- |
| `GET /api/admin/inventory?includeHistory=false` | Non-archived products and `summary` (`units`, `trackedSkus`, `lowStockSkus`, `outOfStockSkus`). Omitting `includeHistory` also returns the full legacy movement list. |
| `POST /api/admin/inventory` | Atomically adjust stock and append an audit entry. |
| `GET /api/admin/inventory/movements` | Paginated history with optional `type`, `productId`, and literal `search`; `page` defaults to 1 and `limit` to 15 (maximum 100). Returns movements, product filter options, total, page, pages, and limit. |

Adjustments accept `productId`, `variantId` (required for variant products),
`type` (`added`, `sold`, `returned`, `adjustment`), signed non-zero integer
`quantity`, and a required `reason`. Added/returned quantities are positive;
sold quantities are negative; adjustments accept either sign. Optional
`expectedStock` protects against stale edits; the UI always sends it. A mismatch
returns 409 and the UI refreshes stock for review. Stock cannot become negative
or exceed 1,000,000 units per SKU.

History preserves product names and SKU/variant snapshots for new movements,
including archived products and removed variants. Older records fall back to
available product details. History cannot be edited or deleted from this page.
Successful live changes refresh both admin and public catalog query caches.


### Account-specific carts

Zustand persists cart items under `urbanforge:cart:v1:user:<accountId>` using the
ID from the authenticated user session. Product ID, variant ID, name, image,
selected options, price in paisa, quantity, and the last known stock limit are
saved. Logging out hides the cart without deleting it; logging into another
account opens that account's separate cart. Signing back into the original
account on the same browser restores its items. Signed-out users can add products
immediately; their cart persists separately under `urbanforge:cart:v1:guest`.
Login or signup merges those guest selections into the account cart, combining
matching quantities within stock limits and keeping distinct variants separate.
The guest cart is cleared after the merged cart is saved, so it cannot be imported
into another account or counted twice. Logout starts a fresh guest cart and keeps
the signed-out account's saved items private. Confirmed sessions also complete a
pending guest merge on page load. Web Locks serialize merges across browser tabs;
when unavailable, an in-tab queue serializes repeated merge requests.

Persistence hydrates after mount to avoid server/client markup mismatches.
Authentication changes notify other tabs to recheck their shared session;
same-account cart changes also synchronize across tabs. Invalid stored items are
ignored, and unavailable storage falls back to an in-memory cart. Storage is local
to the browser, not a cross-device or encrypted account database; checkout revalidates prices and stock on the server before saving an order.

Run `node --test tests/cart-store.test.mjs tests/storefront.test.mjs` for account
isolation, reload restoration, quantity limits, mutations, storage synchronization,
and malformed/blocked storage coverage.


Run `npm run build` followed by `node --test tests/product-preview.browser.mjs`
to check the delayed hover, cancellation, live options, cart persistence, keyboard
close/focus, and product-page navigation in Chrome against a disposable database.
Set `CHROME_PATH` if Chrome is not installed at `/usr/bin/google-chrome`; this
browser test skips when the executable is unavailable.


### Saved wishlists

`/wishlist` and the account's Wishlist tab show the signed-in user's saved
products. Hearts on product cards and product pages add or remove products using
the same wishlist. Guests see an account-creation modal with **Create your
account** linking to `/account`. No guest wishlist is stored.

- `GET /api/wishlist`: returns the current user's product references and visible
  catalog products with current promotion pricing.
- `POST /api/wishlist`: accepts `{ "productId": "..." }`; atomically adds a unique
  reference to `users.wishlistProductIds`.
- `DELETE /api/wishlist/:productId`: removes that reference, including references
  to products that have since become unavailable.

All endpoints require a user session. The server obtains the user ID from that
session; client-supplied account IDs cannot change ownership. Wishlist writes
persist in MongoDB and work across devices. Browser caches are scoped by account;
other tabs refresh on wishlist changes. Archived/inactive products are not exposed,
and unavailable saved entries can still be removed. Profile edits cannot replace
wishlist references. Existing accounts initialize an empty list automatically.

Wishlist data loads only while a product heart or wishlist view is mounted. The
shared query is cached for five minutes and does not refetch when switching
browser tabs. Successful saves update the cache immediately; storage events
still synchronize wishlist changes across tabs. The provider is limited to the
storefront and account layouts, so the admin panel never fetches wishlists.
Desktop and mobile navigation no longer contain a wishlist link; customers can
still use product hearts and the Wishlist tab in My Account.

### Store policy pages

`/privacy-policy`, `/terms`, and `/cookie-policy` are static frontend pages using
a shared responsive policy layout. Footer links, policy navigation, section
anchors and email links connect them to the store. No policy API, consent banner
or cookie-settings backend is added. Text lives in
`components/policies/policy-data.ts`.

Run `npm run build` followed by
`node --test tests/product-preview.browser.mjs tests/auth.integration.mjs` to
check wishlist persistence, tab-focus request counts, policy navigation, mobile
layout, and navbar removal with an isolated database and Chrome.



## Customer checkout and orders

`/checkout` presents contact information, a delivery address, shipping choices,
and a live order summary on desktop and mobile. Signed-in accounts prefill name,
email, phone, street/apartment, city, province, postal code, and country from their
profile/default address. Missing information stays blank. Guests can check out
without an account; their orders are not assigned to an account by email alone.
Signed-in shoppers can explicitly save the entered address as their default.

- `POST /api/checkout/quote`: accepts `items` (`productId`, optional `variantId`,
  `color`, `size`, and `quantity`), `deliveryMethod`, optional `couponCode`, and
  `email` for coupon eligibility. Returns server-calculated line items, totals,
  shipping, discounts, and a `quoteToken`. Quoting does not redeem a coupon.
- `POST /api/orders`: accepts the same selections plus `contact` (`name`, `email`,
  `phone`), `address` (`line1`, `apartment`, `city`, `province`, `postalCode`,
  `country`, `type`), `saveAddress`, `paymentMethod: "cod"`, `quoteToken`, a UUID
  `requestId`, and `accountId` (session ID or null for guests). The latter guards
  against account switching; ownership always comes from the authenticated session.
- `GET /api/orders`: requires a user session and returns only that account's
  orders. Customers cannot set order/payment status, ownership, prices, or totals.

Prices use PKR (the cart alone stores paisa). Shipping is configured in
`lib/checkout/types.ts`: standard Rs. 250, free from Rs. 5,000; express Rs. 500.
Cash on delivery is the supported payment method; orders start as `new` with
payment `pending`. No payment gateway or payment collection is implemented.

Orders are inserted into the existing `admin_orders` collection in the same MongoDB
transaction as inventory deduction, stock audit records, coupon redemption, and
user order references/default-address changes. Use Atlas or a MongoDB replica set.
Retries of the same request are idempotent. Changed prices or insufficient stock
produce an error for review instead of silently changing the payable amount.
The confirmation modal appears only after a saved order response. Successful cart
checkout consumes the submitted quantities; Buy Now leaves the cart untouched.
Admin Orders now uses the real APIs, including fulfilment, invoices, and returns.
Completed/cancelled/returned/refunded orders move to the user's past references.

Checks: `npm run build`, then
`node --test tests/checkout.integration.mjs tests/cart-store.test.mjs`.
`node --test tests/checkout.browser.mjs` uses a local Chrome and an isolated MongoDB
replica set to verify cart checkout, Buy Now, saved details, failure/retry recovery,
account history, and desktop/mobile layout. Set `CHROME_PATH` if needed.
