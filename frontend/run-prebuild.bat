@echo off
chcp 65001 >nul
cd /d "%~dp0"
npx expo prebuild --platform android --clean
