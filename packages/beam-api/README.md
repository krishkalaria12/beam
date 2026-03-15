`@beam-launcher/api` is the public SDK for building Beam extensions with React and TypeScript.

[![Version](https://img.shields.io/npm/v/@beam-launcher/api.svg)](https://npmjs.org/package/@beam-launcher/api)
[![Downloads/week](https://img.shields.io/npm/dw/@beam-launcher/api.svg)](https://npmjs.org/package/@beam-launcher/api)

## Install

```bash
bun add @beam-launcher/api
```

The package also exposes the `beam-api` CLI.

## Create An Extension

Create a new extension from the bundled Beam boilerplate:

```bash
bunx beam-api create --directory my-extension
```

Useful flags:

```bash
bunx beam-api create \
  --directory my-extension \
  --title "My Extension" \
  --owner beam-launcher \
  --author "Beam Launcher" \
  --install
```

This command scaffolds from the same template source used by Beam’s repo boilerplate in [`resources/extra/extension-boilerplate`](../../resources/extra/extension-boilerplate).

## Local Development

Inside your extension:

```bash
bun install
bun run dev
```

The default scripts are:

- `bun run dev`: run the extension in Beam’s development mode
- `bun run build`: bundle the extension
- `bun run check`: typecheck the extension source

## Build And Package

Build an extension bundle manually:

```bash
bunx beam-api build --src .
```

Output defaults to Beam’s local extension directory, or you can provide a custom output path:

```bash
bunx beam-api build --src . --out ./dist-extension
```

## Beam Store Workflow

Beam-native store packages are distributed as versioned release artifacts plus catalog metadata.

In the Beam repo, the end-to-end flow is:

1. Prepare a package source directory under `infra/store/packages/<name-version>/`
2. Add `beam-store.json` metadata alongside the extension `package.json`
3. Publish the artifact and update the local catalog:

```bash
bun run store:publish -- --source infra/store/packages/beam-demo-tools-1.1.0
```

4. Validate all package sources and catalog rules:

```bash
bun run store:validate
```

The Beam store publisher generates:

- zipped release artifacts
- SHA-256 checksums
- catalog entries in `infra/store/catalog.json`

## Release Workflow

For SDK releases:

1. update `packages/beam-api/package.json`
2. build and dry-run the package:

```bash
bun run publish:beam-api -- --dry-run
```

3. publish with an npm token:

```bash
NPM_CONFIG_TOKEN=... bun run publish:beam-api -- --publish
```

## Docs

For the Beam repo’s full local workflow, see [../../resources/docs/extensions/developer-workflow.md](../../resources/docs/extensions/developer-workflow.md).

## Versioning

`@beam-launcher/api` follows Beam’s runtime versioning. Extensions should target the Beam version they are intended to run on.
