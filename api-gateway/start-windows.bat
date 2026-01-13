@echo off
REM ERP API Gateway Startup Script for Windows
echo.
echo ========================================
echo   ERP API Gateway Server - Windows
echo ========================================
echo.

REM Proveri da li postoji .env fajl
if not exist .env (
    echo [ERROR] .env fajl ne postoji!
    echo.
    echo Kopiraj env.example u .env i azuriraj vrednosti:
    echo   copy env.example .env
    echo   notepad .env
    echo.
    pause
    exit /b 1
)

REM Proveri da li su dependencies instalirane
if not exist node_modules (
    echo [INFO] Instalacija dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Greska pri instalaciji dependencies!
        pause
        exit /b 1
    )
)

REM Proveri da li je Node.js instaliran
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js nije instaliran!
    echo.
    echo Preuzmi i instaliraj Node.js sa:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Pokretanje ERP API Gateway servera...
echo.
echo Server ce se pokrenuti na http://localhost:3001
echo Za zaustavljanje pritisni Ctrl+C
echo.

REM Pokreni server
node server.js

pause

