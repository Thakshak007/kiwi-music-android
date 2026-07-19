@echo off
title kiwi Music Launcher
cd /d "%~dp0"

echo =======================================================
echo              KIWI MUSIC DESKTOP LAUNCHER
echo =======================================================
echo.

set EXE_PATH=dist\kiwi-music-win32-x64\kiwi-music.exe

if exist "%EXE_PATH%" (
    echo [INFO] Launching Kiwi Music application...
    start "" "%EXE_PATH%"
) else (
    echo [WARNING] Packaged application executable not found!
    echo [INFO] Reassembling application package...
    node build-exe.js
    if exist "%EXE_PATH%" (
        echo [INFO] Package assembled successfully! Launching...
        start "" "%EXE_PATH%"
    ) else (
        echo [ERROR] Failed to launch application.
        pause
    )
)
