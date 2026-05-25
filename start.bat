@echo off
cd /d "%~dp0"
echo Starting ArgusNet...
start "Laravel" cmd /c "php artisan serve --host=0.0.0.0 --port=8000"
start "Vite"   cmd /c "npm run dev"
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo Close both windows to stop.
