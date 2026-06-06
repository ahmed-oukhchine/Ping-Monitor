<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\PingHistory;
use App\Models\Target;
use App\Services\PingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class PingAll extends Command
{
    protected $signature = 'ping:all';
    protected $description = 'Ping all non-paused targets and record results';

    public function __construct(
        private readonly PingService $ping,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $targets = Target::where('is_paused', false)->get();

        if ($targets->isEmpty()) {
            $this->warn('No targets to ping.');
            return Command::SUCCESS;
        }

        $bar = $this->output->createProgressBar($targets->count());
        $bar->start();

        $success = 0;
        $failed  = 0;

        foreach ($targets as $target) {
            $result = $this->ping->performPing($target->ip_address);

            PingHistory::create([
                'target_id'     => $target->id,
                'is_success'    => $result['success'],
                'response_time' => $result['response_time'] ?? null,
                'error_message' => $result['error'] ?? '',
            ]);

            $this->maybeAlert($target, $result['success']);

            if ($result['success']) {
                $success++;
            } else {
                $failed++;
            }

            $bar->advance();
        }

        $bar->finish();
        AuditLog::log('ping_all', 'target', null, null, [
            'total' => $success + $failed,
            'success' => $success,
            'failed' => $failed,
        ]);

        $this->newLine();
        $this->info("Done — {$success} online, {$failed} offline");

        return Command::SUCCESS;
    }

    private function maybeAlert(Target $target, bool $success): void
    {
        if ($success) {
            if ($target->alerted_at) {
                $target->update(['alerted_at' => null]);
            }
            return;
        }

        $failedDeps = $target->dependencies()->whereHas('latestPing', fn($q) => $q->where('is_success', false))->count();
        if ($failedDeps > 0) return;

        if (!$target->alert_email) return;

        $threshold = max(1, (int) ($target->alert_consecutive ?? 3));

        $recentPings = PingHistory::where('target_id', $target->id)
            ->orderBy('created_at', 'desc')
            ->limit($threshold)
            ->pluck('is_success');

        if ($recentPings->count() < $threshold || $recentPings->contains(true)) {
            return;
        }

        $cooldown = max(1, (int) ($target->alert_cooldown_minutes ?? 60));
        if ($target->alerted_at && $target->alerted_at->diffInMinutes(now()) < $cooldown) {
            return;
        }

        try {
            if (!$target->alerted_at || $target->alerted_at->diffInMinutes(now()) >= ($target->escalation_after_minutes ?? 999999)) {
                $email = $target->alerted_at && $target->escalation_email
                    ? $target->escalation_email
                    : $target->alert_email;
                Mail::to($email)->queue(new \App\Mail\TargetDownAlert($target));
            }
            $target->update(['alerted_at' => now()]);
        } catch (\Exception $e) {
            \Log::error("SIREN alert failed for target {$target->id}: {$e->getMessage()}");
        }
    }
}
