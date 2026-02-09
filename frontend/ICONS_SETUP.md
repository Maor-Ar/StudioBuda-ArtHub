# One-Time Icon Setup

Generate app icons once from `icon_sticker_purple_and_pink.svg`, then commit the files.

## Quick run (PowerShell)

From the `frontend` folder:

```powershell
.\scripts\setup-icons.ps1
```

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
