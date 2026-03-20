# Beam Utils Lab

A Beam-native playground for @beam-launcher/api and @beam-launcher/utils.

## Commands

- `Beam Utils Dashboard`: uses `useCachedPromise`, `useFetch`, `useExec`, `usePromise`, `useCachedState`, `useLocalStorage`, `useFrecencySorting`, icon helpers, and Beam deeplinks.
- `Beam Workflow Form`: uses `useForm`, `FormValidation`, local storage drafts, and Beam deeplink generation.
- `Capture Beam Snapshot`: a no-view command that reuses cached package data and reports failures through Beam utils.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

The build script installs the compiled extension into Beam's active dev plugins directory:

```bash
/home/krish/.local/share/com.tauri.dev/plugins/beam-utils-lab
```

## Notes

- Entry slug: `beam-utils-lab`
- Built with `@beam-launcher/api` and `@beam-launcher/utils`
