#!/bin/sh
cd "$(dirname "$0")"
echo "Starting ArgusNet..."
php artisan serve --host=0.0.0.0 --port=8000 &
npm run dev &
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."
wait
