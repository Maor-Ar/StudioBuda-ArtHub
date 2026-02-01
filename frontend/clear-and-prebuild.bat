@echo off
echo Clearing Expo cache and node_modules...
if exist .expo rmdir /s /q .expo
if exist node_modules\.expo rmdir /s /q node_modules\.expo
if exist android rmdir /s /q android

echo Installing dependencies...
call npm install

echo Running prebuild...
call npx expo prebuild --platform android --clean

pause
