<?php

namespace App\Console\Commands;

use App\Models\ScheduledReport;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GenerateReports extends Command
{
    protected $signature = 'reports:generate';
    protected $description = 'Generate and email scheduled SLA reports';

    public function handle(): void
    {
        $reports = ScheduledReport::all();
        if ($reports->isEmpty()) {
            $this->info('No scheduled reports configured.');
            return;
        }

        foreach ($reports as $report) {
            if (!$this->isDue($report)) continue;

            $report->generateAndSend();
            $this->info("Report '{$report->name}' sent to " . implode(', ', $report->recipients));
        }
    }

    private function isDue(ScheduledReport $report): bool
    {
        $now = now();

        if ($report->last_sent_at && $report->last_sent_at->isToday()) {
            return false;
        }

        if ($now->hour < 9) {
            return false;
        }

        return match ($report->frequency) {
            'weekly' => $now->dayOfWeek === Carbon::MONDAY,
            'monthly' => $now->dayOfWeek === Carbon::MONDAY && $now->day <= 7,
            default => false,
        };
    }
}
