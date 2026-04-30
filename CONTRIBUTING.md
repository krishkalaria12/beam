# Contributing to Beam

Thanks for your interest in contributing to Beam. Beam is an open-source, keyboard-first command launcher for Linux built with Tauri v2, Rust, React, and Bun workspaces.

## AI Usage

Using AI tools is fine, but you are responsible for everything you submit. Please review, test, and understand generated changes before opening a pull request. Low-effort PRs with fabricated behavior, untested fixes, or unrelated churn may be closed.

## Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/beam.git
   cd beam
   ```

2. Install prerequisites:

   - [Bun](https://bun.sh/) `1.2.19`
   - Node.js `22` or newer
   - [Rust](https://rustup.rs/) stable
   - [Tauri v2 Linux dependencies](https://tauri.app/start/prerequisites/)
   - `protobuf-compiler`
   - Swift `6.1.2` when working on code paths that require the CI Swift toolchain

   On Ubuntu, CI installs:

   ```bash
   sudo apt-get update
   sudo apt-get install -y \
     libwebkit2gtk-4.1-dev \
     libgtk-3-dev \
     libgtk-layer-shell-dev \
     libappindicator3-dev \
     librsvg2-dev \
     patchelf \
     protobuf-compiler
   ```

3. Install dependencies:

   ```bash
   bun install
   ```

4. Create a branch:

   ```bash
   git checkout -b feature/my-change
   ```

## Running Beam Locally

Start the desktop app:

```bash
bun run desktop:dev
```

Run only the desktop frontend:

```bash
bun run desktop:frontend:dev
```

Run the website:

```bash
bun run web:dev
```

## Project Structure

- `apps/desktop` - Tauri desktop app, React launcher UI, and Rust backend in `src-tauri`
- `apps/web` - Astro website
- `packages/beam-api` - public extension SDK and extension creation CLI
- `packages/beam-utils` - utility helpers for extensions
- `packages/extension-manager` - extension runtime bundling and management
- `packages/extension-protocol` - generated extension runtime protocol types
- `packages/browser-extension` - Chrome and Firefox browser bridge used by Focus Mode
- `packages/raycast-api-compat` - Raycast compatibility layer
- `infra/store` - Beam extension store package sources, catalog, and publishing scripts
- `infra/aur` - AUR package assets and release support
- `resources/extra/extension-boilerplate` - bundled extension template

## Development Commands

Use root scripts unless you are intentionally working inside a specific package.

```bash
bun run lint
bun run check-types
bun run fmt:check
bun run rust:fmt:check
bun run extension-manager:build
bun run web:build
bun run desktop:frontend:build
cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
```

To format code:

```bash
bun run fmt
bun run rust:fmt
```

## Pull Request Checklist

Before opening a PR, run the checks that match your change:

```bash
bun run lint
bun run check-types
bun run fmt:check
bun run rust:fmt:check
```

For desktop or backend changes, also run:

```bash
bun run extension-manager:build
bun run desktop:frontend:build
cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
```

For website changes, run:

```bash
bun run web:build
```

For store package changes, run:

```bash
bun run store:validate
```

## Code Guidelines

- Keep PRs focused. Avoid unrelated formatting, renames, or drive-by refactors.
- Prefer existing project patterns over introducing new abstractions.
- Use Bun for JavaScript and TypeScript workflows. Do not add npm, yarn, or pnpm lockfiles.
- Use `oxfmt` and `cargo fmt` for formatting.
- Keep Rust changes scoped to `apps/desktop/src-tauri` unless you are changing release or infrastructure scripts.
- Include screenshots or recordings for visible UI changes.
- Update docs when changing setup, commands, extension APIs, store behavior, or release behavior.

## Commit Messages

Use clear commit messages. Conventional prefixes are preferred:

- `feat:` for new user-facing functionality
- `fix:` for bug fixes
- `refactor:` for behavior-preserving code changes
- `docs:` for documentation-only changes
- `chore:` for tooling, CI, dependencies, or maintenance
- `test:` for adding or updating tests

Example:

```text
feat: add focus category import flow
```

## Extension Development

Create a Beam extension from the bundled template:

```bash
bun run create:extension
```

The extension SDK lives in `packages/beam-api`, and the default template lives in `resources/extra/extension-boilerplate`.

For Beam store packages:

1. Add or update a package source under `infra/store/packages/<name-version>/`.
2. Include `beam-store.json` metadata beside the package `package.json`.
3. Validate package sources:

   ```bash
   bun run store:validate
   ```

4. Publish/update local catalog metadata when appropriate:

   ```bash
   bun run store:publish -- --source infra/store/packages/<name-version>
   ```

## Browser Extension

Focus Mode website blocking depends on the Beam browser bridge.

- Chrome/Chromium: load `packages/browser-extension/chrome` from `chrome://extensions` with Developer Mode enabled.
- Firefox/Zen Browser: load `packages/browser-extension/firefox/manifest.json` from `about:debugging#/runtime/this-firefox`.

Keep Beam running while testing browser bridge behavior. The bridge listens on `http://127.0.0.1:38957`.

## Reporting Bugs

When filing an issue, include:

- Linux distribution, desktop environment, and display server if relevant
- Beam version or commit SHA
- Install method
- Steps to reproduce
- Expected and actual behavior
- Logs, screenshots, or recordings when useful

For launcher, clipboard, file search, window manager, or Focus Mode issues, include the desktop environment/window manager name such as GNOME, KDE, Hyprland, Sway, or niri.

## Releases

Releases are tag-driven. Tags matching `v*` trigger the Linux release workflow, which builds `.deb` and `.rpm` artifacts and can publish the AUR package when the required secret is configured.

Release PRs should update `CHANGELOG.md` with changes since the previous tag before creating the next tag.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
