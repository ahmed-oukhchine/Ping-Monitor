<?php

use App\Console\Commands\GenerateReports;
use App\Console\Commands\PingAll;
use App\Console\Commands\SnmpDiscover;
use App\Console\Commands\SnmpPoll;
use Illuminate\Support\Facades\Schedule;

Schedule::command(PingAll::class)->everyMinute()->withoutOverlapping();
Schedule::command(GenerateReports::class)->everyFiveMinutes();

Schedule::command(SnmpPoll::class)->everyFiveMinutes()->withoutOverlapping();
Schedule::command(SnmpDiscover::class)->weekly()->sundays()->at('03:00');

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
