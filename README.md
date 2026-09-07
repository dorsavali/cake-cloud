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

Customer payment receipts are handled by Square's hosted Payment Links checkout.
The customer's email is included in the Square order's pickup recipient details.
No separate email provider is required. The signed Square webhook verifies and
records payment status; it does not send a second email.
