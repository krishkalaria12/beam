# AUR Release Automation

Beam ships an automated AUR update flow for the `beam-launcher-bin` package.

## What The Workflow Does

1. Builds Linux release artifacts when you push a tag like `v1.0.0`
2. Publishes the GitHub release with `.AppImage`, `.deb`, `.rpm`, and `SHA256SUMS.txt`
3. Fetches the release AppImage metadata
4. Regenerates `PKGBUILD` and `.SRCINFO` for `beam-launcher-bin`
5. Pushes the updated package repo to AUR

## Required GitHub Secret

- `AUR_SSH_PRIVATE_KEY`: SSH private key with push access to `ssh://aur@aur.archlinux.org/beam-launcher-bin.git`

If this secret is missing, the release workflow still publishes GitHub assets and skips the AUR publish step.

## One-Time AUR Setup

1. Create the `beam-launcher-bin` package on AUR
2. Generate a dedicated SSH keypair for GitHub Actions
3. Add the public key to your AUR account/package access
4. Add the private key to this repo as `AUR_SSH_PRIVATE_KEY`

## Local Dry Run

Render the AUR files into a local checkout or temp directory:

```bash
bun infra/scripts/update-aur-beam-launcher-bin.ts --repo-dir /tmp/beam-launcher-bin --version 1.0.0 --asset-url https://example.com/beam.AppImage --asset-sha256 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

For real release data, point the script at an existing tag:

```bash
bun infra/scripts/update-aur-beam-launcher-bin.ts --repo-dir /tmp/beam-launcher-bin --tag v1.0.0 --github-repo krishkalaria12/beam
```
