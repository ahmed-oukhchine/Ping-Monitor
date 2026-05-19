<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 20px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #333; }
    h1 { font-size: 18px; color: #2563eb; margin-bottom: 4px; }
    h2 { font-size: 13px; color: #555; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .sub { color: #888; font-size: 9px; margin-bottom: 15px; }
    .summary { display: flex; gap: 10px; margin-bottom: 15px; }
    .stat { background: #f3f4f6; padding: 8px 12px; border-radius: 6px; flex: 1; }
    .stat .val { font-size: 16px; font-weight: bold; color: #2563eb; }
    .stat .lbl { font-size: 8px; color: #888; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #2563eb; color: #fff; padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .up { color: #16a34a; font-weight: bold; }
    .warn { color: #d97706; font-weight: bold; }
    .down { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 25px; text-align: center; font-size: 8px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 10px; }
</style>
</head>
<body>
    <h1>ArgusNet — SLA Report</h1>
    <p class="sub">{{ $period }} | Generated {{ now()->format('M d, Y H:i') }}</p>

    <div class="summary">
        <div class="stat">
            <div class="val">{{ $fleet['uptime'] }}%</div>
            <div class="lbl">Fleet Uptime</div>
        </div>
        <div class="stat">
            <div class="val">{{ $fleet['online'] }}/{{ $fleet['total'] }}</div>
            <div class="lbl">Online / Total</div>
        </div>
        <div class="stat">
            <div class="val">{{ $fleet['avg_latency'] }}</div>
            <div class="lbl">Avg Latency</div>
        </div>
        <div class="stat">
            <div class="val">{{ $fleet['incidents'] }}</div>
            <div class="lbl">Incidents</div>
        </div>
    </div>

    <h2>Per-Device Breakdown</h2>
    <table>
        <thead>
            <tr>
                <th>Device</th>
                <th>IP</th>
                <th>Uptime</th>
                <th>Checks</th>
                <th>Avg Latency</th>
                <th>Max Latency</th>
                <th>Outages</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($targets as $t)
            <tr>
                <td>{{ $t['name'] }}</td>
                <td>{{ $t['ip'] }}</td>
                <td>{{ $t['uptime'] }}%</td>
                <td>{{ $t['total_checks'] }}</td>
                <td>{{ $t['avg_latency'] }} ms</td>
                <td>{{ $t['max_latency'] }} ms</td>
                <td>{{ $t['outages'] }}</td>
                <td class="{{ $t['status_class'] }}">{{ $t['status'] }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        ArgusNet — Network Monitor | Generated automatically
    </div>
</body>
</html>
