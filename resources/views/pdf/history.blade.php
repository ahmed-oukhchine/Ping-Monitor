<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 24px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #333; }
    h1 { font-size: 16px; color: #2563eb; margin-bottom: 2px; }
    .sub { color: #888; font-size: 8px; margin-bottom: 14px; }
    .filters { background: #f3f4f6; padding: 6px 10px; border-radius: 4px; font-size: 8px; color: #666; margin-bottom: 12px; }
    .filters strong { color: #333; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #2563eb; color: #fff; padding: 5px 6px; text-align: left; font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 8px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .success { color: #16a34a; font-weight: bold; }
    .fail { color: #dc2626; font-weight: bold; }
    .mono { font-family: "DejaVu Sans Mono", monospace; font-size: 7px; }
    .footer { margin-top: 20px; text-align: center; font-size: 7px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 8px; }
</style>
</head>
<body>
    <h1>Ping History Report</h1>
    <p class="sub">Generated {{ now()->format('M d, Y H:i') }}</p>

    @if($filters)
    <div class="filters">
        Filters:
        @if($filters['target']) <strong>Target:</strong> {{ $filters['target'] }} @endif
        @if($filters['status']) <strong>Status:</strong> {{ ucfirst($filters['status']) }} @endif
        @if($filters['latency']) <strong>Latency:</strong> {{ ucfirst($filters['latency']) }} @endif
        @if($filters['date_from']) <strong>From:</strong> {{ $filters['date_from'] }} @endif
        @if($filters['date_to']) <strong>To:</strong> {{ $filters['date_to'] }} @endif
        @if(!$filters['target'] && !$filters['status'] && !$filters['latency'] && !$filters['date_from'] && !$filters['date_to'])
            None (all records)
        @endif
    </div>
    @endif

    <p style="font-size:8px;color:#888;margin-bottom:8px;">
        <strong>{{ $total }}</strong> records |
        <strong style="color:#16a34a">{{ $successCount }} ok</strong> |
        <strong style="color:#dc2626">{{ $failCount }} failed</strong> |
        {{ number_format($successRate, 1) }}% success rate
    </p>

    <table>
        <thead>
            <tr>
                <th>Time</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            @forelse($records as $r)
            <tr>
                <td class="mono">{{ $r->created_at->format('Y-m-d H:i:s') }}</td>
                <td>{{ $r->target?->name ?? '—' }}</td>
                <td class="mono">{{ $r->target?->ip_address ?? '—' }}</td>
                <td class="{{ $r->is_success ? 'success' : 'fail' }}">{{ $r->is_success ? 'Online' : 'Offline' }}</td>
                <td>{{ $r->response_time ? $r->response_time . ' ms' : '—' }}</td>
                <td style="color:#dc2626;">{{ $r->error_message ?? '—' }}</td>
            </tr>
            @empty
            <tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">No records match the selected filters.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        SIREN — Network Monitor | Page {PAGE_NUM} of {PAGE_COUNT}
    </div>
</body>
</html>
