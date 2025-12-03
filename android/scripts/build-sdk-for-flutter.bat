@echo off
REM Script để build Android AAR SDK cho Flutter
REM Sử dụng: build-sdk-for-flutter.bat [release|debug]

SETLOCAL

SET BUILD_TYPE=%1
IF "%BUILD_TYPE%"=="" SET BUILD_TYPE=release

SET THIS_DIR=%~dp0
SET ANDROID_DIR=%THIS_DIR%\..

echo ========================================
echo Building Jitsi Meet SDK for Flutter
echo Build Type: %BUILD_TYPE%
echo ========================================
echo.

REM Kiểm tra Node.js
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    EXIT /B 1
)

REM Kiểm tra Gradle
cd /d "%ANDROID_DIR%"
call gradlew.bat --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Gradle wrapper not found or not executable.
    EXIT /B 1
)

echo Step 1: Installing npm dependencies...
cd /d "%ANDROID_DIR%\.."
IF NOT EXIST node_modules (
    echo Installing node_modules...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed
        EXIT /B 1
    )
) ELSE (
    echo node_modules already exists, skipping...
)

echo.
echo Step 2: Building Android SDK...
cd /d "%ANDROID_DIR%"

IF "%BUILD_TYPE%"=="release" (
    echo Building RELEASE AAR...
    call gradlew.bat :sdk:assembleRelease
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: Build failed
        EXIT /B 1
    )
    
    SET AAR_FILE=%ANDROID_DIR%\sdk\build\outputs\aar\sdk-release.aar
    IF EXIST "%AAR_FILE%" (
        echo.
        echo ========================================
        echo Build SUCCESS!
        echo ========================================
        echo AAR file location:
        echo %AAR_FILE%
        echo.
        echo File size:
        FOR %%A IN ("%AAR_FILE%") DO echo %%~zA bytes
        echo.
        echo You can now use this AAR in your Flutter project.
        echo See BUILD_SDK_FOR_FLUTTER.md for integration instructions.
    ) ELSE (
        echo ERROR: AAR file not found at expected location
        EXIT /B 1
    )
) ELSE (
    echo Building DEBUG AAR...
    call gradlew.bat :sdk:assembleDebug
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: Build failed
        EXIT /B 1
    )
    
    SET AAR_FILE=%ANDROID_DIR%\sdk\build\outputs\aar\sdk-debug.aar
    IF EXIST "%AAR_FILE%" (
        echo.
        echo ========================================
        echo Build SUCCESS!
        echo ========================================
        echo AAR file location:
        echo %AAR_FILE%
        echo.
        echo You can now use this AAR in your Flutter project.
    ) ELSE (
        echo ERROR: AAR file not found at expected location
        EXIT /B 1
    )
)

ENDLOCAL




