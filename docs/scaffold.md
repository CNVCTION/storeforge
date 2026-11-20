# Scaffold map

The empty directories are intentional boundaries for the first implementation slice. `packages/core` owns the command bus and ports. `packages/contracts` owns JSON Schema and generated types. `packages/model-adapters` contains optional connectors for OpenAI-compatible HTTP, Anthropic, Ollama, Manus, and future providers. `packages/adapters` contains CLI, REST, MCP, and filesystem transports.

`apps/storefront` and `apps/admin` should remain usable with hand-authored JSON fixtures and the mock model adapter. A user must be able to run and inspect a storefront without configuring an AI account.
