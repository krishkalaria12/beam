# Beam Extensions Developer Workflow

This is the end-to-end developer and publisher workflow for Beam’s native extension platform.

## 1. Scaffold A New Extension

From the repo:

```bash
bun run create:extension -- --directory my-extension
```

From the published SDK:

```bash
bunx @beam-launcher/api create --directory my-extension
```

The generated extension is based on [`extra/extension-boilerplate`](../../extra/extension-boilerplate).

## 2. Develop Locally

Inside the generated extension:

```bash
bun install
bun run dev
```

This expects Beam to be running locally so the extension manager can load the command bundle.

## 3. Typecheck And Build

```bash
bun run check
bun run build
```

You can also invoke the CLI directly:

```bash
bunx beam-api build --src .
```

## 4. Prepare A Beam Store Package

Beam’s store publisher expects a source directory under `store/packages/` containing:

- `package.json`: the extension manifest
- `beam-store.json`: store metadata, release metadata, compatibility, and verification details

Use an existing source package in `store/packages/` as the reference shape.

## 5. Publish A Store Package

Publish a single package source:

```bash
bun run store:publish -- --source store/packages/beam-demo-tools-1.1.0
```

Publish all package sources:

```bash
bun run store:publish:all
```

This generates:

- release zip artifacts in `store/artifacts/`
- checksums
- updated catalog entries in `store/catalog.json`

## 6. Validate Store Metadata

Run publisher/admin validation:

```bash
bun run store:validate
```

This checks:

- channel policy
- compatibility policy
- artifact integrity and metadata
- catalog/package consistency

## 7. Release The Public SDK

Dry-run:

```bash
bun run publish:beam-api -- --dry-run
```

Publish:

```bash
NPM_CONFIG_TOKEN=... bun run publish:beam-api -- --publish
```

## 8. Keep Compat Internal

`@beam/raycast-api-compat` is intentionally internal, matching Vicinae’s package model.
Beam-native extensions should use `@beam-launcher/api`.
