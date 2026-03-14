# AUR Search

Search Arch User Repository packages from Beam.

This extension uses the official AUR RPC v5 search endpoint on `aur.archlinux.org` and renders the
results in a Beam list/detail command.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

For the current local Beam app in this repo, that installs into:

```bash
/home/krish/.local/share/com.tauri.dev/plugins/aur-search
```

## Notes

- Command: `Search AUR Packages`
- Source API: `https://aur.archlinux.org/rpc/v5/search/<query>?by=name-desc`
- Built with `@beam-launcher/api`
- `bun run build` installs the compiled extension into Beam's local extensions directory
