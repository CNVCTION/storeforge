# StoreForge payment adapters

StoreForge keeps payment providers behind the provider-neutral `PaymentPort`. The repository includes hosted-checkout adapters for Stripe Checkout Sessions and PayPal Orders v2. The core application never receives raw card data.

`Money.amount` is an integer in the currency's minor unit, matching the existing Medusa adapter. Stripe receives that integer directly; PayPal receives the equivalent decimal major-unit string.

## Adapter capabilities

`StripePaymentAdapter` creates a hosted Checkout Session with one-time line items, success and cancel URLs, an order reference, metadata, and an idempotency key. It can capture a PaymentIntent, refund by PaymentIntent, and verify raw-body webhook requests with the `Stripe-Signature` header and `STRIPE_WEBHOOK_SECRET`.

`PayPalPaymentAdapter` obtains and caches an OAuth client-credentials token, creates a PayPal Orders v2 order, returns the payer approval URL, captures an approved order, refunds a captured payment, and verifies webhook requests through PayPal's `verify-webhook-signature` endpoint. Its `signature` argument is a JSON object containing the PayPal transmission headers, while `rawBody` must be the unmodified request body.

Both adapters normalize verified webhook payloads to `{ id, type, receivedAt, payload }`. The application should map provider event types to order transitions idempotently. Examples include Stripe `checkout.session.completed`, `payment_intent.succeeded`, and `refund.created`, plus PayPal `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, and `PAYMENT.CAPTURE.REFUNDED`.

## Configuration

The safe starting point is:

```dotenv
PAYMENTS_PROVIDER=disabled
PAYMENTS_LIVE_ENABLED=false

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

Select `stripe` or `paypal` only after credentials have been provisioned, the webhook endpoint is deployed over HTTPS, and the store has been tested in the provider's test/sandbox environment. Set `PAYMENTS_LIVE_ENABLED=true` only as an explicit production release decision. This repository does not provision merchant accounts, create live products, or perform a live charge.

For Stripe, register a webhook endpoint and store its endpoint secret in `STRIPE_WEBHOOK_SECRET`. Pass the exact raw request bytes/string to `verifyWebhook`; parsing and re-serializing JSON before verification can invalidate the signature. For PayPal, register the webhook and store its webhook ID in `PAYPAL_WEBHOOK_ID`. Forward PayPal's `PAYPAL-TRANSMISSION-*` headers as the adapter's serialized signature argument and pass the exact raw body.

## Checkout and idempotency

Create a checkout only after the server has calculated the authoritative order total. Never trust a client-supplied amount. Use a stable idempotency key for retries of the same logical operation. Persist the returned provider session/order ID against the StoreForge order before redirecting the shopper. Capture and refund operations should also use stable keys and be safe to retry after a timeout.

A hosted checkout URL is not proof of payment. Mark an order paid only after a verified provider webhook or a server-side provider response confirms completion. Webhook handlers must deduplicate by provider event ID and should return a successful response after durable persistence, not after a client redirect.

## Source references

The adapter behavior follows the official API contracts for [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [Stripe webhook signatures](https://docs.stripe.com/webhooks), [PayPal standard checkout Orders v2](https://developer.paypal.com/api/rest/integration/orders-api/api-use-cases/standard), and [PayPal webhook event names](https://developer.paypal.com/api/rest/webhooks/event-names/).
