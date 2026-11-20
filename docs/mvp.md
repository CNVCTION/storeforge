# StoreForge MVP: easiest path

## MVP decision

Use an existing commerce backend and build only the design-to-store layer. Do not build products, carts, orders, customers, payments, inventory, tax, or an admin panel from scratch.

The MVP should be a single repository with:

- a minimal storefront frontend;
- a versioned `store-spec.json` file;
- a design asset folder;
- a JSON Schema validator;
- a CLI that validates and renders the store;
- an optional LLM instruction/skill layer;
- a documented adapter boundary for a later commerce backend.

## Recommended first stack

Use Next.js or another familiar TypeScript web framework for the storefront, Tailwind CSS for styling, Zod or JSON Schema for validation, and a local filesystem asset store. Use static product data at first. Add Medusa or another commerce backend only after the generated storefront feels good.

This deliberately postpones database and payment complexity. The first user-visible proof is: provide design references and product data, run one command, and get a coherent responsive store.

## What the LLM does

The LLM produces or edits these files:

```text
store/store-spec.json
store/products.json
store/assets/*
```

It may infer visual decisions such as palette, typography direction, section ordering, image crops, and tone. It must not invent prices, inventory, tax, shipping, payment configuration, or policies. Inferred values must be marked as inferred and remain in draft status.

Any LLM can participate by editing JSON, calling the CLI, calling a REST endpoint later, or using the optional Manus skill. No model SDK is required for the MVP.

## Minimal user journey

1. Copy a starter repository.
2. Place a logo, moodboard, screenshots, and product images in `store/assets`.
3. Give an LLM the repository instructions and ask it to create or update `store-spec.json` and `products.json`.
4. Run `pnpm validate:store`.
5. Run `pnpm dev` and review the generated storefront.
6. Edit the JSON or ask any LLM to revise it.
7. Deploy the frontend as a static site.

## MVP pages

Support only four page types: home, collection, product, and about. The home page should be composed from a small set of sections: hero, featured products, collection grid, text/image split, and newsletter placeholder.

The product page can be static in the MVP. The “Add to cart” action should either be clearly disabled or link to a configured external checkout placeholder. Do not imply that the MVP has working payments until a real commerce backend is connected.

## Explicitly defer

Defer customer accounts, cart state, checkout, orders, fulfillment, tax calculations, shipping rate calculation, discount codes, subscriptions, search, reviews, analytics, CMS editing, image generation, automated background removal, and multi-provider model routing.

## Phase 2

After the storefront generator works, connect one commerce backend. Prefer one integration only, with catalog synchronization and a single checkout path. Keep the generated design system and storefront renderer independent from that backend so another backend can be added later.

At that point, add a human approval screen for catalog changes and payment activation. The LLM should still output proposed mutations rather than directly applying live commerce changes.

## Success criterion

A nontechnical user can provide reference images and a simple product file, receive a polished draft storefront in minutes, inspect the result locally, and deploy it without creating an account with an AI provider. Live commerce is a separate, explicit upgrade.
