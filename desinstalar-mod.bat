@echo off
title Deadlock Utils - remover mod
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\instalar-mod.ps1" -Remover %*
pause
