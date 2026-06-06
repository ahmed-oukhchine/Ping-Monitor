#!/bin/sh
cd "$(dirname "$0")"
echo "Starting The Bloody App..."
php artisan serve --host=localhost --port=8000 &
npm run dev &
echo "There it's"
echo "it Comming ..."
echo "The App is "
echo ""
echo ""
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."
wait
