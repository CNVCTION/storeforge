# Vercel template

Copy `vercel.json` into the generated storefront root, or use this directory as the starting point for a Next.js storefront generated from `store/store-spec.json`.

Configure the project in Vercel with the repository root as the project root. Add the variables in `.env.example` through Vercel Project Settings. Only `NEXT_PUBLIC_*` values may be exposed to browser code. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

The template assumes the generated storefront exposes `build` and `dev` scripts. The current StoreForge scaffold is not itself a finished storefront, so deployment becomes live after a generated app is placed in the project root.
