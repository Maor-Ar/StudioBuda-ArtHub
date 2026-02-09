# One-Time Icon Setup

Generate app icons once from `icon_sticker_purple_and_pink.svg`, then commit the files.

**Note:** The adaptive icon is generated at 66% scale so the full logo fits in Android's safe zone (avoids zoom/crop on home screen).

## Quick run (PowerShell)

From the `frontend` folder:

```powershell
.\scripts\setup-icons.ps1
```

Or: `npm run build:icons`

## Manual steps

1. `cd frontend`
2. `npm install sharp --save-dev`
3. `npm run build:icons`
4. Add icon config to `app.json` (see below)
5. `npm uninstall sharp` (optional)
6. Commit `assets/images/*.png`, `app.json`, `package.json`, `package-lock.json`

## app.json additions

Add to the `expo` object:
- `"icon": "./assets/images/icon.png"` (after `scheme`)
- In `android.adaptiveIcon`: `"foregroundImage": "./assets/images/adaptive-icon.png"`
- `"web": { "favicon": "./assets/images/favicon.png" }`
