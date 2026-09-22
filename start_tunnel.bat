@echo off
title GYAN AI - Cloudflare Public Tunnel
echo ===================================================
echo   GYAN AI Companion - Starting Public HTTPS Tunnel
echo ===================================================
echo.
npx -y cloudflared tunnel --url http://127.0.0.1:5000
pause
