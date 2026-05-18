<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ping History — Ping Monitor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --bg-root:    #050a16;
            --bg-panel:   #0b1225;
            --bg-surface: #111d38;
            --bg-raised:  #172246;
            --border:     rgba(99,143,255,0.12);
            --border-med: rgba(99,143,255,0.22);
            --cyan:       #00d4ff;
            --cyan-dim:   rgba(0,212,255,0.10);
            --cyan-glow:  rgba(0,212,255,0.25);
            --green:      #00e5a0;
            --green-dim:  rgba(0,229,160,0.12);
            --red:        #ff4d6d;
            --red-dim:    rgba(255,77,109,0.12);
            --amber:      #ffb347;
            --amber-dim:  rgba(255,179,71,0.12);
            --txt-100:    #eef2ff;
            --txt-200:    #a8b8d8;
            --txt-300:    #5e748a;
            --radius-sm:  8px;
            --radius-md:  12px;
            --radius-lg:  16px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
            font-family: 'Outfit', -apple-system, sans-serif;
            background: var(--bg-root);
            color: var(--txt-100);
            min-height: 100%;
        }

        .page { max-width: 1240px; margin: 0 auto; padding: 28px 24px 48px; }

        /* ── Topbar ── */
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 28px;
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .brand-icon {
            width: 38px; height: 38px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--cyan) 0%, #005fff 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 16px;
            box-shadow: 0 0 18px var(--cyan-glow);
        }
        .brand-name {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--txt-100);
            letter-spacing: -0.01em;
        }
        .brand-name span { color: var(--cyan); }

        /* ── Buttons ── */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 18px;
            border: none;
            border-radius: var(--radius-sm);
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            letter-spacing: 0.01em;
        }
        .btn:active { transform: scale(0.96); }
        .btn-ghost {
            background: transparent;
            border: 1px solid var(--border-med);
            color: var(--txt-200);
        }
        .btn-ghost:hover { background: var(--bg-surface); color: var(--txt-100); border-color: var(--cyan); }
        .btn-cyan {
            background: linear-gradient(135deg, var(--cyan), #0097e6);
            color: #030c1a;
            box-shadow: 0 4px 16px var(--cyan-glow);
        }
        .btn-cyan:hover { box-shadow: 0 6px 22px rgba(0,212,255,0.4); transform: translateY(-1px); }
        .btn-sm { padding: 6px 14px; font-size: 0.8rem; }

        /* ── Stat cards ── */
        .stat-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 18px 20px;
            position: relative;
            overflow: hidden;
            transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .stat-card:hover { transform: translateY(-2px); border-color: var(--border-med); }
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, var(--cyan), transparent);
            opacity: 0.3;
        }
        .stat-card-icon {
            width: 34px; height: 34px;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
            margin-bottom: 12px;
        }
        .icon-cyan  { background: var(--cyan-dim);  color: var(--cyan);  border: 1px solid rgba(0,212,255,0.18); }
        .icon-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(0,229,160,0.18); }
        .icon-red   { background: var(--red-dim);   color: var(--red);   border: 1px solid rgba(255,77,109,0.18); }
        .icon-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(255,179,71,0.18); }
        .stat-value {
            font-size: 1.65rem;
            font-weight: 700;
            line-height: 1;
            font-family: 'JetBrains Mono', monospace;
            margin-bottom: 4px;
        }
        .stat-label {
            font-size: 0.73rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: var(--txt-300);
        }
        .val-cyan  { color: var(--cyan);  }
        .val-green { color: var(--green); }
        .val-red   { color: var(--red);   }
        .val-amber { color: var(--amber); }

        /* ── Card ── */
        .card {
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            position: relative;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .card-top-line {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, var(--cyan) 50%, transparent 100%);
            opacity: 0.35;
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(to bottom, var(--bg-surface), var(--bg-panel));
        }
        .card-title {
            display: flex;
            align-items: center;
            gap: 9px;
            font-size: 0.88rem;
            font-weight: 600;
            color: var(--txt-100);
        }
        .card-title i { color: var(--cyan); font-size: 0.82rem; }
        .card-meta { font-size: 0.78rem; color: var(--txt-300); }
        .card-body { padding: 18px 20px; }

        /* ── Filter form ── */
        .filter-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
            flex-wrap: wrap;
        }
        .filter-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 200px; }
        .filter-field label {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            color: var(--txt-300);
        }
        .filter-field select {
            padding: 8px 12px;
            background: var(--bg-surface);
            border: 1px solid var(--border-med);
            border-radius: var(--radius-sm);
            color: var(--txt-100);
            font-family: inherit;
            font-size: 0.86rem;
            outline: none;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%235e748a' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 12px;
            padding-right: 32px;
        }
        .filter-field select:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px var(--cyan-dim); }
        .filter-field select option { background: var(--bg-surface); color: var(--txt-100); }

        /* ── Table ── */
        table { width: 100%; border-collapse: collapse; }
        thead th {
            padding: 10px 16px;
            text-align: left;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--txt-300);
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border);
        }
        tbody tr { border-bottom: 1px solid var(--border); transition: background 0.15s ease; }
        tbody tr:hover { background: var(--cyan-dim); }
        tbody tr:last-child { border-bottom: none; }
        tbody td { padding: 11px 16px; vertical-align: middle; font-size: 0.87rem; }

        /* ── Badges ── */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 600;
        }
        .badge-online  { background: var(--green-dim); color: var(--green); border: 1px solid rgba(0,229,160,0.25); }
        .badge-offline { background: var(--red-dim);   color: var(--red);   border: 1px solid rgba(255,77,109,0.25); }

        /* ── IP ── */
        .ip-tag {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: var(--cyan);
            background: var(--cyan-dim);
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid rgba(0,212,255,0.15);
        }

        /* ── Response time ── */
        .resp-fast { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--green); }
        .resp-slow { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--amber); }

        /* ── Timestamp ── */
        .ts { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--txt-300); }

        /* ── Error text ── */
        .err-text { font-size: 0.78rem; color: var(--red); }

        .muted { color: var(--txt-300); }

        /* ── Count pill ── */
        .count-pill {
            padding: 2px 9px;
            background: var(--cyan-dim);
            color: var(--cyan);
            border: 1px solid rgba(0,212,255,0.2);
            border-radius: 999px;
            font-size: 0.73rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── Pagination ── */
        .pagination {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            padding: 14px 20px;
            border-top: 1px solid var(--border);
            background: var(--bg-surface);
            border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }
        .pagination a, .pagination span {
            display: inline-flex; align-items: center; justify-content: center;
            min-width: 32px; height: 32px;
            padding: 0 8px;
            border-radius: 6px;
            font-size: 0.82rem;
            text-decoration: none;
            border: 1px solid var(--border);
            color: var(--txt-200);
            background: var(--bg-panel);
            transition: all 0.15s ease;
        }
        .pagination a:hover { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }
        .pagination .active span, .pagination [aria-current="page"] span {
            background: var(--cyan);
            color: #030c1a;
            border-color: var(--cyan);
            font-weight: 700;
        }
        .pagination [aria-disabled="true"] span { opacity: 0.35; cursor: default; }

        /* ── Empty state ── */
        .empty-state { padding: 56px 20px; text-align: center; }
        .empty-state i { font-size: 2.4rem; color: var(--txt-300); opacity: 0.4; margin-bottom: 12px; display: block; }
        .empty-state p { color: var(--txt-300); font-size: 0.9rem; }

        /* ── Footer note ── */
        .foot-note { text-align: center; font-size: 0.78rem; color: var(--txt-300); margin-top: 14px; }

        @media (max-width: 768px) {
            .stat-row { grid-template-columns: repeat(2, 1fr); }
            .page { padding: 16px 14px 36px; }
        }
    </style>
</head>
<body>
<div class="page">

    <!-- ── Header ── -->
    <div class="topbar">
        <div class="brand">
            <div class="brand-icon"><i class="fas fa-clock-rotate-left"></i></div>
            <span class="brand-name">Ping<span>History</span></span>
        </div>
        <a href="{{ route('home') }}" class="btn btn-ghost">
            <i class="fas fa-satellite-dish"></i> Dashboard
        </a>
    </div>

    <!-- ── Stats ── -->
    @php
        $total   = $histories->total();
        $success = $histories->getCollection()->where('is_success', true)->count();
        $failed  = $histories->getCollection()->where('is_success', false)->count();
        $avgTime = $histories->getCollection()->whereNotNull('response_time')->avg('response_time');
    @endphp
    <div class="stat-row">
        <div class="stat-card">
            <div class="stat-card-icon icon-cyan"><i class="fas fa-database"></i></div>
            <div class="stat-value val-cyan">{{ number_format($total) }}</div>
            <div class="stat-label">Total Records</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon icon-green"><i class="fas fa-circle-check"></i></div>
            <div class="stat-value val-green">{{ $success }}</div>
            <div class="stat-label">Online (page)</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon icon-red"><i class="fas fa-circle-xmark"></i></div>
            <div class="stat-value val-red">{{ $failed }}</div>
            <div class="stat-label">Offline (page)</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-icon icon-amber"><i class="fas fa-stopwatch"></i></div>
            <div class="stat-value val-amber">{{ $avgTime ? round($avgTime, 1).'ms' : '—' }}</div>
            <div class="stat-label">Avg Response</div>
        </div>
    </div>

    <!-- ── Filter ── -->
    <div class="card">
        <div class="card-top-line"></div>
        <div class="card-header">
            <div class="card-title"><i class="fas fa-filter"></i> Filter</div>
        </div>
        <div class="card-body">
            <form method="GET" action="{{ route('history') }}">
                <div class="filter-row">
                    <div class="filter-field">
                        <label>Target</label>
                        <select name="target_id">
                            <option value="">— All Targets —</option>
                            @foreach($targets as $t)
                                <option value="{{ $t->id }}" @selected($targetId == $t->id)>
                                    {{ $t->name }} ({{ $t->ip_address }})
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <button type="submit" class="btn btn-cyan btn-sm">
                        <i class="fas fa-filter"></i> Apply
                    </button>
                    @if($targetId)
                    <a href="{{ route('history') }}" class="btn btn-ghost btn-sm">
                        <i class="fas fa-xmark"></i> Clear
                    </a>
                    @endif
                </div>
            </form>
        </div>
    </div>

    <!-- ── History Table ── -->
    <div class="card">
        <div class="card-top-line"></div>
        <div class="card-header">
            <div class="card-title">
                <i class="fas fa-table"></i> Results
                <span class="count-pill">{{ number_format($total) }}</span>
            </div>
            <span class="card-meta">50 per page &middot; newest first</span>
        </div>
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>
                        <th style="width:4%">#</th>
                        <th style="width:18%">Target</th>
                        <th style="width:16%">IP Address</th>
                        <th style="width:12%">Status</th>
                        <th style="width:13%">Response</th>
                        <th style="width:18%">Error</th>
                        <th style="width:19%">Date / Time</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($histories as $h)
                    <tr>
                        <td class="muted" style="font-size:0.77rem;font-family:'JetBrains Mono',monospace;">{{ $h->id }}</td>
                        <td style="font-weight:600;">{{ $h->target->name ?? '—' }}</td>
                        <td><span class="ip-tag">{{ $h->target->ip_address ?? '—' }}</span></td>
                        <td>
                            @if($h->is_success)
                                <span class="badge badge-online"><i class="fas fa-circle" style="font-size:7px"></i> Online</span>
                            @else
                                <span class="badge badge-offline"><i class="fas fa-circle" style="font-size:7px"></i> Offline</span>
                            @endif
                        </td>
                        <td>
                            @if($h->response_time !== null)
                                <span class="{{ $h->response_time > 200 ? 'resp-slow' : 'resp-fast' }}">
                                    {{ round($h->response_time, 1) }} ms
                                </span>
                            @else
                                <span class="muted">—</span>
                            @endif
                        </td>
                        <td>
                            @if($h->error_message)
                                <span class="err-text">{{ $h->error_message }}</span>
                            @else
                                <span class="muted">—</span>
                            @endif
                        </td>
                        <td><span class="ts">{{ $h->created_at->format('Y-m-d H:i:s') }}</span></td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="7">
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <p>No history yet. Run a check from the dashboard.</p>
                            </div>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if($histories->hasPages())
        <div class="pagination">
            {{ $histories->links() }}
        </div>
        @endif
    </div>

    @if($histories->count())
    <div class="foot-note">
        Showing {{ $histories->firstItem() }}–{{ $histories->lastItem() }} of {{ number_format($total) }} records
    </div>
    @endif

</div>
</body>
</html>
