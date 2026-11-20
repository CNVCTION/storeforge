# StoreForge MCP server

StoreForge exposes its provider-neutral draft workflow through an MCP server. The server is an adapter over StoreForge files and contracts; it does not require a particular model provider and does not activate live payments or publish a store.

## Install and build

From the repository root:

```bash
pnpm install
pnpm --filter @storeforge/mcp-server build
```

## Run over stdio

Run the server with the repository root as its working directory:

```bash
STOREFORGE_ROOT=/absolute/path/to/storeforge pnpm --filter @storeforge/mcp-server start
```

MCP clients should launch it as a child process and communicate over standard input/output. The server logs errors to stderr so stdout remains MCP protocol traffic.

## Tools

`storeforge_context` reads the project rules and current draft files. `storeforge_write_store_spec` validates and writes `store/store-spec.json`. `storeforge_write_products` validates and writes `store/products.json`. `storeforge_validate` reports schema errors, warnings, and approval gates. `storeforge_read_file` reads an in-repository file for inspection.

All writes are draft-only. The server does not provide a publish tool. Prices, inventory, shipping, tax, payment activation, customer messaging, and publishing remain explicit approval boundaries.

## Generic MCP client configuration

The exact configuration key differs by client, but the equivalent process definition is:

```json
{
  "mcpServers": {
    "storeforge": {
      "command": "pnpm",
      "args": ["--filter", "@storeforge/mcp-server", "start"],
      "cwd": "/absolute/path/to/storeforge",
      "env": {
        "STOREFORGE_ROOT": "/absolute/path/to/storeforge"
      }
    }
  }
}
```

An MCP-capable LLM can then inspect the context, create a draft brand/store specification, add products, and run validation without knowing which model provider is being used.

## Prompt workflow

Use [`examples/prompts/generate-store-from-design.md`](../examples/prompts/generate-store-from-design.md) as a system or task prompt for an MCP-capable LLM. It defines the sequence of tools, the rules for interpreting design images, the fields that must remain unresolved, and the expected completion format. [`examples/design-manifest.json`](../examples/design-manifest.json) shows the input shape for a design asset set.
