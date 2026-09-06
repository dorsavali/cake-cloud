# Square-hosted Sandbox checkout

The Payment step collects only full name and email, then redirects to Square.
Card data is entered on Square, never in Cake Cloud.

## Local setup
Run from the repository root in two terminals:
- npm run dev:api
- npm run dev:website

Root .env must contain SQUARE_ENVIRONMENT=sandbox, SQUARE_ACCESS_TOKEN,
SQUARE_LOCATION_ID and SQUARE_TIMEZONE=Australia/Perth.
The current local Sandbox location has already been configured.
For Wrangler use .dev.vars; hosted Workers need the same settings/secrets.

## Behavior
POST /api/cake/checkout validates cake choices, computes the AUD total on the
server, rechecks pickup lead time in Perth, and calls CreatePaymentLink.
Expected total from the browser is only a mismatch guard.
The same request key is reused after network errors.
Square holds the itemized order, name, email and pickup details.
No card SDK or card-input fields are installed in this website.
This implementation refuses production credentials.
Square returns to the site for server-verified payment confirmation.

## Testing
npm run build -w @cake-cloud/api
node --test api/tests/*.test.mjs

Square Sandbox links currently open the Checkout API Sandbox Testing Panel.
Use Next / Test Payment to simulate checkout; Preview Link previews the buyer page.
This is Square's Sandbox UI, not a website error.

Before any production rollout, add a lifecycle
for expiring unpaid links: lead time is validated when the link is created, but
Square-hosted links are not automatically expired by this implementation.
Confirm final menu prices and tax treatment before live charging.

https://developer.squareup.com/docs/checkout-api

## Automatic payment verification
The existing /api/webhooks/square endpoint also handles payment.created,
payment.updated, refund.created and refund.updated. Its configured subscription
already includes these events; no second webhook is needed.
Only valid HMAC signatures are accepted. The server then retrieves the current
payment and order from Square; webhook body status and browser claims are ignored.
A completed payment must match order ID, location, signed expected amount, currency
and reference. Refunds and mismatches never show a paid confirmation.

Authoritative expectations and verification status are stored in Square order
metadata (cc_expected, cc_signature, cc_status, cc_payment, cc_checked).
No database or in-memory-only payment ledger is used.
Unrelated/legacy orders without signed checkout metadata are not auto-confirmed.
Verification failures return HTTP 503 and are not deduplicated, allowing retries.

Checkout redirects to /custom-cakes/payment-result/?checkout=... on WEBSITE_ORIGIN.
The browser stores only order ID and a server-signed receipt token locally.
The result page checks /api/cake/payment-status immediately and polls pending
payments up to one minute; the manual retry button remains available.
Payment success is never inferred from redirect parameters.
Use the same browser for checkout and return; missing local receipt details fail closed.

Local .env now has the existing webhook URL and its retrieved signature key.
For the deployed Worker, deploy the new code and ensure WEBSITE_ORIGIN is the
actual HTTPS site origin, and SQUARE_WEBHOOK_NOTIFICATION_URL exactly matches
the existing subscribed public URL. Keep the signature key server-only.
Production payment creation remains disabled.

