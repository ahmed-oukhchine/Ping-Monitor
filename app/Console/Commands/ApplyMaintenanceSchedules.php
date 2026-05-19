<?php

namespace App\Console\Commands;

use App\Models\MaintenanceSchedule;
use Illuminate\Console\Command;

class ApplyMaintenanceSchedules extends Command
{
    protected $signature = 'app:apply-maintenance-schedules';
    protected $description = 'Apply or revert maintenance schedules based on time windows';

    public function handle()
    {
        $schedules = MaintenanceSchedule::where('is_active', true)->get();

        foreach ($schedules as $schedule) {
            $active = $schedule->isCurrentlyActive();

            if ($active && !$schedule->last_applied_at) {
                $schedule->apply();
                $this->info("Applied maintenance: {$schedule->name}");
            } elseif (!$active && $schedule->last_applied_at) {
                $schedule->revert();
                $this->info("Reverted maintenance: {$schedule->name}");
            }
        }

        return Command::SUCCESS;
    }
}
