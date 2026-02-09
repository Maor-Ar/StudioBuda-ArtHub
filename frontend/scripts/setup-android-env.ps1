# Setup Android SDK environment variables
# Run this script in PowerShell, then use the same terminal for Expo/React Native commands

Write-Host "Searching for Android SDK..." -ForegroundColor Cyan

# Common Android SDK locations on Windows
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "C:\Program Files\Android\Android Studio\sdk",
    "$env:USERPROFILE\Android\Sdk"
)

$sdkPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $adbPath = Join-Path $path "platform-tools\adb.exe"
        if (Test-Path $adbPath) {
            $sdkPath = $path
            Write-Host "Found Android SDK at: $sdkPath" -ForegroundColor Green
            break
        }
    }
}

if (-not $sdkPath) {
    Write-Host "Android SDK not found in common locations." -ForegroundColor Yellow
    Write-Host "Please find your Android SDK path (usually shown in Android Studio > SDK Manager)" -ForegroundColor Yellow
    Write-Host "Then run:" -ForegroundColor Yellow
    Write-Host '  $env:ANDROID_HOME = "C:\path\to\your\Android\Sdk"' -ForegroundColor Cyan
    Write-Host '  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME' -ForegroundColor Cyan
    Write-Host '  $env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"' -ForegroundColor Cyan
    exit 1
}

# Set environment variables for current session
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"

Write-Host "`nEnvironment variables set for this terminal session:" -ForegroundColor Green
Write-Host "  ANDROID_HOME = $env:ANDROID_HOME" -ForegroundColor Cyan
Write-Host "  ANDROID_SDK_ROOT = $env:ANDROID_SDK_ROOT" -ForegroundColor Cyan

# Verify adb
$adbPath = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
if (Test-Path $adbPath) {
    Write-Host "`n✓ adb found at: $adbPath" -ForegroundColor Green
    Write-Host "`nYou can now use Expo/React Native commands in this terminal." -ForegroundColor Green
    Write-Host "Note: These variables are only set for this terminal session." -ForegroundColor Yellow
    Write-Host "To set them permanently, add them to System Environment Variables." -ForegroundColor Yellow
} else {
    Write-Host "`n✗ adb not found. Make sure Android SDK Platform-Tools is installed." -ForegroundColor Red
    Write-Host "Install via: Android Studio > SDK Manager > SDK Tools > Android SDK Platform-Tools" -ForegroundColor Yellow
}
