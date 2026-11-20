# Medusa + Supabase default backend

StoreForge now defaults to Medusa for commerce operations and Supabase for server-side persistence, storage, and optional authentication. The integration is implemented in `packages/commerce` and is selected by `templates/integrations/integrations.example.json`.

## Configuration

Copy `templates/integrations/.env.example` to the generated app's server environment and set:

```bash
COMMERCE_PROVIDER=medusa
COMMERCE_BASE_URL=http://localhost:9000
MEDUSA_PUBLISHABLE_KEY=pk_...
MEDUSA_REGION_ID=reg_...
MEDUSA_CURRENCY_CODE=usd
MEDUSA_WEBHOOK_SECRET=...

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=store-assets
```

The Medusa adapter uses the v2 Store API under `/store`, sends `x-publishable-api-key`, and normalizes product, cart, checkout, order, and webhook responses. The Supabase adapter creates a server-only `supabase-js` client with the service-role key for draft catalog and asset operations.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `MEDUSA_WEBHOOK_SECRET` to browser code. Browser-facing code should use Medusa's publishable key and the Supabase anon/publishable key only where the generated app's RLS policies permit it.

## Database setup

Apply `templates/supabase/migrations/0001_storeforge_core.sql` before using `SupabaseStoreRepository`. The migration creates draft-aware store specifications, products, assets, and approval gates with row-level security.

## Build and test

```bash
pnpm install
pnpm --filter @storeforge/commerce build
```

The repository includes mocked HTTP smoke coverage for the Medusa adapter and server-client initialization coverage for Supabase. A live connection requires a running Medusa instance, a Supabase project, the migration, and the environment variables above.

## Boundary

This is the active backend selection and adapter layer, not a claim that a live external account has been provisioned. Payments, tax, shipping, email, refunds, and fulfillment still require their configured provider adapters and approval gates before production use.
