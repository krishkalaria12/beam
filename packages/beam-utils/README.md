# @beam-launcher/utils

Beam-native utilities for extension development.

This package mirrors most of the public surface of `@raycast/utils`, but is wired for Beam's runtime and SDK.

The upstream Raycast utils source lives in `utils-main/` when you have that checkout available locally. Beam also keeps a checked-in snapshot under `packages/beam-utils/src`, so regular builds do not require the upstream clone.

Beam-specific forks currently live in:

- `packages/beam-utils/src/createDeeplink.ts`
- `packages/beam-utils/src/showFailureToast.ts`
- `packages/beam-utils/src/useSQL.tsx`
- `packages/beam-utils/src/icon/favicon.ts`

Everything else can be refreshed from upstream with:

```bash
node packages/beam-utils/scripts/sync-upstream-utils.mjs
```

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
