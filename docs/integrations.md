# Integration map

StoreForge should not reimplement mature commerce infrastructure. The core exposes provider-neutral ports, and generated stores can connect one provider per capability.

## Recommended first integration set

Use Supabase for database, storage, and optional authentication; Vercel for the generated storefront; Stripe Checkout or PayPal Orders v2 and their verified webhooks for payment; Stripe Tax or another tax service for tax calculation; Shippo, EasyPost, or a commerce backend for shipping; Resend or Postmark for transactional email; PostHog for product analytics; Sentry for error monitoring; and a commerce backend such as Medusa, Vendure, or Saleor for catalog, cart, orders, inventory, refunds, and fulfillment orchestration.

These are replaceable defaults, not hard dependencies. The integration manifest records the selected provider and required environment variables without placing provider SDKs in `packages/core`.

## Adapter contract

Every integration should expose a small interface and normalize provider responses:

- input and output types belong in `packages/commerce` or `packages/contracts`;
- provider SDK imports belong in an adapter package;
- secrets are read at runtime, never committed or bundled for the browser;
- webhook handlers verify signatures before parsing business events;
- payment and order mutations use idempotency keys;
- failures return normalized error codes and preserve the provider event ID;
- the MCP server may draft configuration but must not silently activate a live provider.

## Integration order

Implement one path at a time. First connect a commerce backend or a minimal catalog/order service. Then connect payment and webhook handling. Add shipping and tax before live checkout. Add transactional email, auth, analytics, monitoring, and search after the core order path is reliable.

Do not connect multiple providers for the same capability in the first release. A single tested path is safer than a menu of partially implemented APIs.

The repository's `StripePaymentAdapter` and `PayPalPaymentAdapter` provide hosted checkout creation, capture, refunds, idempotency headers, and webhook normalization. Stripe verification uses the raw body and `Stripe-Signature`; PayPal verification calls PayPal's official verification endpoint with the raw event and transmission headers. See [`docs/payments.md`](payments.md) for environment setup and the boundary between adapter readiness and live activation.

## Environment setup

Copy `templates/integrations/.env.example` and set only the capabilities actually enabled. Use `templates/integrations/integrations.example.json` as the non-secret configuration manifest. Keep secret values in Vercel/Supabase secret storage or another secret manager.
