@echo off
chcp 65001 >nul
title Nevers Support

echo.
echo   ╭────────────────────────────────────────────╮
echo   │  Nevers Support                            │
echo   ╰────────────────────────────────────────────╯
echo.

set ROOT=%~dp0
cd /d "%ROOT%"

if not exist "backend\.env" (
    echo   [warn]  backend\.env missing — copying .env.example…
    copy "backend\.env.example" "backend\.env" >nul
    echo   [ok]    Set DB_* values in backend\.env for PostgreSQL 16+.
    echo.
)

if not exist "backend\node_modules" (
    echo   [deps]  Backend: npm install…
    cd backend
    call npm install
    cd "%ROOT%"
    echo.
)

if not exist "frontend\node_modules" (
    echo   [deps]  Frontend: npm install…
    cd frontend
    call npm install
    cd "%ROOT%"
    echo.
)

echo   [run]   Backend  ^>  http://localhost:3000/api
start "Nevers — Backend API" cmd /k "cd /d "%ROOT%backend" && npm run start:dev"

timeout /t 3 /nobreak >nul

echo   [run]   Frontend ^>  http://localhost:4200
start "Nevers — Frontend" cmd /k "cd /d "%ROOT%frontend" && npm start"

echo.
echo   ────────────────────────────────────────────
echo   URL     API        http://localhost:3000/api
echo   URL     App        http://localhost:4200
echo.
echo   Login   ADMIN_EMAIL / ADMIN_PASSWORD in backend\.env
echo   ────────────────────────────────────────────
echo.
pause
