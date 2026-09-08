# Cake Cloud

Cake Cloud is organized as an npm workspaces monorepo:

- `website`: the Next.js frontend
- `api`: the TypeScript backend API

## Getting started

Install all workspace dependencies from the repository root:

```bash
npm install
```

Run either application in development:

```bash
npm run dev:website
npm run dev:api
```

The website and API run together in Cloudflare Workers. API routes live under `/api/*`, with a health check at `GET /api/health`.

Build both workspaces from the repository root:

```bash
npm run build
```

Deploy the static website to Cloudflare Workers:

```bash
npm run deploy
```

## Square Sandbox on Cloudflare

The root `.env` is used by the local Node API; its values are not uploaded to Workers.
The deployed environment, shop timezone, and return URL are configured in `wrangler.jsonc`.
Set `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` on the `cake-cloud` Worker using
credentials from the same Square Sandbox account. Both are required for checkout.
Keep the other required Square secrets configured as well.

```bash
npx wrangler secret put SQUARE_ACCESS_TOKEN
npx wrangler secret put SQUARE_LOCATION_ID
npm run build
npm run deploy
```

Enter each value at the secret prompt; do not commit credentials to the repository.

## Payment receipts

Form drafts (cake options, date/time, contact fields, and current step) are saved
in per-tab sessionStorage and restored after refresh. A pending checkout request
retains its idempotency key for retry. Prices and availability are fetched again
from the backend; no paid status or receipt authorization is trusted from storage.
Draft storage failures do not block the form. Verified payment clears the draft.
There is no draft cookie or backend session store to configure.

The backend saves a signed return URL on the Square payment link before allowing
the buyer to open checkout. The result page passes its read-only signed link to
the backend, which retrieves and verifies the persistent Square order and payment.
No localStorage, cookies, or in-memory order mapping is required. The token lives
in the URL fragment so it is not included in HTTP referrers. Keep the full return
link private. Links created before this change cannot recover missing browser
data; check those payments in Square rather than asking the buyer to pay again.
No new Worker bindings or secrets are needed. Build and deploy both workspaces.
Square API reference: https://developer.squareup.com/reference/square/checkout-api/update-payment-link

Customer payment receipts are handled by Square's hosted Payment Links checkout.
The customer's email is included in the Square order's pickup recipient details.
The backend trims and validates the submitted email before sending it to Square.
Square prepopulates the checkout contact details from `pickup_details.recipient`;
the buyer can change their contact details on Square's hosted page.
No separate email provider is required. The signed Square webhook verifies and
records payment status; it does not send a second email.
Square Sandbox does not generate receipts or send real emails. Delivery must be
verified separately in production; the current integration remains Sandbox-only.
References:
https://developer.squareup.com/forums/t/checkouts-create-payment-link-pre-populated-data-fullfillments/19425
https://developer.squareup.com/docs/devtools/sandbox/overview
