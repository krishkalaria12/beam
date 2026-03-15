## Beam Browser Bridge (Chrome + Firefox)

This extension publishes browser tab snapshots and active-tab content to Beam's local bridge server:

- Bridge URL: `http://127.0.0.1:38957`
- Health check: `GET /bridge/health`
- Sync endpoint: `POST /bridge/tabs`

### Chrome: load unpacked extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `packages/browser-extension/chrome`

### Firefox: load temporary add-on

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `packages/browser-extension/firefox/manifest.json`

### Notes

- Beam must be running for sync to succeed.
- The extension syncs on tab changes and every ~5 seconds.
- Content capture is best-effort and only for URLs where script injection is allowed.
