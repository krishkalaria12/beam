# beam

minimal launcher-style desktop app built with tauri + react.

## stack

- tauri v2 (rust backend)
- react + tanstack router (frontend)
- vite + bun (tooling)
- tailwind css v4 (styling)

## run locally

```bash
bun install
bun run desktop:dev
```

## build desktop app

```bash
bun run desktop:build
```

## current ui

- initial launcher shell with a centered panel
- heading only: `beam`

## browser extension bridge

Beam now includes a local browser bridge server for extension `BrowserExtension` APIs.

- bridge URL: `http://127.0.0.1:38957`
- unpacked Chrome extension: `browser-extension/chrome`
- temporary Firefox add-on: `browser-extension/firefox`
- install notes: `browser-extension/README.md`

## command registry architecture notes

- all command-mode listing and execution flow is registry-first
- static commands come from `src/command-registry/static-commands.ts`
- dynamic commands are provided through `src/command-registry/default-providers.ts`
- provider orchestration is debounced, cancellable, and incremental (`resolveIncremental`) so slow providers do not block fast ones
- command execution is centralized through `dispatchCommand` in `src/command-registry/dispatcher.ts`
- provider timing/errors and dispatcher failures are logged via `src/command-registry/telemetry.ts`
