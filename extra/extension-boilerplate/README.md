# Beam Extension Boilerplate

This directory is the source template for Beam’s extension scaffold flow.

Use it in two ways:

- directly, inside the Beam repo, as a runnable SDK exercise surface
- indirectly, through `beam-api create`, which copies this template into a new extension

## Create A New Extension

From the repo root:

```bash
bun run create:extension -- --directory my-extension
```

From the published SDK:

```bash
bunx @beam-launcher/api create --directory my-extension
```

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```
