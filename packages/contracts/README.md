# Contracts

This package owns versioned, provider-neutral JSON contracts. Every contract must be usable by a client that knows only JSON Schema and HTTP.

Initial contracts:

- `DesignAnalysis`: extracted visual and brand observations with evidence.
- `BrandSpec`: palette, typography direction, voice, layout, and image treatment.
- `StoreSpec`: pages, sections, theme tokens, navigation, and commerce settings.
- `ProductDraft`: product content and media references, explicitly marked as draft.
- `Operation`: request, status, artifacts, warnings, and approval state.
- `ApprovalGate`: fields requiring human confirmation before mutation or publication.

Keep schemas backward-compatible within a major version. Include `$id`, `schemaVersion`, and `additionalProperties: false` for stable boundaries.
