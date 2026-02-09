# Android SDK Setup

After installing Android Studio, you need to set environment variables so Expo/React Native can find `adb`.

## Quick Fix (Current Terminal Only)

Run this script in PowerShell:

```powershell
.\scripts\setup-android-env.ps1
```

This sets `ANDROID_HOME` and `ANDROID_SDK_ROOT` for the current terminal session.

## Permanent Setup (System-Wide)

To set environment variables permanently so they work in all terminals:

### Option 1: Via PowerShell (Run as Administrator)

```powershell
# Find your SDK path (usually shown in Android Studio > SDK Manager)
$sdkPath = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"  # Adjust if different

# Set system environment variables
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "Machine")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "Machine")

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\tools"
[System.Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
```

### Option 2: Via Windows GUI

1. Press `Win + X` → **System** → **Advanced system settings**
2. Click **Environment Variables**
3. Under **System variables**, click **New**:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\<YourUsername>\AppData\Local\Android\Sdk` (adjust path)
4. Click **New** again:
   - Variable name: `ANDROID_SDK_ROOT`
   - Variable value: Same as `ANDROID_HOME`
5. Edit **Path** variable → Add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
6. Click **OK** on all dialogs
7. **Restart your terminal** (or restart Windows)

## Verify Setup

After setting up, verify in a new terminal:

```powershell
echo $env:ANDROID_HOME
adb version
```

Both should work without errors.

## Find Your SDK Path

If you're not sure where Android Studio installed the SDK:

1. Open **Android Studio**
2. Go to **File** → **Settings** (or **Android Studio** → **Preferences** on Mac)
3. **Appearance & Behavior** → **System Settings** → **Android SDK**
4. The **Android SDK Location** shows your path
