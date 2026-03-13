# `@beam/raycast-api-compat`

This package exposes a Raycast-shaped API surface on top of Beam's native extension runtime.

Use `@beam-launcher/api` for Beam-native extensions. This package is an internal workspace compatibility layer, mirroring how Vicinae keeps its Raycast compat package separate from the public SDK.

## Relationship to `@beam-launcher/api`

- `@beam-launcher/api` is the native Beam SDK
- `@beam/raycast-api-compat` is the compatibility layer

The split mirrors Vicinae's architecture: the native API remains the source of truth, and compatibility stays in a separate internal package boundary.
