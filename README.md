# browser-addon-sgp

Classic SuperGenPass-compatible cross-browser WebExtension (Chrome + Firefox).

## What it does

- Detects the current site domain in the popup.
- Accepts a master password (never stored persistently).
- Shows the original SuperGenPass-style identicon while typing the master password.
- Derives the site password locally using classic SGP-compatible behavior.
- Lets you copy the generated password or fill visible password fields in the active tab.

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

## Development checks

Run compatibility tests for the shared SGP core:

```bash
npm test
```

The extension icons live in `icons/` and are referenced directly from `manifest.json`.

The release zip is produced by the GitHub Actions workflow at `.github/workflows/release-zip.yml`. It packages the runtime extension files (`manifest.json`, `popup/`, `src/`, and `icons/`) into a distributable zip and uploads it as a workflow artifact. Tag and published release runs also attach the zip to the GitHub release.

## Notes

- The shared logic lives in `src/sgp-core.js`.
- The popup UI is in `popup/`.
- Field filling is handled by `src/content.js` via explicit popup action.
