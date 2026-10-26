@echo off
title Deadlock Utils
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0files\instalar.ps1" %*
echo.
pause
