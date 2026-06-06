<?php

namespace App\Http\Controllers;

use App\Mail\TargetDownAlert;
use App\Models\AuditLog;
use App\Models\Group;
use App\Models\PingHistory;
use App\Models\Setting;
use App\Models\Target;
use App\Services\PingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class PingController extends Controller
{
    public function __construct(
        private readonly PingService $ping,
    ) {}

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
                'snmp_enabled'           => $t->snmp_enabled,
                'snmp_community'         => $t->snmp_community,
                'snmp_version'           => $t->snmp_version,
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
            fputs($handle, "\xEF\xBB\xBF");
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

    public function exportPdf(Request $request)
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

        $records = $applyFilters(PingHistory::with('target:id,name,ip_address'))
            ->orderBy('created_at', 'desc')
            ->limit(2000)
            ->get();

        $total = $records->count();
        $successCount = $records->where('is_success', true)->count();
        $failCount = $total - $successCount;
        $successRate = $total > 0 ? ($successCount / $total) * 100 : 0;

        $targetName = $targetId ? Target::find($targetId)?->name : null;

        $filters = [
            'target'    => $targetName,
            'status'    => $status,
            'latency'   => $latency,
            'date_from' => $dateFrom,
            'date_to'   => $dateTo,
        ];

        $filename = 'ping-history-' . now()->format('Y-m-d') . '.pdf';

        ini_set('memory_limit', '512M');
        $pdf = Pdf::loadView('pdf.history', compact('records', 'total', 'successCount', 'failCount', 'successRate', 'filters'));
        $pdf->setPaper('a4', 'landscape');

        return $pdf->download($filename);
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
            'escalation_email'       => 'nullable|email|max:255',
            'escalation_after_minutes' => 'nullable|integer|min:1|max:10080',
            'snmp_enabled'           => 'boolean',
            'snmp_community'         => 'nullable|string|max:100',
            'snmp_version'           => 'nullable|string|in:1,2c,3',
            'group_ids'              => 'nullable|array',
            'group_ids.*'            => 'integer|exists:groups,id',
        ]);

        $data = $request->only('name', 'ip_address', 'location', 'notes', 'warn_ms', 'critical_ms', 'alert_email', 'alert_consecutive', 'alert_cooldown_minutes', 'escalation_email', 'escalation_after_minutes', 'snmp_enabled', 'snmp_community', 'snmp_version');
        $data['warn_ms'] ??= Setting::getValue('alert_default_warn_ms', 100);
        $data['critical_ms'] ??= Setting::getValue('alert_default_critical_ms', 300);
        $data['alert_email'] ??= Setting::getValue('alert_default_email', '');
        $data['alert_consecutive'] ??= Setting::getValue('alert_default_consecutive', 3);
        $data['alert_cooldown_minutes'] ??= Setting::getValue('alert_default_cooldown', 15);
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
            'escalation_email'       => 'nullable|email|max:255',
            'escalation_after_minutes' => 'nullable|integer|min:1|max:10080',
            'snmp_enabled'           => 'boolean',
            'snmp_community'         => 'nullable|string|max:100',
            'snmp_version'           => 'nullable|string|in:1,2c,3',
            'group_ids'              => 'nullable|array',
            'group_ids.*'            => 'integer|exists:groups,id',
        ]);

        $old = $target->toArray();
        $data = $request->only('name', 'ip_address', 'location', 'notes', 'warn_ms', 'critical_ms', 'alert_email', 'alert_consecutive', 'alert_cooldown_minutes', 'escalation_email', 'escalation_after_minutes', 'snmp_enabled', 'snmp_community', 'snmp_version');
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

    public function dependencies(Target $target)
    {
        return response()->json($target->dependencies()->get(['id', 'name', 'ip_address', 'last_status']));
    }

    public function addDependency(Request $request, Target $target)
    {
        $data = $request->validate([
            'depends_on_target_id' => 'required|integer|exists:targets,id|different:target_id',
        ]);
        $data['target_id'] = $target->id;

        $existing = \App\Models\TargetDependency::where([
            'target_id' => $target->id, 'depends_on_target_id' => $data['depends_on_target_id'],
        ])->exists();

        if ($existing) {
            return response()->json(['message' => 'Dependency already exists'], 409);
        }

        $dep = \App\Models\TargetDependency::create($data);
        AuditLog::log('created', 'target_dependency', $dep->id, null, $dep->toArray());
        return response()->json($dep, 201);
    }

    public function removeDependency(Target $target, Target $dependsOnTarget)
    {
        $deleted = \App\Models\TargetDependency::where([
            'target_id' => $target->id, 'depends_on_target_id' => $dependsOnTarget->id,
        ])->delete();

        if ($deleted) {
            AuditLog::log('deleted', 'target_dependency', null, null, [
                'target_id' => $target->id, 'depends_on_target_id' => $dependsOnTarget->id,
            ]);
        }
        return response()->json(['deleted' => (bool) $deleted]);
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
                Mail::to($email)->queue(new TargetDownAlert($target));
            }
            $target->update(['alerted_at' => now()]);
        } catch (\Exception $e) {
            \Log::error("SIREN alert failed for target {$target->id}: {$e->getMessage()}");
        }
    }

    public function downloadTemplate()
    {
        $path = storage_path('app/templates/targets_template.csv');
        return response()->download($path, 'targets_import_template.csv');
    }

    public function importCsv(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:2048']);

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = fgetcsv($handle);

        $expected = ['name', 'ip_address', 'location', 'groups', 'alert_email', 'warn_ms', 'critical_ms', 'snmp_enabled', 'snmp_community'];
        $header = array_map('trim', $header);

        $imported = 0;
        $errors = [];

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);

            $validator = validator($data, [
                'name'       => 'required|string|max:100',
                'ip_address' => 'required|string|max:100',
            ]);

            if ($validator->fails()) {
                $errors[] = 'Row ' . ($imported + 2) . ': ' . implode(', ', $validator->errors()->all());
                continue;
            }

            $target = Target::create([
                'name'                => $data['name'],
                'ip_address'          => $data['ip_address'],
                'location'            => $data['location'] ?? null,
                'alert_email'         => $data['alert_email'] ?? null,
                'warn_ms'             => $data['warn_ms'] ?? null,
                'critical_ms'         => $data['critical_ms'] ?? null,
                'snmp_enabled'        => filter_var($data['snmp_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'snmp_community'      => $data['snmp_community'] ?? null,
            ]);

            if (!empty($data['groups'])) {
                $groupNames = array_map('trim', explode(',', $data['groups']));
                $groupIds = [];
                foreach ($groupNames as $gName) {
                    if (empty($gName)) continue;
                    $group = Group::firstOrCreate(['name' => $gName]);
                    $groupIds[] = $group->id;
                }
                if (!empty($groupIds)) {
                    $target->groups()->sync($groupIds);
                }
            }

            AuditLog::log('created', 'Target', $target->id, null, $target->toArray());
            $imported++;
        }

        fclose($handle);

        return response()->json([
            'imported' => $imported,
            'errors'   => $errors,
            'message'  => "Imported {$imported} target(s)" . (count($errors) > 0 ? ' with ' . count($errors) . ' error(s)' : ''),
        ]);
    }

    private function thresholdStatus(Target $target, ?float $responseTime): ?string
    {
        return $this->ping->thresholdStatus($target, $responseTime);
    }
}
