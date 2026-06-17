@echo off
chcp 65001 >nul
title SCON PJ Dev Server

echo ============================================
echo   SCON PJ - Local Dev Server Startup
echo ============================================
echo.

echo [1/3] Starting Docker MariaDB...
docker compose up -d 2>nul
if %ERRORLEVEL% NEQ 0 (
  docker-compose up -d 2>nul
)
echo.

echo [2/3] Starting Backend (port 3001)...
start "SCON Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend (port 5173)...
start "SCON Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ============================================
echo   Server started!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3001
echo ============================================
echo.
echo   [Test Accounts]
echo   admin   : admin@scon.com   / scon1234
echo   manager : manager@scon.com / scon1234
echo   member  : dev@scon.com     / scon1234
echo ============================================
echo.
pause
