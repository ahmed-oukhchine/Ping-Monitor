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
    .ongoing { color: #dc2626; font-weight: bold; }
    .resolved { color: #16a34a; font-weight: bold; }
    .mono { font-family: "DejaVu Sans Mono", monospace; font-size: 7px; }
    .footer { margin-top: 20px; text-align: center; font-size: 7px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 8px; }
</style>
</head>
<body>
    <h1>Incidents Report</h1>
    <p class="sub">Generated {{ now()->format('M d, Y H:i') }}</p>

    @if($filters)
    <div class="filters">
        Filters:
        @if($filters['target']) <strong>Target:</strong> {{ $filters['target'] }} @endif
        @if($filters['date_from']) <strong>From:</strong> {{ $filters['date_from'] }} @endif
        @if($filters['date_to']) <strong>To:</strong> {{ $filters['date_to'] }} @endif
        @if(!$filters['target'] && !$filters['date_from'] && !$filters['date_to'])
            None (all incidents)
        @endif
    </div>
    @endif

    <p style="font-size:8px;color:#888;margin-bottom:8px;">
        <strong>{{ $total }}</strong> incidents |
        <strong style="color:#16a34a">{{ $resolved }} resolved</strong> |
        <strong style="color:#dc2626">{{ $ongoing }} ongoing</strong>
    </p>

    <table>
        <thead>
            <tr>
                <th>Status</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Duration</th>
                <th>Failed Pings</th>
            </tr>
        </thead>
        <tbody>
            @forelse($incidents as $inc)
            <tr>
                <td class="{{ $inc['ongoing'] ? 'ongoing' : 'resolved' }}">{{ $inc['ongoing'] ? 'Ongoing' : 'Resolved' }}</td>
                <td>{{ $inc['target_name'] }}</td>
                <td class="mono">{{ $inc['target_ip'] }}</td>
                <td class="mono">{{ $inc['started_at']->format('Y-m-d H:i:s') }}</td>
                <td class="mono">{{ $inc['ended_at'] ? $inc['ended_at']->format('Y-m-d H:i:s') : '—' }}</td>
                <td>{{ $inc['ongoing'] ? '—' : $inc['duration_sec'] . 's' }}</td>
                <td>{{ $inc['ping_count'] }}</td>
            </tr>
            @empty
            <tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">No incidents found.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        SIREN — Network Monitor | Page {PAGE_NUM} of {PAGE_COUNT}
    </div>
</body>
</html>
