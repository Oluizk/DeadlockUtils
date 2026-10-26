@echo off
title Deadlock Utils - uninstall
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\instalar-mod.ps1" -Remover %*
echo.
pause
