@echo off
title Deadlock Utils
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" -Remover %*
pause
