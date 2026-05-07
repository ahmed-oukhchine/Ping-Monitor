<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ping History — Ping Monitor</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0d1117; --bg-card: #161b22; --bg-card-light: #21262d;
            --text-primary: #f0f6fc; --text-secondary: #8b949e;
            --accent-primary: #58a6ff; --accent-success: #3fb950;
            --accent-danger: #f85149; --accent-warning: #d29922;
            --border-color: #30363d; --shadow-color: rgba(1,4,9,0.8);
        }
        html, body { min-height: 100%; margin: 0; padding: 0; }
        body { background: linear-gradient(135deg, var(--bg-dark) 0%, #0a0d12 100%); color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
        .page-wrapper { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
        .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 8px 32px var(--shadow-color); position: relative; }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--accent-primary), transparent); opacity: 0.3; }
        .card-header { background: linear-gradient(135deg, var(--bg-card-light) 0%, var(--bg-card) 100%); border-bottom: 1px solid var(--border-color); border-radius: 12px 12px 0 0; padding: 1.25rem 1.5rem; }
        .table { color: var(--text-primary); margin: 0; background: transparent; }
        .table-hover tbody tr:hover { background: rgba(88,166,255,0.06); color: var(--text-primary); }
        .table thead th { border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-secondary); background: var(--bg-card-light); font-size: 0.85em; letter-spacing: 0.5px; text-transform: uppercase; }
        .table tbody td { border-bottom: 1px solid var(--border-color); vertical-align: middle; padding: 0.75rem; }
        .form-control, .form-select { background: var(--bg-card-light); border: 2px solid var(--border-color); color: var(--text-primary); border-radius: 8px; }
        .form-control:focus, .form-select:focus { background: var(--bg-card-light); border-color: var(--accent-primary); color: var(--text-primary); box-shadow: 0 0 0 3px rgba(88,166,255,0.2); }
        .form-select option { background: var(--bg-card-light); color: var(--text-primary); }
        .btn-primary { background: linear-gradient(135deg, var(--accent-primary), #1f6feb); border: none; font-weight: 600; border-radius: 8px; }
        .btn-outline-light { border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 6px; font-size: 0.85rem; }
        .btn-outline-light:hover { background: var(--bg-card-light); color: var(--text-primary); border-color: var(--accent-primary); }
        .badge { font-size: 0.75em; font-weight: 600; padding: 0.4em 0.75em; border-radius: 20px; }
        .bg-success { background: linear-gradient(135deg, var(--accent-success), #238636) !important; }
        .bg-danger  { background: linear-gradient(135deg, var(--accent-danger),  #da3633) !important; }
        .bg-secondary { background: linear-gradient(135deg, #484f58, #30363d) !important; }
        .header-gradient { background: linear-gradient(135deg, var(--accent-primary), #8bddff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; }
        .ip-address { font-family: 'Monaco', 'Consolas', monospace; color: var(--accent-primary); background: rgba(88,166,255,0.1); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
        .response-time { font-family: 'Monaco', 'Consolas', monospace; font-size: 0.85rem; color: var(--accent-success); }
        .response-time.slow { color: var(--accent-warning); }
        .text-muted { color: var(--text-secondary) !important; }
        .timestamp { font-size: 0.82rem; color: var(--text-secondary); font-family: 'Monaco', 'Consolas', monospace; }

        /* stat cards */
        .stat-card { background: var(--bg-card-light); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.25rem; }
        .stat-value { font-size: 1.6rem; font-weight: 700; line-height: 1; }
        .stat-label { font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.25rem; }

        /* pagination */
        .pagination .page-link { background: var(--bg-card-light); border-color: var(--border-color); color: var(--text-secondary); }
        .pagination .page-link:hover { background: var(--bg-card); color: var(--accent-primary); border-color: var(--accent-primary); }
        .pagination .page-item.active .page-link { background: var(--accent-primary); border-color: var(--accent-primary); color: #fff; }
        .pagination .page-item.disabled .page-link { background: var(--bg-card); color: #444; }
    </style>
</head>
<body>
<div class="page-wrapper">

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="header-gradient fw-bold mb-0">
            <i class="fas fa-history me-3"></i>Ping History
        </h1>
        <a href="{{ route('home') }}" class="btn btn-outline-light">
            <i class="fas fa-satellite-dish me-1"></i>Dashboard
        </a>
    </div>

    <!-- Summary stats -->
    @php
        $total   = $histories->total();
        $success = $histories->getCollection()->where('is_success', true)->count();
        $failed  = $histories->getCollection()->where('is_success', false)->count();
        $avgTime = $histories->getCollection()->whereNotNull('response_time')->avg('response_time');
    @endphp
    <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value text-accent">{{ number_format($total) }}</div>
                <div class="stat-label">Total Records</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value" style="color:var(--accent-success)">{{ $success }}</div>
                <div class="stat-label">Online (this page)</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value" style="color:var(--accent-danger)">{{ $failed }}</div>
                <div class="stat-label">Offline (this page)</div>
            </div>
        </div>
        <div class="col-6 col-md-3">
            <div class="stat-card">
                <div class="stat-value" style="color:var(--accent-primary)">
                    {{ $avgTime ? round($avgTime, 1).'ms' : '—' }}
                </div>
                <div class="stat-label">Avg Response (this page)</div>
            </div>
        </div>
    </div>

    <!-- Filter -->
    <div class="card mb-4">
        <div class="card-body" style="padding:1rem 1.5rem;">
            <form method="GET" action="{{ route('history') }}" class="row g-2 align-items-end">
                <div class="col-md-4">
                    <label class="form-label text-muted small mb-1">Filter by Target</label>
                    <select name="target_id" class="form-select form-select-sm">
                        <option value="">— All Targets —</option>
                        @foreach($targets as $t)
                            <option value="{{ $t->id }}" @selected($targetId == $t->id)>
                                {{ $t->name }} ({{ $t->ip_address }})
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="col-auto">
                    <button type="submit" class="btn btn-primary btn-sm px-3">
                        <i class="fas fa-filter me-1"></i>Filter
                    </button>
                </div>
                @if($targetId)
                <div class="col-auto">
                    <a href="{{ route('history') }}" class="btn btn-outline-light btn-sm px-3">
                        <i class="fas fa-times me-1"></i>Clear
                    </a>
                </div>
                @endif
            </form>
        </div>
    </div>

    <!-- History Table -->
    <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
                <i class="fas fa-table me-2"></i>Results
                <span class="badge bg-secondary ms-2">{{ number_format($total) }} records</span>
            </h5>
            <span class="text-muted" style="font-size:0.82rem;">50 per page · most recent first</span>
        </div>
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th style="width:5%">#</th>
                        <th style="width:20%">Target</th>
                        <th style="width:16%">IP Address</th>
                        <th style="width:13%">Status</th>
                        <th style="width:14%">Response Time</th>
                        <th style="width:16%">Error</th>
                        <th style="width:16%">Date / Time</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($histories as $h)
                    <tr>
                        <td class="text-muted" style="font-size:0.8rem;">{{ $h->id }}</td>
                        <td>
                            <span style="font-weight:600;">{{ $h->target->name ?? '—' }}</span>
                        </td>
                        <td>
                            <code class="ip-address">{{ $h->target->ip_address ?? '—' }}</code>
                        </td>
                        <td>
                            @if($h->is_success)
                                <span class="badge bg-success"><i class="fas fa-check me-1"></i>Online</span>
                            @else
                                <span class="badge bg-danger"><i class="fas fa-times me-1"></i>Offline</span>
                            @endif
                        </td>
                        <td>
                            @if($h->response_time !== null)
                                <span class="response-time {{ $h->response_time > 200 ? 'slow' : '' }}">
                                    {{ round($h->response_time, 1) }} ms
                                </span>
                            @else
                                <span class="text-muted">—</span>
                            @endif
                        </td>
                        <td>
                            @if($h->error_message)
                                <span style="font-size:0.8rem;color:var(--accent-danger);">{{ $h->error_message }}</span>
                            @else
                                <span class="text-muted">—</span>
                            @endif
                        </td>
                        <td>
                            <span class="timestamp">{{ $h->created_at->format('Y-m-d H:i:s') }}</span>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <i class="fas fa-inbox fa-2x text-muted mb-3 d-block"></i>
                            <span class="text-muted">No ping history yet. Run a check from the dashboard.</span>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if($histories->hasPages())
        <div class="card-footer d-flex justify-content-center" style="background:var(--bg-card-light);border-top:1px solid var(--border-color);border-radius:0 0 12px 12px;padding:1rem;">
            {{ $histories->links() }}
        </div>
        @endif
    </div>

    <div class="text-center text-muted mt-3 mb-4" style="font-size:0.8rem;">
        Showing {{ $histories->firstItem() }}–{{ $histories->lastItem() }} of {{ number_format($total) }} records
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
