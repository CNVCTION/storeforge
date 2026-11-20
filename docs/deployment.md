# Deployment templates

StoreForge includes templates for a generated storefront on Vercel with Supabase as the database and storage foundation. These templates are intentionally separate from the provider-neutral core and can be copied into a generated app.

## Vercel

Copy `templates/vercel/vercel.json` into the generated storefront root. The generated app must provide `build` and `dev` scripts. Create a Vercel project from the GitHub repository, select the generated storefront root, and add the variables from `templates/vercel/.env.example`.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe configuration. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be included in client bundles, browser code, or public logs.

## Supabase

Create a Supabase project and apply `templates/supabase/migrations/0001_storeforge_core.sql` through the Supabase CLI or SQL editor. The migration creates draft-aware store specifications, products, assets, and approval gates. It enables row-level security and exposes only published records through the starter public policies.

Copy `templates/supabase/config.toml` for local Supabase CLI work and use `templates/supabase/.env.example` as the secret template. The generated app should use the anon key for public reads and a server-side trusted path for draft mutations.

## Deployment boundary

The templates do not activate payments, calculate taxes, choose shipping rates, or publish a store automatically. A generated storefront must pass StoreForge validation and receive approval for prices, inventory, tax, shipping, payments, policies, and publishing before it is treated as a live commerce site.
