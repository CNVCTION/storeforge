# Architecture

## Core rule

The core must not import an LLM SDK. It depends only on ports such as `ModelPort`, `AssetPort`, `CommercePort`, and `ApprovalPort`.

```text
CLI / REST / MCP / filesystem
              |
          Command Bus
              |
      Provider-neutral tasks
       /        |        \
  ModelPort  AssetPort  CommercePort
      |          |          |
  any LLM   local/S3    any backend
```

## ModelPort

The normalized model port should support:

- text generation;
- structured JSON generation against a schema;
- vision inputs via asset references;
- optional tool calls;
- cancellation and timeouts;
- usage metadata;
- provider/model name for auditability.

The port must return a normalized result containing `output`, `usage`, `model`, `warnings`, and `rawReference` where available. Raw provider responses are optional and must never be required by the core.

## Artifact-first workflow

Operations write artifacts rather than mutating production data directly:

```text
DesignAnalysis -> BrandSpec -> StoreSpec -> ProductDrafts -> Approved catalog -> Published store
```

Each artifact records its source assets, operation ID, schema version, confidence, warnings, and approval state. This makes the system inspectable and lets non-LLM clients participate.

## Adapters

- **CLI**: best for local agents and shell-based automation.
- **REST**: best for custom agents and application integrations.
- **MCP**: best for MCP-capable assistants; wraps REST/command-bus operations.
- **Filesystem**: best for offline workflows and simple coding agents.
- **Provider adapters**: translate a normalized task to a model vendor; they are replaceable.

## Security boundaries

Secrets belong in environment variables or an external secret manager. Design assets may be private. Customer and payment data must not be sent to a model by default. Model prompts should receive only the minimum asset and catalog fields needed for the task. All publish, payment, price, tax, and inventory actions require an approval gate.
