@echo off
title TextBoard - Executable Packaging Pipeline
color 0b
echo =======================================================================
echo         ⚡ TEXTBOARD - AUTOMATED DESKTOP EXECUTABLE BUILDER
echo =======================================================================
echo.
echo [1/3] Compiling Backend Engine (NestJS)...
cd /d "%~dp0backend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Compiling Frontend UI (Next.js)...
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Packaging Windows Executable (.exe) with Electron Builder...
cd /d "%~dp0"
call npm run electron:dist
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Electron packaging failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =======================================================================
echo   ✓ SUCCESS! Your Windows .exe installer and portable files are ready!
echo   Location: dist-desktop\
echo =======================================================================
pause
