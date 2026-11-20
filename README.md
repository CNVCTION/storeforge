# StoreForge

StoreForge is a planned free, open-source, self-hostable commerce platform that turns design references into a reviewable storefront. It is **LLM-agnostic by design**.

The core does not require Manus, OpenAI, Anthropic, Ollama, or any other AI provider. Models connect through normalized adapters, while the same workflows are available through a CLI, HTTP API, MCP server, or filesystem request files.

> This repository is currently a scaffold and implementation plan. It does not yet provide production payments, tax calculation, fulfillment, or live checkout.

## Design principle

An LLM should be able to operate StoreForge without learning a proprietary SDK:

```text
input assets + JSON request
        -> provider-neutral operation
        -> JSON artifact + validation results
        -> human approval
        -> storefront/runtime configuration
```

## Planned interfaces

```bash
storeforge analyze-design --input examples/design-request.json
storeforge generate-store --input examples/store-request.json
storeforge validate-store --input examples/store-spec.json
```

```http
POST /v1/operations
Content-Type: application/json

{"type":"analyze_design","input":{...}}
```

An MCP server will expose the same operations as tools, but MCP is an adapter rather than a core dependency.

## MCP server

The repository includes a working stdio MCP server. Any MCP-compliant LLM can inspect the StoreForge plan, write draft store specifications and products, read project files, and run validation without using a particular model provider.

```bash
pnpm install
pnpm mcp:build
STOREFORGE_ROOT=/absolute/path/to/storeforge pnpm mcp:start
```

See [`docs/mcp-server.md`](docs/mcp-server.md) for client configuration and the list of tools. The MCP server is draft-only: it does not publish stores, activate payments, or invent prices, inventory, tax, or shipping settings.

For agent-oriented usage, start with [`AGENTS.md`](AGENTS.md) and [`docs/agent-guide.md`](docs/agent-guide.md). The repository includes a portable prompt template, an MCP client configuration example, and `scripts/agent-bootstrap-store.sh` for preparing a design-image workspace.

A complete synthetic input set is available in [`examples/design-manifest.json`](examples/design-manifest.json), [`examples/demo-product-input.json`](examples/demo-product-input.json), and [`examples/assets/`](examples/assets/). The images are mock references for demonstrations only.

## Quick start for the scaffold

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm typecheck
```

The mock model adapter is intended to make local development possible without an API key. See [`plan.md`](plan.md), [`docs/architecture.md`](docs/architecture.md), and [`examples/`](examples/).

## License

Apache-2.0 is the intended license for the repository. Confirm the final license before the first public release.
