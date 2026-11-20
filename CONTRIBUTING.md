# Contributing

Keep the core provider-neutral. New model vendors belong in `packages/model-adapters` and must implement the normalized model port. New transports belong in `packages/adapters` and must call the same command bus as the CLI.

Do not add credentials, provider-specific response shapes, or live commerce side effects to examples. New operations need a versioned JSON contract, validation behavior, approval requirements, and a fixture that runs without an API key.
