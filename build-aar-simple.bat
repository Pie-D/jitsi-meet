@echo off
REM ========================================
REM Script Build AAR SDK đơn giản nhất
REM ========================================
setlocal enabledelayedexpansion

SET PROJECT_DIR=%~dp0
SET ANDROID_DIR=%PROJECT_DIR%android
SET AAR_OUTPUT=%ANDROID_DIR%\sdk\build\outputs\aar\sdk-release.aar

echo.
echo ========================================
echo   BUILD JITSI MEET SDK AAR
echo ========================================
echo.
echo Project: %PROJECT_DIR%
echo Output: %AAR_OUTPUT%
echo.

REM Step 1: Check Node.js
echo [1/4] Checking Node.js...
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    EXIT /B 1
)
echo        Node.js: OK
node --version
echo.

REM Step 2: Install npm dependencies
echo [2/4] Installing npm dependencies...
cd /d "%PROJECT_DIR%"
IF NOT EXIST node_modules (
    echo        Installing node_modules (this may take a while)...
    call npm install
    IF !ERRORLEVEL! NEQ 0 (
        echo [ERROR] npm install failed!
        pause
        EXIT /B 1
    )
) ELSE (
    echo        node_modules exists, skipping...
)
echo        npm dependencies: OK
echo.

REM Step 3: Build AAR
echo [3/4] Building Android AAR...
echo        This may take 5-10 minutes...
cd /d "%ANDROID_DIR%"
call gradlew.bat clean :sdk:assembleRelease
IF !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Build failed!
    echo Check the error messages above.
    pause
    EXIT /B 1
)
echo        Build: OK
echo.

REM Step 4: Verify output
echo [4/4] Verifying output...
IF EXIST "%AAR_OUTPUT%" (
    echo.
    echo ========================================
    echo   BUILD SUCCESS!
    echo ========================================
    echo.
    echo AAR Location:
    echo %AAR_OUTPUT%
    echo.
    FOR %%A IN ("%AAR_OUTPUT%") DO (
        set /a SIZE_MB=%%~zA/1024/1024
        echo File Size: !SIZE_MB! MB (%%~zA bytes)
    )
    echo.
    echo You can now use this AAR in your Flutter project!
    echo See BUILD_SDK_FOR_FLUTTER.md for integration guide.
    echo.
) ELSE (
    echo [ERROR] AAR file not found at:
    echo %AAR_OUTPUT%
    echo.
    echo Build may have failed. Check the logs above.
    pause
    EXIT /B 1
)

endlocal
echo.
echo Press any key to exit...
pause >nul



