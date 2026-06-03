# browser-addon-sgp

Classic SuperGenPass-compatible cross-browser WebExtension (Chrome + Firefox).

## What it does

- Detects the current site domain in the popup.
- Accepts a master password (never stored persistently).
- Shows the SuperGenPass-style identicon while typing the master password.
- Derives the site password locally using classic SGP-compatible behavior.

## Security and privacy

- Password generation happens entirely locally in the extension.
- No network requests are made for password derivation.
- The master password is kept only in popup memory while the popup is open.

## Install (temporary / developer mode)

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select this repository's `manifest.json`.

## Build a developer addon

```bash
perl build-release.pl
```

## Notes

- The shared logic lives in `src/sgp-core.js`.
- The popup UI is in `popup/`.
- Field filling is handled by `src/content.js` via explicit popup action.
