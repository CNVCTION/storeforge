# StoreForge guide for AI agents

This guide is the portable workflow for agents such as Claude Code, Codex, Gemini CLI, Cursor, Manus, local agents, and custom MCP clients. It assumes the agent can inspect files and, optionally, connect to the StoreForge MCP server.

## What the agent is responsible for

The agent converts visual references and explicit business inputs into reviewable draft artifacts. It does not become the payment processor, tax authority, fulfillment provider, or legal policy author. The output is a storefront proposal that a human can inspect and approve.

## Repository preparation

From the repository root:

```bash
./scripts/agent-bootstrap-store.sh
pnpm install
pnpm mcp:build
```

Put design references in `store/assets/`. Put a manifest at `store/design-manifest.json`. If product data exists, put it at `store/product-input.json` using explicit prices and inventory rather than embedding those values in screenshots.

The bootstrap script creates missing directories and copies the sample manifest and prompt into the store workspace. It does not overwrite existing files.

## MCP connection

Launch the server over stdio:

```bash
STOREFORGE_ROOT="$PWD" pnpm mcp:start
```

Use [`examples/mcp/storeforge.mcp.json`](../examples/mcp/storeforge.mcp.json) as a client configuration template. The client launches the server as a child process; the LLM communicates through MCP JSON-RPC.

## Tool sequence

Call `storeforge_context` first. This prevents the agent from ignoring existing drafts or repository constraints.

Next, inspect `store/design-manifest.json` and the listed images. Record visual observations with source paths. If the model cannot access an image, say so; do not manufacture observations.

Call `storeforge_write_store_spec` with a draft object. Use real asset paths in homepage sections. Keep navigation and page types limited to what the design and brief support.

If explicit product data is available, call `storeforge_write_products`. Preserve supplied IDs, names, prices, currencies, inventory quantities, images, and collections. If a field is absent, leave it absent or null. Never derive a price or stock count from visual content.

Call `storeforge_validate`. Fix schema errors, but do not erase warnings or bypass approval gates. Report the final validation result to the human.

## Good draft behavior

A good agent response explains which design decisions were observed and which were inferred. It identifies the exact files written. It lists unresolved fields such as price, stock, shipping, tax, payments, and policies. It states that the result is a draft and gives a short human review list.

A bad agent response invents a price because a product “looks premium,” treats visible products in a moodboard as actual inventory, claims that checkout works because a button was designed, or silently publishes a storefront.

## Portable prompt

Use [`examples/prompts/generate-store-from-design.md`](../examples/prompts/generate-store-from-design.md) as a task prompt. It is deliberately model-provider-neutral and names the MCP tools, approval boundaries, evidence requirements, and completion format.

## Terminal-only fallback

If MCP is unavailable, an agent can still work from the same contracts:

```bash
mkdir -p store/assets
# Add or edit store/design-manifest.json and store/product-input.json.
# Write store/store-spec.json and store/products.json using the examples as shape references.
pnpm mcp:build
```

The agent must then explain that validation should be run through an MCP client or the future CLI once available. It must not substitute an unverified custom validator and call the store production-ready.
