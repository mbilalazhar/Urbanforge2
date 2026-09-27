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
login displays the admin account and logout button there. No navigation link or
admin creation UI is provided. User sessions cannot authenticate admin requests.
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

### Admin store data and database requirements

The admin portal uses the existing `urbanforge_admin_session` cookie. `/api/admin/signup` is an alias for the provisioning endpoint at `/api/admin/create`: both require the server's `ADMIN_PROVISIONING_KEY` in the `x-admin-provisioning-key` header. Public signup cannot create administrators.

Product, inventory, order, coupon, and promotion data are persisted in MongoDB. **Use MongoDB Atlas or a MongoDB replica set**: product stock edits, order creation, inventory audit records, returns, and coupon redemptions use transactions to prevent partial writes and overselling. A standalone MongoDB server returns an explicit configuration error for transaction-dependent writes. The existing `MONGODB_URI` and optional `MONGODB_DB` configure the connection. No example products, revenue, or orders are inserted automatically.

`GET /api/catalog` publishes active managed products and currently effective promotion prices. Once a managed product has been created, the storefront uses managed catalog data, even if every product is later deactivated or deleted. Scheduled promotions take effect from their start timestamp until their end timestamp without a background job. Product view counts record one browser visitor per product per UTC day; they are approximate analytics, not unique verified people.

Manual orders snapshot catalog prices and decrement stock atomically. Optional `couponCode` applies percentage, fixed, or shipping offers with dates, limits, minimum purchases, maximum discounts, product/category eligibility, customer eligibility, and first-order rules enforced by the server. Product/category scopes form a union. A coupon cannot be combined with an additional manual order discount. Successful order creation consumes one redemption; cancellation does not restore that redemption.

Order cancellation restores stock once. Return approval records a decision; setting the order to returned records physical receipt and restores stock once. Refunding a delivered order alone does not imply that goods were returned. Refund actions **record an already completed manual refund** and require an explanatory note; there is no payment provider integration and these actions do not transfer money. Product deletion archives its record so historical order and return records remain valid. SKUs remain reserved after deletion.

The current portal reads complete store records to calculate its dashboard and client-side filters. A larger store should move these queries to paginated lists and server aggregates. Run `npm run build` followed by `node --test tests/admin.integration.mjs` to exercise the commerce APIs against an isolated disposable replica set. Existing authentication coverage remains in `tests/auth.integration.mjs`.
