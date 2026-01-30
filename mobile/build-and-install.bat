@echo off
echo ========================================
echo Building and Installing TutorBox CRM
echo ========================================

echo.
echo [1/5] Syncing web assets to Android...
call npx cap sync android

if %ERRORLEVEL% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Cleaning previous build...
cd android
call gradlew clean

echo.
echo [3/5] Building fresh APK...
call gradlew assembleDebug

if %ERRORLEVEL% neq 0 (
    echo ERROR: APK build failed!
    pause
    exit /b 1
)

cd ..

echo.
echo [4/5] Uninstalling old version...
call adb uninstall com.ciudadbilingue.tutorboxcrm

echo.
echo [5/5] Installing fresh version...
call adb install android/app/build/outputs/apk/debug/app-debug.apk

if %ERRORLEVEL% neq 0 (
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS: TutorBox CRM installed!
echo ========================================
pause
