@echo off
title Deadlock Utils - instalar mod
echo Compilando o mod...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-mod.ps1" %*
if errorlevel 1 goto erro
echo.
echo Instalando no Deadlock...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\instalar-mod.ps1" %*
if errorlevel 1 goto erro
echo.
echo Pronto! Abra o Deadlock. Loja (B): aba Deadlock Utils. Tab: itens recomendados. M: mapa. F6 ou menu ESC: tracker.
pause
exit /b 0
:erro
echo.
echo Algo deu errado (veja a mensagem acima).
pause
exit /b 1
