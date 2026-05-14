<?php

namespace App\Http\Controllers;

use App\Mail\TargetDownAlert;
use App\Models\AuditLog;
use App\Models\Group;
use App\Models\PingHistory;
use App\Models\Target;
use App\Services\PingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class PingController extends Controller
{
    public function __construct(
        private readonly PingService $ping,
    ) {}

    // ── API ──────────────────────────────────────────────────────────────────

    public function apiTargets()
    {
        $targets = Target::withCount([
            'pingHistories as total_pings',
            'pingHistories as failed_pings' => fn($q) => $q->where('is_success', false),
        ])
        ->withAvg('pingHistories as avg_response_time', 'response_time')
        ->with(['latestPing', 'groups'])
        ->orderBy('created_at')
        ->get()
        ->map(function ($t) {
            $last = $t->latestPing;
            return [
                'id'                 => $t->id,
                'name'               => $t->name,
                'ip_address'         => $t->ip_address,
                'location'           => $t->location,
                'is_paused'          => (bool) $t->is_paused,
                'warn_ms'            => $t->warn_ms,
                'critical_ms'        => $t->critical_ms,
                'threshold_status'   => $this->thresholdStatus($t, $last?->response_time),
                'groups'             => $t->groups->map(fn($g) => ['id' => $g->id, 'name' => $g->name, 'color' => $g->color])->values(),
                'total_pings'        => $t->total_pings,
                'failed_pings'       => $t->failed_pings,
                'uptime_percent'     => $t->total_pings > 0
                    ? round(($t->total_pings - $t->failed_pings) / $t->total_pings * 100, 1)
                    : null,
                'avg_response_time'  => $t->avg_response_time !== null
                    ? round($t->avg_response_time, 2)
                    : null,
                'notes'                  => $t->notes,
                'alert_email'            => $t->alert_email,
                'alert_consecutive'      => $t->alert_consecutive,
                'alert_cooldown_minutes' => $t->alert_cooldown_minutes,
                'last_status'            => $last?->is_success,
                'last_response_time'     => $last?->response_time,
                'last_ping_at'           => $last?->created_at,
                'created_at'             => $t->created_at,
            ];
        });

        return response()->json($targets);
    }

    public function apiHistory(Request $request)
    {
        $targets  = Target::orderBy('name')->get(['id', 'name']);
        $targetId = $request->input('target_id');
        $status   = $request->input('status');    // 'online' | 'offline'
        $dateFrom = $request->input('date_from'); // Y-m-d
        $dateTo   = $request->input('date_to');   // Y-m-d
        $latency  = $request->input('latency');   // 'fast' | 'medium' | 'slow'

        $applyFilters = function ($q) use ($targetId, $status, $dateFrom, $dateTo, $latency) {
            return $q
                ->when($targetId,             fn($q) => $q->where('target_id', $targetId))
                ->when($status === 'online',  fn($q) => $q->where('is_success', true))
                ->when($status === 'offline', fn($q) => $q->where('is_success', false))
                ->when($dateFrom,             fn($q) => $q->whereDate('created_at', '>=', $dateFrom))
                ->when($dateTo,               fn($q) => $q->whereDate('created_at', '<=', $dateTo))
                ->when($latency === 'fast',   fn($q) => $q->where('response_time', '<', 50))
                ->when($latency === 'medium', fn($q) => $q->whereBetween('response_time', [50, 150]))
                ->when($latency === 'slow',   fn($q) => $q->where('response_time', '>', 150));
        };

        $histories    = $applyFilters(PingHistory::with('target:id,name,ip_address'))
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $successCount = $applyFilters(PingHistory::query())->where('is_success', true)->count();

        return response()->json([
            'data'    => $histories->items(),
            'meta'    => [
                'current_page'  => $histories->currentPage(),
                'last_page'     => $histories->lastPage(),
                'per_page'      => $histories->perPage(),
                'total'         => $histories->total(),
                'success_count' => $successCount,
                'fail_count'    => $histories->total() - $successCount,
            ],
            'targets' => $targets,
        ]);
    }

    public function exportCsv(Request $request)
    {
        $targetId = $request->input('target_id');
        $status   = $request->input('status');
        $dateFrom = $request->input('date_from');
        $dateTo   = $request->input('date_to');
        $latency  = $request->input('latency');

        $applyFilters = function ($q) use ($targetId, $status, $dateFrom, $dateTo, $latency) {
            return $q
                ->when($targetId,             fn($q) => $q->where('target_id', $targetId))
                ->when($status === 'online',  fn($q) => $q->where('is_success', true))
                ->when($status === 'offline', fn($q) => $q->where('is_success', false))
                ->when($dateFrom,             fn($q) => $q->whereDate('created_at', '>=', $dateFrom))
                ->when($dateTo,               fn($q) => $q->whereDate('created_at', '<=', $dateTo))
                ->when($latency === 'fast',   fn($q) => $q->where('response_time', '<', 50))
                ->when($latency === 'medium', fn($q) => $q->whereBetween('response_time', [50, 150]))
                ->when($latency === 'slow',   fn($q) => $q->where('response_time', '>', 150));
        };

        $filename = 'ping-history-' . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-cache, no-store',
            'Pragma'              => 'no-cache',
        ];

        $callback = function () use ($applyFilters) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($handle, ['Time', 'Target', 'IP Address', 'Status', 'Latency (ms)', 'Error']);

            $applyFilters(PingHistory::with('target:id,name,ip_address'))
                ->orderBy('created_at', 'desc')
                ->chunk(500, function ($rows) use ($handle) {
                    foreach ($rows as $row) {
                        fputcsv($handle, [
                            '="' . $row->created_at->format('Y-m-d H:i:s') . '"',
                            $row->target?->name ?? '',
                            $row->target?->ip_address ?? '',
                            $row->is_success ? 'Online' : 'Offline',
                            $row->response_time ?? '',
                            $row->error_message ?? '',
                        ]);
                    }
                });

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function apiIncidents(Request $request)
    {
        $targetId = $request->input('target_id');
        $dateFrom = $request->input('date_from');
        $dateTo   = $request->input('date_to');
        $perPage  = 20;
        $page     = max(1, (int) $request->input('page', 1));

        $targets = Target::orderBy('name')->get(['id', 'name']);

        $query = PingHistory::with('target:id,name,ip_address')
            ->when($targetId, fn($q) => $q->where('target_id', $targetId))
            ->when($dateFrom, fn($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo,   fn($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->orderBy('target_id')
            ->orderBy('created_at');

        $incidents       = [];
        $currentTargetId = null;
        $openIncident    = null;

        $query->chunk(1000, function ($pings) use (&$incidents, &$currentTargetId, &$openIncident) {
            foreach ($pings as $ping) {
                // Crossed into a new target's block
                if ($ping->target_id !== $currentTargetId) {
                    if ($openIncident !== null) {
                        $openIncident['ongoing'] = true;
                        $incidents[] = $openIncident;
                        $openIncident = null;
                    }
                    $currentTargetId = $ping->target_id;
                }

                if (!$ping->is_success) {
                    if ($openIncident === null) {
                        $openIncident = [
                            'target_id'    => $ping->target_id,
                            'target_name'  => $ping->target?->name ?? '—',
                            'target_ip'    => $ping->target?->ip_address ?? '—',
                            'started_at'   => $ping->created_at,
                            'ended_at'     => null,
                            'duration_sec' => null,
                            'ping_count'   => 1,
                            'ongoing'      => false,
                        ];
                    } else {
                        $openIncident['ping_count']++;
                    }
                } else {
                    if ($openIncident !== null) {
                        $openIncident['ended_at']     = $ping->created_at;
                        $openIncident['duration_sec'] = $ping->created_at->diffInSeconds($openIncident['started_at']);
                        $openIncident['ongoing']       = false;
                        $incidents[] = $openIncident;
                        $openIncident = null;
                    }
                }
            }
        });

        if ($openIncident !== null) {
            $openIncident['ongoing'] = true;
            $incidents[] = $openIncident;
        }

        // Most recent first
        usort($incidents, fn($a, $b) => $b['started_at'] <=> $a['started_at']);

        $total = count($incidents);
        $items = array_values(array_slice($incidents, ($page - 1) * $perPage, $perPage));

        return response()->json([
            'data'    => $items,
            'meta'    => [
                'current_page' => $page,
                'last_page'    => max(1, (int) ceil($total / $perPage)),
                'per_page'     => $perPage,
                'total'        => $total,
                'ongoing'      => count(array_filter($incidents, fn($i) => $i['ongoing'])),
            ],
            'targets' => $targets,
        ]);
    }

    public function apiChartData(Target $target)
    {
        $data = PingHistory::where('target_id', $target->id)
            ->orderBy('created_at', 'desc')
            ->limit(60)
            ->get(['is_success', 'response_time', 'created_at'])
            ->reverse()
            ->values();

        return response()->json($data);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $request->validate([
            'name'                   => 'required|string|max:100',
            'ip_address'             => 'required|string|max:100|regex:/^[\w.\-:]+$/',
            'location'               => 'required|string|max:100',
            'notes'                  => 'nullable|string|max:1000',
            'warn_ms'                => 'nullable|integer|min:1|max:60000',
            'critical_ms'            => 'nullable|integer|min:1|max:60000',
            'alert_email'            => 'nullable|email|max:255',
            'alert_consecutive'      => 'nullable|integer|min:1|max:20',
            'alert_cooldown_minutes' => 'nullable|integer|min:1|max:10080',
            'group_ids'              => 'nullable|array',
            'group_ids.*'            => 'integer|exists:groups,id',
        ]);

        $data = $request->only('name', 'ip_address', 'location', 'notes', 'warn_ms', 'critical_ms', 'alert_email', 'alert_consecutive', 'alert_cooldown_minutes');
        $data['alert_consecutive'] ??= 3;
        $data['alert_cooldown_minutes'] ??= 60;
        $target = Target::create($data);

        if ($request->filled('group_ids')) {
            $target->groups()->sync($request->group_ids);
        }

        AuditLog::log('created', 'target', $target->id, null, $target->toArray());

        return response()->json($target, 201);
    }

    public function update(Request $request, Target $target)
    {
        $request->validate([
            'name'                   => 'required|string|max:100',
            'ip_address'             => 'required|string|max:100|regex:/^[\w.\-:]+$/',
            'location'               => 'required|string|max:100',
            'notes'                  => 'nullable|string|max:1000',
            'warn_ms'                => 'nullable|integer|min:1|max:60000',
            'critical_ms'            => 'nullable|integer|min:1|max:60000',
            'alert_email'            => 'nullable|email|max:255',
            'alert_consecutive'      => 'nullable|integer|min:1|max:20',
            'alert_cooldown_minutes' => 'nullable|integer|min:1|max:10080',
            'group_ids'              => 'nullable|array',
            'group_ids.*'            => 'integer|exists:groups,id',
        ]);

        $old = $target->toArray();
        $data = $request->only('name', 'ip_address', 'location', 'notes', 'warn_ms', 'critical_ms', 'alert_email', 'alert_consecutive', 'alert_cooldown_minutes');
        $data['alert_consecutive'] ??= 3;
        $data['alert_cooldown_minutes'] ??= 60;
        $target->update($data);
        $target->groups()->sync($request->input('group_ids', []));

        AuditLog::log('updated', 'target', $target->id, $old, $target->fresh()->toArray());

        return response()->json($target);
    }

    public function destroy(Target $target)
    {
        AuditLog::log('deleted', 'target', $target->id, $target->toArray());
        $target->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Ping ─────────────────────────────────────────────────────────────────

    public function ping(Target $target)
    {
        $result = $this->ping->performPing($target->ip_address);

        $this->ping->recordPing($target->id, $result);

        $this->maybeAlert($target, $result['success']);

        $result['loss_percent']     = $this->ping->lossPercent($target->id);
        $result['threshold_status'] = $this->ping->thresholdStatus($target, $result['response_time'] ?? null);

        AuditLog::log('pinged', 'target', $target->id, null, [
            'success' => $result['success'],
            'response_time' => $result['response_time'] ?? null,
        ]);

        return response()->json($result);
    }

    public function pingAll()
    {
        $targets = Target::all();
        $results = [];

        foreach ($targets as $target) {
            if ($target->is_paused) continue;
            $result = $this->ping->performPing($target->ip_address);
            $result['target_id']   = $target->id;
            $result['target_name'] = $target->name;

            $this->ping->recordPing($target->id, $result);

            $this->maybeAlert($target, $result['success']);

            $result['loss_percent']     = $this->ping->lossPercent($target->id);
            $result['threshold_status'] = $this->ping->thresholdStatus($target, $result['response_time'] ?? null);
            $results[] = $result;
        }

        AuditLog::log('ping_all', 'target', null, null, [
            'total' => count($results),
            'success' => count(array_filter($results, fn($r) => $r['success'])),
            'failed' => count(array_filter($results, fn($r) => !$r['success'])),
        ]);

        return response()->json(['results' => $results]);
    }

    public function pause(Target $target)
    {
        $target->update(['is_paused' => true]);
        AuditLog::log('paused', 'target', $target->id);
        return response()->json(['is_paused' => true]);
    }

    public function resume(Target $target)
    {
        $target->update(['is_paused' => false]);
        AuditLog::log('resumed', 'target', $target->id);
        return response()->json(['is_paused' => false]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function maybeAlert(Target $target, bool $success): void
    {
        // On recovery, reset cooldown so the next outage always alerts
        if ($success) {
            if ($target->alerted_at) {
                $target->update(['alerted_at' => null]);
            }
            return;
        }

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
            Mail::to($target->alert_email)->queue(new TargetDownAlert($target));
            $target->update(['alerted_at' => now()]);
        } catch (\Exception $e) {
            \Log::error("ArgusNet alert failed for target {$target->id}: {$e->getMessage()}");
        }
    }

    private function thresholdStatus(Target $target, ?float $responseTime): ?string
    {
        return $this->ping->thresholdStatus($target, $responseTime);
    }
}
