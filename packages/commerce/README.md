# Commerce ports

This package is the boundary between StoreForge and a real commerce backend. Keep interfaces provider-neutral and implement Medusa, Vendure, Saleor, Shopify, or custom adapters outside the core.

The first adapter should cover catalog lookup, cart creation, cart line updates, checkout session creation, order lookup, inventory reads, and webhook verification. Payment, tax, shipping, email, analytics, and monitoring remain separate capability ports so a generated store can use APIs without coupling the storefront to one vendor.

Do not place secret-bearing provider clients in browser code. Do not store raw payment card data. Every payment and order mutation must accept an idempotency key and preserve the upstream event or request ID.
