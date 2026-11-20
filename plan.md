# StoreForge implementation plan

## Product

StoreForge is a free, open-source, self-hostable commerce platform that lets an LLM turn design references and structured product data into a draft storefront. The runtime does not depend on a particular model vendor. Any LLM can use it through the CLI, HTTP API, MCP server, or filesystem artifacts.

## Goals

- Deploy a working online store with Docker Compose.
- Accept logos, screenshots, moodboards, product images, and written brand direction.
- Convert references into a reviewable `BrandSpec` and `StoreSpec`.
- Generate storefront configuration and content without coupling the core to Manus, OpenAI, Anthropic, Ollama, or any other provider.
- Keep humans in control of pricing, inventory, shipping, taxes, policies, payments, and publishing.
- Make every AI action reproducible through JSON requests, JSON responses, and an operation log.

## Non-goals for the first release

- Multi-vendor marketplace behavior.
- Automatic legal/tax advice or jurisdiction-specific tax compliance.
- Fully autonomous live publishing or payment activation.
- Native fulfillment integrations for every print-on-demand provider.
- Training or hosting a model inside StoreForge.

## Architecture

The system is divided into four layers:

1. **Commerce runtime**: catalog, customers, carts, checkout, orders, inventory, media, and admin data.
2. **Storefront renderer**: a theme-driven frontend that reads `StoreSpec` and commerce APIs.
3. **AI orchestration kernel**: provider-neutral tasks, artifacts, approval gates, validation, and audit log.
4. **Adapters**: CLI, REST, MCP, filesystem, and optional model/provider adapters.

The AI kernel must never call a model directly. It accepts a `ModelPort` implementation and structured task definitions. A provider adapter translates the common request into the provider's API and returns normalized structured output.

## Provider-neutral interfaces

Every AI-capable operation has:

- a versioned JSON input schema;
- a versioned JSON output schema;
- an explicit list of required assets;
- a deterministic operation ID;
- confidence and evidence fields;
- validation errors instead of silently fabricated business values;
- an approval status: `draft`, `needs_review`, `approved`, or `published`.

Supported entry points should converge on the same command bus:

- `storeforge analyze-design`
- `storeforge generate-store`
- `storeforge import-products`
- `POST /v1/operations`
- MCP tools such as `analyze_design`, `generate_store`, and `validate_store`
- filesystem mode using `requests/*.json` and `artifacts/*.json`

## First implementation slice

1. Create schemas for `BrandSpec`, `StoreSpec`, `ProductDraft`, `DesignAnalysis`, `Operation`, and `ApprovalGate`.
2. Implement filesystem and CLI adapters with a mock model adapter so the workflow runs without credentials.
3. Build a minimal storefront shell that renders a `StoreSpec` from JSON.
4. Add a basic commerce service boundary; initially use local JSON/SQLite-compatible storage behind an interface.
5. Add REST and MCP adapters over the command bus.
6. Add provider adapters independently: OpenAI-compatible HTTP, Anthropic, Ollama, and Manus.
7. Add image processing and asset manifest generation.
8. Add Docker Compose, seed data, health checks, and deployment documentation.

## Approval model

The LLM may draft design and content. It must stop for approval before:

- setting or changing prices;
- asserting inventory quantities;
- selecting shipping rates or tax behavior;
- activating payment credentials;
- sending customer-facing messages;
- deleting products or orders;
- publishing a storefront.

## Repository structure

```text
apps/storefront/              Theme-driven customer storefront
apps/admin/                   Human review and commerce administration
services/api/                 HTTP API and command bus entrypoint
services/worker/              Async operation runner
packages/contracts/           JSON Schema and TypeScript types
packages/core/                Provider-neutral orchestration and ports
packages/commerce/            Catalog/order/payment interfaces
packages/theme-engine/        StoreSpec renderer and theme primitives
packages/assets/              Asset manifests and image pipeline ports
packages/adapters/            CLI, REST, MCP, filesystem adapters
packages/model-adapters/      Optional provider implementations
packages/skill/               Optional Manus skill; not required by runtime
examples/                     Complete provider-neutral requests and outputs
docs/                         Architecture, adapters, deployment, security
```

## Technology direction

Use TypeScript for the kernel, adapters, schemas, and web applications. Keep provider adapters behind interfaces and use standard HTTP/JSON wherever possible. Use PostgreSQL in the production Compose profile, with SQLite or a file-backed repository for local development and tests. Use S3-compatible object storage for durable media, with a local filesystem implementation for development.

The repository should remain usable without a model provider. The mock adapter and hand-authored JSON fixtures must be enough to render and validate a store.

## Definition of done for the scaffold

- Repository structure exists with no provider-specific dependency in the core package.
- A fresh checkout can inspect schemas and examples without secrets.
- A model-independent workflow is documented.
- The Manus skill is optional and points back to the same CLI/contracts.
- Docker and environment templates communicate what is still unimplemented rather than pretending to provide production checkout.
