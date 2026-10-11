@echo off
echo [INFO] Starting Nevers Support with Docker...
echo [INFO] Checking configuration...

if not exist ".env" (
    echo [WARN] .env missing — copying .env.example...
    copy ".env.example" ".env" >nul
    echo [WARN] Update passwords in .env, then run again.
    pause
    exit /b 1
)

docker-compose down
docker-compose up --build -d

echo.
echo [SUCCESS] Stack is up.
echo [INFO] Frontend: http://localhost:8080
echo [INFO] Backend: http://localhost:3000/api
echo.
pause
