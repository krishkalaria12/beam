<div align="center">
  <img src="./apps/desktop/src-tauri/icons/icon.png" width="160" height="160" alt="Beam logo" />

  <h1 align="center">Beam</h1>

  <p align="center">
    <strong>A blazing-fast, open-source command launcher for Linux 🚀</strong>
    <br />
    <em>Raycast-inspired. Native speed. Endlessly extensible.</em>
  </p>

  <p align="center">
    <a href="https://github.com/krishkalaria12/beam"><img src="https://img.shields.io/badge/github-krishkalaria12%2Fbeam-181717?logo=github&logoColor=white&style=for-the-badge" alt="GitHub" /></a>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/tauri-v2-24C8DB?logo=tauri&logoColor=white&style=for-the-badge" alt="Tauri v2" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/react-19-149ECA?logo=react&logoColor=white&style=for-the-badge" alt="React 19" /></a>
    <a href="https://bun.sh/"><img src="https://img.shields.io/badge/runtime-bun-black?logo=bun&logoColor=white&style=for-the-badge" alt="Bun" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/krishkalaria12/beam?style=for-the-badge&color=blue" alt="License" /></a>
  </p>

  <p>
    <b>Press <kbd>Super</kbd> + <kbd>Space</kbd>. Type anything. Get things done.</b>
  </p>
</div>

<hr />

## ✨ What is Beam?

Beam is a keyboard-first command launcher desktop app built on **Tauri v2 + React 19**. It lives silently in the background as a transparent, borderless overlay window — always a single hotkey away.

Bringing the beloved **Raycast-like experience to Linux**, it combines a command palette, deep system integrations, productivity tools, and a Raycast-compatible extension runtime into one unified interface.  
**No Electron overhead. No macOS lock-in. Native Linux performance.**

---

## 🔥 Key Features

### 🎯 Smart Command Palette

The core of Beam is a lightning-fast, registry-first command system.

- 🔍 **Fuzzy Search:** Instantly find apps, files, commands, and custom entries.
- 🧠 **Smart Ranking:** Learns from your usage—factors in frequency, recency, and pinned items.
- ⚡ **Trigger Modes:** Quickly route to specific tools using configurable prefixes:
  - `!` → Quicklinks
  - `$` → System Actions
  - `>` → Script Commands
- ⌨️ **Per-Command Hotkeys:** Bind any action directly to a keyboard shortcut.

### 🛠️ Built-in Productivity Suite

Forget opening multiple apps. Beam comes with powerful, native panels:

- 📦 **App Launcher:** Discovers and launches `.desktop` entries effortlessly.
- 🧮 **Smart Calculator:** Natural language math, conversions, dates, and live rates.
- 📋 **Clipboard Manager:** Persistent, searchable, AES-GCM encrypted clipboard history (Text & Images).
- 📁 **File Engine:** Real-time indexed file search powered by `nucleo`.
- ✅ **Task Manager:** SQLite-backed todo lists with nested sub-todos.
- 📝 **Text Snippets:** Rapid text expansion with delimiter/instant triggers.
- 🌐 **Quicklinks:** Custom URL shortcuts with keyword triggers.
- 🗣️ **AI Chat (Multi-Provider):** Chat with OpenRouter, OpenAI, Anthropic, or Gemini directly.
- 🔮 **And more:** Emoji Picker, Dictionary, Translation, Wi-Fi Speed Test, Window Switcher, System Actions.

### 🧩 Raycast-Compatible Extensions

Beam isn't just a basic launcher—it's a platform. It ships with a **Node.js extension runtime** offering a custom React reconciler.

- 🛍️ **Extension Store:** Browse, install, and manage extensions directly inside Beam.
- 🔄 **Raycast Compatibility:** Run existing Raycast script-commands natively!
- 🌉 **Browser Bridge:** Connects with Chrome/Firefox to push tab data locally.

### 🔌 Deep Integrations

- 🎵 **Spotify:** OAuth authentication, playback controls, and library search.
- 🐙 **GitHub:** Manage PRs, assignments, and search repositories deeply.

### 🎨 Fully Customizable

Make Beam yours with powerful theming support:

- **Default, Glassy, or Solid** visual styles.
- **Custom CSS Themes:** Build your own look (`theme.json` + `theme.css`).
- Automatically syncs with your system's Light/Dark mode.

---

## 🚀 Getting Started

### Distribution Status

Beam is being prepared for its first public package release. AUR packaging is planned; until then, the source workflow below is the supported install path.

### Prerequisites

Beam is built **Linux-first** and deeply integrates with freedesktop standards and Wayland APIs.

1. [Bun](https://bun.sh/) (Latest stable)
2. [Rust Toolchain](https://rustup.rs/)
3. [Tauri System Dependencies](https://tauri.app/start/prerequisites/)
4. `patchelf` (Required for Linux build linking)

### Source Installation & Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/krishkalaria12/beam.git
cd beam
bun install
```

Start the development server (runs Vite + Tauri concurrently):

```bash
bun run desktop:dev
```

### Production Build

```bash
bun run desktop:build
```

> **Note on Snippets:** For Beam's snippet expander to work (which reads keyboard events and injects text), you need to set up udev rules. Run `sudo ./infra/scripts/install-snippets-udev-rules.sh` and re-login.

---

## ⚙️ Configuration

Beam is highly configurable through its internal settings panel (`Super + Space` -> Type "Settings").

- **Global Hotkey:** Customize the main activation key (Default: `Super + Space`).
- **Trigger Symbols:** Overwrite prefixes (e.g., change `!` for Quicklinks to something else).
- **Window Style:** Toggle between Default, Glassy (Frosted Glass), or Solid.

---

## 🤝 Contributing

We welcome contributions! Beam is rapidly evolving, and we'd love your help.

1. Fork the repository.
2. Create a feature branch.
3. Ensure you follow existing patterns (especially regarding the Command Registry).
4. Run validation checks:
   ```bash
   bun run lint
   bun run check-types
   bun run fmt:check
   bun run rust:fmt:check
   ```
5. Submit a pull request detailing your changes.

**Current Priorities:**

- Expanding cross-platform support (macOS/Windows).
- Improving test coverage.
- Enhancing the Raycast Extension compatibility layer.

---

## 🔒 Privacy & Persistence

Beam keeps your data secure and local:

- **Encrypted Local Storage:** Clipboard entries are AES-GCM encrypted.
- **Keyring Integration:** AI API keys and OAuth tokens are stored in the secure OS system keyring.
- **SQLite DBs:** Persistent storage for Todos, Chat, and Snippets is managed locally. No tracking. No telemetry.

---

## 🌟 Support the Project

If you love Beam, consider leaving a star here on GitHub! It helps a lot.

[![Star History Chart](https://api.star-history.com/svg?repos=krishkalaria12/beam&type=Date)](https://star-history.com/#krishkalaria12/beam&Date)

<p align="center">
  Built with ❤️ using Tauri + React + Rust <br>
  <b>A Linux-first open-source initiative.</b>
</p>
