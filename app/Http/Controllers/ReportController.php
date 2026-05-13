<?php

namespace App\Http\Controllers;

use App\Models\PingHistory;
use App\Models\Target;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function apiReport(Request $request)
    {
        $targetId = $request->input('target_id');
        $dateFrom = $request->input('date_from');
        $dateTo   = $request->input('date_to');

        $targetsList = Target::orderBy('name')->get(['id', 'name']);

        $query = PingHistory::query()
            ->when($targetId, fn($q) => $q->where('target_id', $targetId))
            ->when($dateFrom, fn($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo,   fn($q) => $q->whereDate('created_at', '<=', $dateTo));

        $stats = $query->clone()
            ->selectRaw('target_id')
            ->selectRaw('COUNT(*) as total_pings')
            ->selectRaw('SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) as failed_pings')
            ->selectRaw('AVG(response_time) as avg_response_time')
            ->groupBy('target_id')
            ->with('target:id,name,ip_address')
            ->get()
            ->map(function ($s) {
                return [
                    'target_id'         => $s->target_id,
                    'target_name'       => $s->target?->name ?? '—',
                    'target_ip'         => $s->target?->ip_address ?? '—',
                    'total_pings'       => (int) $s->total_pings,
                    'failed_pings'      => (int) $s->failed_pings,
                    'uptime_percent'    => $s->total_pings > 0
                        ? round(($s->total_pings - $s->failed_pings) / $s->total_pings * 100, 2)
                        : null,
                    'avg_response_time' => $s->avg_response_time !== null
                        ? round((float) $s->avg_response_time, 2)
                        : null,
                ];
            })
            ->values();

        $totalPings  = $stats->sum('total_pings');
        $totalFailed = $stats->sum('failed_pings');

        $daily = $query->clone()
            ->selectRaw("DATE(created_at) as date")
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) as failed')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($d) {
                $total = (int) $d->total;
                $failed = (int) $d->failed;
                return [
                    'date'   => $d->date,
                    'total'  => $total,
                    'failed' => $failed,
                    'uptime' => $total > 0 ? round(($total - $failed) / $total * 100, 1) : 0,
                ];
            });

        return response()->json([
            'targets'  => $targetsList,
            'stats'    => $stats,
            'summary'  => [
                'total_targets' => $stats->count(),
                'total_pings'   => $totalPings,
                'total_failed'  => $totalFailed,
                'fleet_uptime'  => $totalPings > 0
                    ? round(($totalPings - $totalFailed) / $totalPings * 100, 2)
                    : null,
                'avg_latency'   => $stats->avg('avg_response_time') !== null
                    ? round((float) $stats->avg('avg_response_time'), 2)
                    : null,
            ],
            'daily'    => $daily,
        ]);
    }
}
