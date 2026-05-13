<?php

use App\Console\Commands\PingAll;
use Illuminate\Support\Facades\Schedule;

// ── Scheduled Ping ─────────────────────────────────────────────────────────
// To activate, add this to your system cron:
//   * * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1

Schedule::command(PingAll::class)->everyMinute()->withoutOverlapping();

// ── Inspirational (default) ───────────────────────────────────────────────
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
