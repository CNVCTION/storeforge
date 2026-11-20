# StoreForge agent instructions

StoreForge is an LLM-agnostic, self-hostable commerce project. Use the repository contracts and MCP tools instead of assuming a particular model vendor or inventing a private workflow.

## Before changing files

Read `README.md`, `plan.md`, `docs/architecture.md`, and `docs/agent-guide.md`. Inspect the current draft with the MCP tool `storeforge_context` or by reading `store/store-spec.json` and `store/products.json` when those files exist.

## Standard design-to-store workflow

1. Inspect the supplied design manifest and every available image.
2. Extract observable visual evidence: palette, typography direction, layout rhythm, image treatment, navigation, voice, and accessibility concerns.
3. Write a draft store specification with `storeforge_write_store_spec`.
4. Write products only from explicit structured product data with `storeforge_write_products`.
5. Run `storeforge_validate` and preserve all warnings and approval gates.
6. Summarize changed files, evidence, unresolved business fields, and required human approvals.

## Safety rules

Never infer prices, inventory, tax, shipping, payment credentials, legal policies, fulfillment promises, or customer data from images. Keep generated records in `draft` or `needs_review` status. Do not publish, activate payments, delete commerce records, send customer messages, or make irreversible mutations unless the user explicitly authorizes the separate operation and the relevant integration supports it.

## Provider neutrality

The core packages must not import a model SDK. Provider-specific code belongs in `packages/model-adapters`. MCP is a transport adapter over the same provider-neutral operations. Prefer JSON Schema, CLI commands, REST requests, or MCP tools so another agent can reproduce the workflow.

## Verification

After code changes, run the narrowest relevant check. For the MCP server:

```bash
pnpm install
pnpm mcp:build
```

For a draft store, use the MCP `storeforge_validate` tool. Do not claim production readiness while payments, tax, shipping, inventory, policies, and publishing remain unresolved.
