---
name: ai-storefront-builder
description: Build, configure, analyze, and validate StoreForge storefronts from design images and structured commerce data. Use for any LLM-assisted storefront task in a StoreForge repository; this skill is an optional Manus adapter and must use the repository's provider-neutral CLI, contracts, and approval gates.
---

# AI Storefront Builder

Use StoreForge's provider-neutral command contracts. Do not make Manus APIs a requirement of the repository or write provider-specific logic into the core packages.

## Operating rules

- Inspect the repository README and `plan.md` before changing architecture.
- Treat images as design evidence, not as authoritative business data.
- Create draft artifacts first; do not publish, activate payments, change prices, assert inventory, or invent shipping/tax rules without explicit human approval.
- Prefer the CLI and JSON contracts so the same operation can be reproduced by another LLM, an HTTP client, an MCP client, or a filesystem workflow.
- Preserve source asset references and write warnings when the input is ambiguous.
- Keep model/provider details in adapters. Never import a model SDK into `packages/core`.

## Standard workflow

1. Inspect the request, repository state, and available assets.
2. Run or emulate `analyze_design` and save a versioned `DesignAnalysis` artifact.
3. Convert the analysis into a `BrandSpec`; mark inferred values as inferred and cite the source asset.
4. Generate a draft `StoreSpec` for the storefront renderer.
5. Import products only from supplied structured data or clearly labeled product assets. Leave unknown price, inventory, fulfillment, tax, and policy fields unresolved.
6. Run validation and present approval gates.
7. Apply approved changes through the command bus, not by directly mutating production data.
8. Run a final validation and report artifacts, warnings, and unapproved gates.

## Supported interfaces

The preferred commands are:

```bash
storeforge analyze-design --input examples/design-request.json
storeforge generate-store --input examples/store-request.json
storeforge validate-store --input examples/store-spec.json
```

If the CLI is not available, use the HTTP API or the repository's filesystem request mode. MCP is an optional transport and must call the same operations.

## Output requirements

Every response should identify the operation ID, schema version, artifact paths, warnings, confidence, and approval status. Never claim a store is production-ready when checkout, payments, shipping, tax, or publishing remain unconfigured.
