<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ping Monitor</title>
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
        html, body { height: 100%; margin: 0; padding: 0; }
        body { background: linear-gradient(135deg, var(--bg-dark) 0%, #0a0d12 100%); color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; display: flex; flex-direction: column; }
        .content-grid { display: grid; grid-template-rows: auto auto 1fr; gap: 1.5rem; height: 100vh; padding: 1.5rem; overflow: hidden; }
        .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 8px 32px var(--shadow-color); position: relative; }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--accent-primary), transparent); opacity: 0.3; }
        .card-header { background: linear-gradient(135deg, var(--bg-card-light) 0%, var(--bg-card) 100%); border-bottom: 1px solid var(--border-color); border-radius: 12px 12px 0 0; padding: 1.25rem 1.5rem; }
        .table { color: var(--text-primary); margin: 0; background: transparent; width: 100%; }
        .table-hover tbody tr:hover { background: rgba(88,166,255,0.08); color: var(--text-primary); transition: all 0.2s ease; }
        .table thead th { border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-secondary); background: var(--bg-card-light); font-size: 0.9em; letter-spacing: 0.5px; text-transform: uppercase; position: sticky; top: 0; z-index: 10; }
        .table tbody td { border-bottom: 1px solid var(--border-color); vertical-align: middle; padding: 1rem 0.75rem; }
        .form-control { background: var(--bg-card-light); border: 2px solid var(--border-color); color: var(--text-primary); border-radius: 8px; transition: all 0.3s ease; }
        .form-control:focus { background: var(--bg-card-light); border-color: var(--accent-primary); color: var(--text-primary); box-shadow: 0 0 0 3px rgba(88,166,255,0.2); transform: translateY(-1px); }
        .form-control::placeholder { color: var(--text-secondary); }
        .btn-primary { background: linear-gradient(135deg, var(--accent-primary), #1f6feb); border: none; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(88,166,255,0.3); transition: all 0.3s ease; }
        .btn-primary:hover { background: linear-gradient(135deg, #1f6feb, var(--accent-primary)); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(88,166,255,0.4); }
        .btn-success { background: linear-gradient(135deg, var(--accent-success), #2ea043); border: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(63,185,80,0.3); transition: all 0.3s ease; }
        .btn-success:hover { background: linear-gradient(135deg, #2ea043, var(--accent-success)); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(63,185,80,0.4); }
        .btn-outline-primary { border: 2px solid var(--accent-primary); color: var(--accent-primary); border-radius: 6px; font-weight: 500; transition: all 0.3s ease; }
        .btn-outline-primary:hover { background: var(--accent-primary); border-color: var(--accent-primary); color: var(--bg-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(88,166,255,0.3); }
        .btn-outline-warning { border: 2px solid var(--accent-warning); color: var(--accent-warning); border-radius: 6px; font-weight: 500; transition: all 0.3s ease; }
        .btn-outline-warning:hover { background: var(--accent-warning); border-color: var(--accent-warning); color: white; transform: translateY(-1px); }
        .btn-outline-danger { border: 2px solid var(--accent-danger); color: var(--accent-danger); border-radius: 6px; font-weight: 500; transition: all 0.3s ease; }
        .btn-outline-danger:hover { background: var(--accent-danger); border-color: var(--accent-danger); color: white; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(248,81,73,0.3); }
        .btn-outline-light { border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 6px; font-size: 0.85rem; transition: all 0.2s ease; }
        .btn-outline-light:hover { background: var(--bg-card-light); color: var(--text-primary); border-color: var(--accent-primary); }
        .badge { font-size: 0.75em; font-weight: 600; padding: 0.5em 0.8em; border-radius: 20px; letter-spacing: 0.3px; transition: all 0.3s ease; }
        .bg-success { background: linear-gradient(135deg, var(--accent-success), #238636) !important; box-shadow: 0 2px 8px rgba(63,185,80,0.3); }
        .bg-danger  { background: linear-gradient(135deg, var(--accent-danger),  #da3633) !important; box-shadow: 0 2px 8px rgba(248,81,73,0.3); }
        .bg-warning { background: linear-gradient(135deg, var(--accent-warning), #9e6a03) !important; box-shadow: 0 2px 8px rgba(210,153,34,0.3); }
        .bg-secondary { background: linear-gradient(135deg, #484f58, #30363d) !important; box-shadow: 0 2px 8px rgba(139,148,158,0.2); }
        .table-container-wrapper { height: 100%; display: flex; flex-direction: column; min-height: 0; }
        .table-scroll-container { flex: 1; overflow-y: auto; min-height: 200px; }
        .table-scroll-container::-webkit-scrollbar { width: 8px; }
        .table-scroll-container::-webkit-scrollbar-track { background: var(--bg-card); border-radius: 4px; }
        .table-scroll-container::-webkit-scrollbar-thumb { background: linear-gradient(135deg, var(--accent-primary), #1f6feb); border-radius: 4px; }
        .header-gradient { background: linear-gradient(135deg, var(--accent-primary), #8bddff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; }
        .main-content { flex: 1; min-height: 0; overflow: hidden; }
        .last-ping-time { font-size: 0.85rem; color: var(--text-secondary); display: block; font-family: 'Monaco', 'Consolas', monospace; }
        .target-name { font-weight: 600; color: var(--text-primary); }
        .ip-address { font-family: 'Monaco', 'Consolas', 'Courier New', monospace; color: var(--accent-primary); background: rgba(88,166,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.9em; }
        .loss-cell { font-family: 'Monaco', 'Consolas', monospace; font-size: 0.88rem; }
        .loss-low    { color: var(--accent-success); }
        .loss-medium { color: var(--accent-warning); }
        .loss-high   { color: var(--accent-danger); }
        .loss-none   { color: var(--text-secondary); }
        .targets-list-container { max-width: 1100px; margin: 0 auto; height: 100%; min-height: 0; }
        .text-muted { color: var(--text-secondary) !important; }
        .text-accent { color: var(--accent-primary); }
        .modal-content { background: #161b22; border: 1px solid #30363d; color: #e6edf3; }
        .modal-header { border-bottom: 1px solid #30363d; }
        .modal-footer { border-top: 1px solid #30363d; }
        @media (max-width: 768px) { .content-grid { padding: 1rem; gap: 1rem; } .card-header { padding: 1rem; } }
    </style>
</head>
<body>
    <div class="content-grid">
        <!-- Header -->
        <div class="row">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center">
                    <h1 class="header-gradient fw-bold mb-0">
                        <i class="fas fa-satellite-dish me-3"></i>Ping Monitor
                    </h1>
                    <div class="d-flex align-items-center gap-3">
                        <a href="{{ route('history') }}" class="btn btn-outline-light">
                            <i class="fas fa-history me-1"></i>History
                        </a>
                        <div class="text-end">
                            <div class="text-muted">Real-time Status Monitoring</div>
                            <div class="text-accent">Active Targets: {{ $targets->count() }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Target Form -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Add New Target</h5>
                    </div>
                    <div class="card-body">
                        <form method="POST" action="{{ route('targets.store') }}">
                            @csrf
                            <div class="row g-3 align-items-end">
                                <div class="col-md-5">
                                    <label class="form-label text-light">Target Name</label>
                                    <input type="text" name="name" class="form-control" placeholder="e.g., Google DNS" required>
                                </div>
                                <div class="col-md-5">
                                    <label class="form-label text-light">IP Address or Hostname</label>
                                    <input type="text" name="ip_address" class="form-control" placeholder="e.g., 8.8.8.8 or google.com" required>
                                </div>
                                <div class="col-md-2">
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fas fa-plus me-2"></i>Add Target
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Targets List -->
        <div class="row main-content">
            <div class="col-12 h-100">
                <div class="targets-list-container h-100">
                    <div class="card h-100 d-flex flex-column">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">
                                <i class="fas fa-list me-2"></i>Targets List
                                <span class="badge bg-primary ms-2">{{ $targets->count() }} targets</span>
                            </h5>
                            <button id="pingAllBtn" class="btn btn-success">
                                <i class="fas fa-broadcast-tower me-2"></i>Check All Targets
                            </button>
                        </div>
                        <div class="card-body p-0 flex-grow-1 d-flex flex-column">
                            <div class="table-container-wrapper">
                                <div class="table-scroll-container">
                                    <table class="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th style="width:22%">Target Name</th>
                                                <th style="width:18%">IP Address</th>
                                                <th style="width:18%">Status</th>
                                                <th style="width:12%">Loss %</th>
                                                <th style="width:14%">Last Check</th>
                                                <th style="width:16%">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="targetsTable">
                                            @forelse($targets as $target)
                                            @php
                                                $loss = $target->total_pings > 0
                                                    ? (int) round($target->failed_pings / $target->total_pings * 100)
                                                    : null;
                                            @endphp
                                            <tr id="target-{{ $target->id }}">
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <i class="fas fa-server me-2" style="color:#8ab4f8;"></i>
                                                        <span class="target-name">{{ $target->name }}</span>
                                                    </div>
                                                </td>
                                                <td><code class="ip-address">{{ $target->ip_address }}</code></td>
                                                <td id="status-{{ $target->id }}">
                                                    <span class="badge bg-secondary"><i class="fas fa-question me-1"></i>Unknown</span>
                                                </td>
                                                <td id="loss-{{ $target->id }}" class="loss-cell">
                                                    @if($loss === null)
                                                        <span class="loss-none">—</span>
                                                    @elseif($loss === 0)
                                                        <span class="loss-low">0%</span>
                                                    @elseif($loss <= 25)
                                                        <span class="loss-medium">{{ $loss }}%</span>
                                                    @else
                                                        <span class="loss-high">{{ $loss }}%</span>
                                                    @endif
                                                </td>
                                                <td id="time-{{ $target->id }}">
                                                    <span class="last-ping-time">Never</span>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm" style="height:32px;">
                                                        <button class="btn btn-outline-primary ping-btn"
                                                            data-target-id="{{ $target->id }}"
                                                            data-ping-url="{{ route('targets.ping', $target) }}"
                                                            title="Check this target"
                                                            style="padding:0.25rem 0.5rem;font-size:0.75rem;">
                                                            <i class="fas fa-satellite-dish me-1"></i> Check
                                                        </button>
                                                        <button class="btn btn-outline-warning edit-btn"
                                                            data-target-id="{{ $target->id }}"
                                                            data-target-name="{{ $target->name }}"
                                                            data-target-ip="{{ $target->ip_address }}"
                                                            data-edit-url="{{ route('targets.update', $target) }}"
                                                            title="Edit target"
                                                            style="padding:0.25rem 0.5rem;font-size:0.75rem;">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                        <form method="POST" action="{{ route('targets.destroy', $target) }}" style="display:inline;" onsubmit="return confirm('Delete {{ $target->name }}?')">
                                                            @csrf
                                                            @method('DELETE')
                                                            <button type="submit" class="btn btn-outline-danger" title="Delete target" style="padding:0.25rem 0.5rem;font-size:0.75rem;border-radius:0 6px 6px 0;">
                                                                <i class="fas fa-trash"></i>
                                                            </button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                            @empty
                                            <tr>
                                                <td colspan="6" class="text-center py-4">
                                                    <i class="fas fa-inbox fa-2x text-muted mb-3"></i>
                                                    <div class="text-muted">No targets added yet</div>
                                                    <small class="text-muted">Add your first target above to start monitoring</small>
                                                </td>
                                            </tr>
                                            @endforelse
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Target Modal -->
    <div class="modal fade" id="editTargetModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Target</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="editTargetForm" method="POST">
                    @csrf
                    @method('PUT')
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Target Name</label>
                            <input type="text" class="form-control" id="edit_target_name" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">IP Address or Hostname</label>
                            <input type="text" class="form-control" id="edit_target_ip" name="ip_address" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        // ── helpers ──────────────────────────────────────────────────────────

        function renderLoss(pct) {
            if (pct === null || pct === undefined) return '<span class="loss-none">—</span>';
            if (pct === 0)   return '<span class="loss-low">0%</span>';
            if (pct <= 25)   return `<span class="loss-medium">${pct}%</span>`;
            return `<span class="loss-high">${pct}%</span>`;
        }

        // ── edit modal ────────────────────────────────────────────────────────

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.getElementById('edit_target_name').value = this.dataset.targetName;
                document.getElementById('edit_target_ip').value   = this.dataset.targetIp;
                document.getElementById('editTargetForm').action  = this.dataset.editUrl;
                new bootstrap.Modal(document.getElementById('editTargetModal')).show();
            });
        });

        // ── ping single ───────────────────────────────────────────────────────

        document.querySelectorAll('.ping-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                pingTarget(this.dataset.targetId, this.dataset.pingUrl, this);
            });
        });

        function pingTarget(id, url, button) {
            const statusEl = document.getElementById(`status-${id}`);
            const lossEl   = document.getElementById(`loss-${id}`);
            const timeEl   = document.getElementById(`time-${id}`);
            const orig     = button.innerHTML;

            statusEl.innerHTML = '<span class="badge bg-warning"><i class="fas fa-spinner fa-spin me-1"></i>Checking...</span>';
            timeEl.innerHTML   = '<span class="last-ping-time">Checking...</span>';
            button.innerHTML   = '<i class="fas fa-spinner fa-spin me-1"></i> Check';
            button.disabled    = true;

            fetch(url, { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const time = new Date().toLocaleTimeString();
                statusEl.innerHTML = data.success
                    ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Online</span>'
                    : '<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Offline</span>';
                timeEl.innerHTML = `<span class="last-ping-time">${time}</span>`;
                if (lossEl && data.loss_percent !== undefined) {
                    lossEl.innerHTML = renderLoss(data.loss_percent);
                }
            })
            .catch(() => {
                statusEl.innerHTML = '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle me-1"></i>Error</span>';
                timeEl.innerHTML   = '<span class="last-ping-time">Error</span>';
            })
            .finally(() => { button.innerHTML = orig; button.disabled = false; });
        }

        // ── ping all ──────────────────────────────────────────────────────────

        document.getElementById('pingAllBtn').addEventListener('click', function () {
            const btn  = this;
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Checking...';
            btn.disabled  = true;

            document.querySelectorAll('[id^="status-"]').forEach(el => {
                el.innerHTML = '<span class="badge bg-warning"><i class="fas fa-spinner fa-spin me-1"></i>Checking...</span>';
            });
            document.querySelectorAll('[id^="time-"]').forEach(el => {
                el.innerHTML = '<span class="last-ping-time">Checking...</span>';
            });

            fetch('{{ route("targets.pingAll") }}', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' },
            })
            .then(r => r.json())
            .then(data => {
                const time = new Date().toLocaleTimeString();
                data.results.forEach(result => {
                    const statusEl = document.getElementById(`status-${result.target_id}`);
                    const lossEl   = document.getElementById(`loss-${result.target_id}`);
                    const timeEl   = document.getElementById(`time-${result.target_id}`);
                    if (statusEl && timeEl) {
                        statusEl.innerHTML = result.success
                            ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Online</span>'
                            : '<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Offline</span>';
                        timeEl.innerHTML = `<span class="last-ping-time">${time}</span>`;
                        if (lossEl && result.loss_percent !== undefined) {
                            lossEl.innerHTML = renderLoss(result.loss_percent);
                        }
                    }
                });
            })
            .catch(() => {
                document.querySelectorAll('[id^="status-"]').forEach(el => {
                    el.innerHTML = '<span class="badge bg-danger"><i class="fas fa-exclamation-triangle me-1"></i>Error</span>';
                });
                document.querySelectorAll('[id^="time-"]').forEach(el => {
                    el.innerHTML = '<span class="last-ping-time">Error</span>';
                });
            })
            .finally(() => { btn.innerHTML = orig; btn.disabled = false; });
        });
    </script>
</body>
</html>
