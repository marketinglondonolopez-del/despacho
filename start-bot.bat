@echo off
title Bot de WhatsApp - Sistema de Despacho
echo ==============================================================
echo INICIANDO BOT DE WHATSAPP (MODO GRUPO)
echo ==============================================================
echo.
echo Por favor, espera unos segundos a que se genere el Codigo QR...
echo.
cd /d "%~dp0"
npm run bot
pause
