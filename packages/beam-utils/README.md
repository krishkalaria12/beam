# @beam-launcher/utils

Beam-native utilities for extension development.

This package mirrors most of the public surface of `@raycast/utils`, but is wired for Beam's runtime and SDK.

OAuth helpers are intentionally not exported from `@beam-launcher/utils`.

## Runtime Requirements

- `@beam-launcher/api`
- `react`

## Release Workflow

Dry-run the published package:

```bash
bun run publish:beam-utils -- --dry-run
```

Publish with an npm token:

```bash
NPM_CONFIG_TOKEN=... bun run publish:beam-utils -- --publish
```
