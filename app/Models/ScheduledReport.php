<?php

namespace App\Models;

use App\Mail\ScheduledReportMail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Mail;

class ScheduledReport extends Model
{
    protected $table = 'scheduled_reports';

    protected $fillable = [
        'user_id', 'name', 'frequency', 'format', 'recipients', 'last_sent_at',
    ];

    protected $casts = [
        'recipients' => 'json',
        'last_sent_at' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function generateAndSend(): void
    {
        $days = $this->frequency === 'weekly' ? 7 : 30;
        $since = now()->startOfDay()->subDays($days);
        $period = $this->frequency === 'weekly' ? 'Last 7 days' : 'Last 30 days';

        $data = $this->buildReportData($since, now()->endOfDay());

        $pdf = Pdf::loadView('reports.sla', [
            'period'  => $period,
            'fleet'   => $data['fleet'],
            'targets' => $data['targets'],
        ]);

        $path = storage_path('app/temp_report_' . $this->id . '.pdf');
        $pdf->save($path);

        foreach ($this->recipients as $recipient) {
            Mail::to($recipient)->send(new ScheduledReportMail($path, $this));
        }

        $this->update(['last_sent_at' => now()->startOfDay()]);
    }

    private function buildReportData($since, $now): array
    {
        $targets = Target::all();
        $rows = [];
        $totalUptime = 0;
        $latencies = [];
        $totalOutages = 0;
        $onlineCount = 0;

        foreach ($targets as $t) {
            $pings = PingHistory::where('target_id', $t->id)
                ->whereBetween('created_at', [$since, $now])
                ->get();

            $total = $pings->count();
            $success = $pings->where('is_success', true)->count();
            $uptime = $total > 0 ? round($success / $total * 100, 1) : 0;
            $avgLat = $pings->whereNotNull('response_time')->avg('response_time');
            $maxLat = $pings->whereNotNull('response_time')->max('response_time');
            $outages = $this->countOutages($pings);

            $status = $uptime >= 99 ? 'Healthy' : ($uptime >= 95 ? 'Warning' : 'Critical');
            $statusClass = $uptime >= 99 ? 'up' : ($uptime >= 95 ? 'warn' : 'down');

            $rows[] = [
                'name'          => $t->name,
                'ip'            => $t->ip_address,
                'uptime'        => $uptime,
                'total_checks'  => $total,
                'avg_latency'   => $avgLat ? round($avgLat, 1) : '-',
                'max_latency'   => $maxLat ? round($maxLat, 1) : '-',
                'outages'       => $outages,
                'status'        => $status,
                'status_class'  => $statusClass,
            ];

            $totalUptime += $uptime;
            if ($avgLat) $latencies[] = $avgLat;
            $totalOutages += $outages;
            if ($uptime > 0) $onlineCount++;
        }

        $count = max(count($targets), 1);

        return [
            'fleet' => [
                'total'        => $targets->count(),
                'online'       => $onlineCount,
                'uptime'       => round($totalUptime / $count, 1),
                'avg_latency'  => count($latencies) > 0
                    ? round(array_sum($latencies) / count($latencies), 1) . ' ms'
                    : '-',
                'incidents'    => $totalOutages,
            ],
            'targets' => $rows,
        ];
    }

    private function countOutages($pings): int
    {
        $outages = 0;
        $inOutage = false;
        foreach ($pings as $p) {
            if (!$p->is_success && !$inOutage) {
                $outages++;
                $inOutage = true;
            } elseif ($p->is_success) {
                $inOutage = false;
            }
        }
        return $outages;
    }
}
