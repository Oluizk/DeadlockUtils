@echo off
title Deadlock Utils - install (from source)
echo Building the mod...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-mod.ps1"
if errorlevel 1 goto erro
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\instalar-mod.ps1" %*
echo.
pause
exit /b 0
:erro
echo.
echo Build failed (see the message above).
pause
exit /b 1
