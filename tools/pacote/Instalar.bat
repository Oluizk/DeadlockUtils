@echo off
title Deadlock Utils
echo Instalando o Deadlock Utils... / Installing Deadlock Utils...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" %*
if errorlevel 1 goto erro
echo.
echo Pronto! Abra o Deadlock. Loja (B): aba Deadlock Utils. Tab: itens recomendados. M: mapa. F6: tracker.
echo Done! Open Deadlock. Shop (B): Deadlock Utils tab. Tab: recommended items. M: map. F6: tracker.
pause
exit /b 0
:erro
echo.
echo Algo deu errado (veja a mensagem acima). / Something went wrong (see the message above).
pause
exit /b 1
