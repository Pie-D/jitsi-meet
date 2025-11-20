@echo off
REM This script is executed by Gradle to start the React packager for Debug targets on Windows.

set RCT_METRO_PORT=8081
echo export RCT_METRO_PORT=%RCT_METRO_PORT% > "%~dp0..\..\node_modules\react-native\scripts\.packager.env"

adb reverse tcp:%RCT_METRO_PORT% tcp:%RCT_METRO_PORT%

REM Check if Metro bundler is already running
curl -s "http://localhost:%RCT_METRO_PORT%/status" | findstr "packager-status:running" >nul
if %errorlevel% equ 0 (
    echo Metro bundler is already running on port %RCT_METRO_PORT%
    exit /b 0
) else (
    echo Metro bundler not detected, it should be started manually
    exit /b 0
)
