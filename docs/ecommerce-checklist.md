# E-commerce fundamentals checklist

This is the minimum checklist for a credible online store. Each item is marked by the current StoreForge state: **present**, **scaffolded**, **provider slot**, or **not yet implemented**.

## 1. Storefront and brand

- [x] Responsive storefront contract driven by `StoreSpec` — scaffolded.
- [x] Brand assets, design references, theme tokens, homepage sections — present through MCP draft tools and JSON examples.
- [ ] Finished customer-facing storefront renderer — not yet implemented.
- [ ] Mobile, tablet, and desktop layout QA — not yet implemented.
- [ ] Accessible navigation, focus states, contrast, labels, and keyboard checkout — checklist item; renderer must implement it.
- [ ] Favicon, social preview image, metadata, canonical URLs, sitemap, and robots — not yet implemented.

## 2. Catalog

- [x] Product draft contract with IDs, names, descriptions, prices, inventory, images, and collections — present.
- [x] Product and collection asset references — present.
- [x] Human approval boundary for price and inventory — present.
- [ ] Product variants such as size, color, and SKU — needs commerce schema expansion.
- [ ] Product options, bundles, digital files, downloadable fulfillment, and subscriptions — provider-specific or future scope.
- [ ] Catalog import/export and bulk editing — not yet implemented.
- [ ] Product SEO fields, structured data, and merchant feeds — not yet implemented.

## 3. Cart and checkout

- [ ] Cart creation, line items, quantity changes, persistence, and abandoned-cart behavior — not yet implemented.
- [ ] Guest checkout — provider slot.
- [ ] Customer accounts and order history — Supabase Auth or commerce backend slot.
- [ ] Address collection and validation — provider slot.
- [ ] Shipping method selection and rates — shipping API slot.
- [ ] Tax calculation and tax-inclusive/exclusive display — tax API slot.
- [ ] Discount codes, gift cards, and store credit — commerce backend slot.
- [x] Hosted payment checkout, authorization, capture, and refunds — Stripe Checkout and PayPal Orders adapters are implemented; credentials and provider setup are still required.
- [x] Gateway request idempotency — Stripe and PayPal adapter methods accept stable idempotency keys; checkout service persistence and retry policy remain required.
- [ ] Checkout confirmation and receipt — payment/email integration slot.

## 4. Orders and operations

- [ ] Order creation from a verified payment event — not yet implemented.
- [ ] Order statuses and state transitions — commerce backend slot.
- [ ] Inventory reservation, decrement, and restock — commerce backend slot.
- [ ] Fulfillment, shipment tracking, and partial fulfillment — fulfillment/shipping API slot.
- [ ] Cancellations, refunds, exchanges, returns, and chargebacks — payment/commerce backend slot.
- [ ] Admin order lookup and manual intervention — admin app not yet implemented.
- [x] Gateway webhook signature verification and event normalization — Stripe raw-body HMAC and PayPal official verification adapter methods are implemented; endpoint ingestion, durable deduplication, retries, and replay protection remain required.

## 5. Customer communication

- [ ] Order confirmation email — transactional email API slot.
- [ ] Payment failure, shipment, delivery, refund, and password-reset email — transactional email API slot.
- [ ] Contact form or support handoff — email/helpdesk API slot.
- [ ] Consent-aware marketing signup — email marketing API slot.
- [ ] Email templates and localization — not yet implemented.

## 6. Legal, privacy, and trust

- [ ] Terms of service, privacy policy, refund policy, shipping policy, and contact details — business-provided content required.
- [ ] Consent and cookie preferences where required — not yet implemented.
- [ ] Customer data export and deletion workflow — auth/data layer slot.
- [ ] Payment data isolation — use hosted checkout/tokenization; never store raw card data.
- [ ] Secrets management, least privilege, audit log, and key rotation — deployment requirement.
- [ ] Age, regional, product, and sanctions restrictions where applicable — business-specific rules required.

## 7. Analytics and reliability

- [ ] Privacy-aware analytics and conversion events — analytics provider slot.
- [ ] Error monitoring and alerting — monitoring provider slot.
- [ ] Structured application logs and correlation IDs — not yet implemented.
- [ ] Database backups, restore test, and media backup — Supabase/storage operations required.
- [ ] Health endpoint and deployment smoke test — not yet implemented.
- [ ] Rate limiting, bot protection, and abuse controls — runtime/provider slot.
- [ ] Performance budgets, image optimization, caching, and CDN behavior — storefront implementation required.

## 8. Integrations already prepared

The repository now includes provider-neutral slots for a commerce backend, payments, shipping, tax, transactional email, authentication, analytics, monitoring, search, object storage, and support. See `docs/integrations.md`, `templates/integrations/integrations.example.json`, and `templates/integrations/.env.example`.

The Supabase template already provides draft-aware store specifications, products, assets, and approval gates. The Vercel template provides the generated storefront deployment boundary.

## Release gates

A store should not be called ready for live sales until the following are all true:

1. A real storefront renders the approved `StoreSpec` and is accessible on supported devices.
2. A commerce backend owns catalog, cart, checkout, orders, inventory, and customer/order state.
3. Payment webhooks are verified and idempotent.
4. Tax and shipping behavior is configured for the seller's jurisdictions.
5. Transactional email, refund, return, and support flows are tested.
6. Legal pages and customer-facing policies are present.
7. Backups, monitoring, rate limits, secrets, and a rollback path are configured.
8. A human approves prices, inventory, policies, payments, and publishing.
