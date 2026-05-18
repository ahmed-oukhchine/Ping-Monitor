<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Ping Monitor</title>
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
            --cyan-dim:   rgba(0,212,255,0.12);
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
            height: 100%;
            font-family: 'Outfit', -apple-system, sans-serif;
            background: var(--bg-root);
            color: var(--txt-100);
        }

        /* ── Layout ── */
        .app-shell {
            display: grid;
            grid-template-rows: auto auto 1fr;
            gap: 20px;
            height: 100vh;
            padding: 24px;
            overflow: hidden;
        }

        /* ── Topbar ── */
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 20px;
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
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
        .topbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .meta-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 999px;
            font-size: 0.82rem;
            color: var(--txt-200);
        }
        .meta-chip .dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            background: var(--green);
            box-shadow: 0 0 6px var(--green);
            animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .meta-chip strong { color: var(--cyan); font-weight: 600; }

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

        .btn-green {
            background: linear-gradient(135deg, var(--green), #00b37a);
            color: #021a10;
            box-shadow: 0 4px 14px rgba(0,229,160,0.3);
        }
        .btn-green:hover { box-shadow: 0 6px 20px rgba(0,229,160,0.4); transform: translateY(-1px); }

        .btn-icon {
            padding: 6px 12px;
            font-size: 0.78rem;
            border-radius: 6px;
        }
        .btn-outline-cyan { background: transparent; border: 1px solid rgba(0,212,255,0.35); color: var(--cyan); }
        .btn-outline-cyan:hover { background: var(--cyan-dim); }
        .btn-outline-amber { background: transparent; border: 1px solid rgba(255,179,71,0.35); color: var(--amber); }
        .btn-outline-amber:hover { background: var(--amber-dim); }
        .btn-outline-red { background: transparent; border: 1px solid rgba(255,77,109,0.35); color: var(--red); }
        .btn-outline-red:hover { background: var(--red-dim); }

        /* ── Card ── */
        .card {
            background: var(--bg-panel);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            position: relative;
            overflow: hidden;
        }
        .card-top-line {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, var(--cyan) 50%, transparent 100%);
            opacity: 0.4;
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 22px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(to bottom, var(--bg-surface), var(--bg-panel));
        }
        .card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--txt-100);
        }
        .card-title i { color: var(--cyan); font-size: 0.85rem; }
        .card-body { padding: 20px 22px; }

        /* ── Form ── */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 12px;
            align-items: end;
        }
        .field label {
            display: block;
            margin-bottom: 6px;
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--txt-200);
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .field input {
            width: 100%;
            padding: 10px 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border-med);
            border-radius: var(--radius-sm);
            color: var(--txt-100);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.88rem;
            outline: none;
            transition: all 0.2s ease;
        }
        .field input::placeholder { color: var(--txt-300); font-family: 'Outfit', sans-serif; }
        .field input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px var(--cyan-dim); }

        /* ── Table ── */
        .table-wrap { height: 100%; display: flex; flex-direction: column; min-height: 0; }
        .table-scroll { flex: 1; overflow-y: auto; min-height: 0; }
        .table-scroll::-webkit-scrollbar { width: 4px; }
        .table-scroll::-webkit-scrollbar-track { background: transparent; }
        .table-scroll::-webkit-scrollbar-thumb { background: var(--border-med); border-radius: 4px; }

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
            position: sticky; top: 0; z-index: 5;
        }
        tbody tr {
            border-bottom: 1px solid var(--border);
            transition: background 0.15s ease;
        }
        tbody tr:hover { background: var(--cyan-dim); }
        tbody tr:last-child { border-bottom: none; }
        tbody td { padding: 13px 16px; vertical-align: middle; font-size: 0.88rem; }

        /* ── Status badges ── */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.73rem;
            font-weight: 600;
            letter-spacing: 0.03em;
        }
        .badge-online  { background: var(--green-dim); color: var(--green); border: 1px solid rgba(0,229,160,0.25); }
        .badge-offline { background: var(--red-dim); color: var(--red); border: 1px solid rgba(255,77,109,0.25); animation: offline-flash 1.8s ease-in-out infinite; }
        .badge-unknown { background: rgba(94,116,138,0.15); color: var(--txt-300); border: 1px solid rgba(94,116,138,0.2); }
        .badge-checking { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(255,179,71,0.25); }

        @keyframes offline-flash {
            0%, 100% { box-shadow: none; }
            50% { box-shadow: 0 0 8px var(--red-dim); }
        }

        /* ── Loss cells ── */
        .loss-ok  { color: var(--green); font-family: 'JetBrains Mono', monospace; font-size: 0.83rem; }
        .loss-mid { color: var(--amber); font-family: 'JetBrains Mono', monospace; font-size: 0.83rem; }
        .loss-bad { color: var(--red);   font-family: 'JetBrains Mono', monospace; font-size: 0.83rem; }
        .loss-na  { color: var(--txt-300); }

        /* ── IP code ── */
        .ip-tag {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            color: var(--cyan);
            background: var(--cyan-dim);
            padding: 3px 8px;
            border-radius: 5px;
            border: 1px solid rgba(0,212,255,0.18);
        }

        /* ── Target name ── */
        .target-name {
            font-weight: 600;
            color: var(--txt-100);
            display: flex;
            align-items: center;
            gap: 9px;
        }
        .target-icon {
            width: 28px; height: 28px;
            border-radius: 7px;
            background: var(--bg-raised);
            border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            font-size: 11px;
            color: var(--txt-200);
            flex-shrink: 0;
        }

        /* ── Time cell ── */
        .time-cell {
            font-size: 0.8rem;
            color: var(--txt-300);
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── Action buttons row ── */
        .actions { display: flex; gap: 5px; align-items: center; }

        /* ── Empty state ── */
        .empty-state {
            padding: 60px 20px;
            text-align: center;
        }
        .empty-state i {
            font-size: 2.5rem;
            color: var(--txt-300);
            margin-bottom: 12px;
            display: block;
            opacity: 0.5;
        }
        .empty-state p { color: var(--txt-300); font-size: 0.9rem; }

        /* ── Count badge ── */
        .count-pill {
            padding: 2px 9px;
            background: var(--cyan-dim);
            color: var(--cyan);
            border: 1px solid rgba(0,212,255,0.2);
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── Modal shared ── */
        .modal-overlay {
            display: none;
            position: fixed; inset: 0; z-index: 100;
            background: rgba(3,6,22,0.78);
            backdrop-filter: blur(6px);
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .modal-overlay.active { display: flex; }

        /* ── Edit Modal ── */
        .edit-modal-box {
            background: var(--bg-panel);
            border: 1px solid rgba(255,179,71,0.22);
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 460px;
            box-shadow: 0 28px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,179,71,0.08) inset;
            overflow: hidden;
            animation: modal-pop 0.22s cubic-bezier(0.22,1,0.36,1);
        }
        .edit-modal-head {
            position: relative;
            display: flex; align-items: center; justify-content: space-between;
            padding: 18px 22px;
            border-bottom: 1px solid rgba(255,179,71,0.15);
            background: linear-gradient(to bottom, rgba(255,179,71,0.08), transparent);
            overflow: hidden;
        }
        .edit-modal-head::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, var(--amber), transparent);
        }
        .edit-modal-head-left { display: flex; align-items: center; gap: 12px; }
        .edit-modal-icon {
            width: 36px; height: 36px;
            border-radius: 9px;
            background: var(--amber-dim);
            border: 1px solid rgba(255,179,71,0.25);
            display: flex; align-items: center; justify-content: center;
            color: var(--amber);
            font-size: 14px;
        }
        .edit-modal-head h5 {
            font-size: 0.95rem; font-weight: 700;
            color: var(--txt-100); margin: 0;
        }
        .edit-modal-head h5 small {
            display: block;
            font-size: 0.72rem; font-weight: 400;
            color: var(--txt-300); margin-top: 1px;
        }
        .modal-close {
            background: none; border: none;
            color: var(--txt-300); cursor: pointer;
            font-size: 0.9rem; padding: 6px; border-radius: 6px;
            transition: all 0.15s ease;
        }
        .modal-close:hover { color: var(--txt-100); background: var(--bg-raised); }
        .edit-modal-body { padding: 22px; }
        .modal-field { margin-bottom: 18px; }
        .modal-field:last-child { margin-bottom: 0; }
        .modal-field label {
            display: flex; align-items: center; gap: 7px;
            font-size: 0.72rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.07em;
            color: var(--txt-300); margin-bottom: 7px;
        }
        .modal-field label i { color: var(--amber); font-size: 0.68rem; }
        .modal-field input {
            width: 100%; padding: 11px 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border-med);
            border-radius: var(--radius-sm);
            color: var(--txt-100);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.88rem; outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .modal-field input:focus {
            border-color: var(--amber);
            box-shadow: 0 0 0 3px rgba(255,179,71,0.14);
        }
        .edit-modal-foot {
            display: flex; gap: 10px; justify-content: flex-end;
            padding: 16px 22px;
            border-top: 1px solid var(--border);
            background: var(--bg-surface);
        }
        .btn-amber {
            background: linear-gradient(135deg, var(--amber), #e08c00);
            color: #1a0d00;
            box-shadow: 0 4px 14px rgba(255,179,71,0.3);
        }
        .btn-amber:hover { box-shadow: 0 6px 20px rgba(255,179,71,0.45); transform: translateY(-1px); }

        /* ── Info Modal ── */
        .info-modal-box {
            background: var(--bg-panel);
            border: 1px solid rgba(0,212,255,0.22);
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 500px;
            box-shadow: 0 28px 72px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,212,255,0.07) inset;
            overflow: hidden;
            animation: modal-pop 0.22s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes modal-pop {
            from { opacity: 0; transform: scale(0.94) translateY(12px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .info-modal-head {
            position: relative;
            padding: 22px 22px 18px;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(135deg, rgba(0,212,255,0.06) 0%, transparent 60%);
            overflow: hidden;
        }
        .info-modal-head::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, var(--cyan), transparent);
        }
        .info-modal-head-row {
            display: flex; align-items: flex-start; justify-content: space-between;
        }
        .info-target-identity { display: flex; align-items: center; gap: 14px; }
        .info-target-avatar {
            width: 46px; height: 46px;
            border-radius: 12px;
            background: var(--cyan-dim);
            border: 1px solid rgba(0,212,255,0.22);
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; color: var(--cyan);
            flex-shrink: 0;
        }
        .info-target-name {
            font-size: 1.05rem; font-weight: 700;
            color: var(--txt-100); margin-bottom: 4px;
        }
        .info-target-ip {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            color: var(--cyan);
            background: var(--cyan-dim);
            padding: 3px 9px;
            border-radius: 5px;
            border: 1px solid rgba(0,212,255,0.18);
            display: inline-block;
        }
        .info-status-area { margin-top: 14px; display: flex; align-items: center; gap: 10px; }
        .info-status-label { font-size: 0.75rem; color: var(--txt-300); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

        .info-modal-body { padding: 20px 22px; }
        .info-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 18px;
        }
        .info-stat {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 12px 14px;
            text-align: center;
        }
        .info-stat-val {
            font-size: 1.35rem; font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            line-height: 1;
            margin-bottom: 5px;
        }
        .info-stat-lbl {
            font-size: 0.68rem; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.07em;
            color: var(--txt-300);
        }
        .info-divider {
            height: 1px;
            background: var(--border);
            margin: 16px 0;
        }
        .info-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 0;
        }
        .info-row-label {
            display: flex; align-items: center; gap: 8px;
            font-size: 0.8rem; color: var(--txt-300); font-weight: 500;
        }
        .info-row-label i { width: 14px; text-align: center; }
        .info-row-value { font-size: 0.85rem; color: var(--txt-100); font-weight: 600; }

        .info-modal-foot {
            display: flex; gap: 8px; align-items: center;
            padding: 14px 22px;
            border-top: 1px solid var(--border);
            background: var(--bg-surface);
        }
        .info-modal-foot .spacer { flex: 1; }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.7s linear infinite; }

        @media (max-width: 768px) {
            .app-shell { padding: 14px; gap: 14px; }
            .form-grid { grid-template-columns: 1fr; }
            .topbar { flex-direction: column; gap: 12px; align-items: flex-start; }
        }
    </style>
</head>
<body>
<div class="app-shell">

    <!-- ── Topbar ── -->
    <header class="topbar">
        <div class="brand">
            <div class="brand-icon"><i class="fas fa-satellite-dish"></i></div>
            <span class="brand-name">Ping<span>Monitor</span></span>
        </div>
        <div class="topbar-right">
            <div class="meta-chip">
                <span class="dot"></span>
                <span>Live &mdash; <strong>{{ $targets->count() }}</strong> targets</span>
            </div>
            <a href="{{ route('history') }}" class="btn btn-ghost">
                <i class="fas fa-clock-rotate-left"></i> History
            </a>
        </div>
    </header>

    <!-- ── Add Target ── -->
    <section class="card">
        <div class="card-top-line"></div>
        <div class="card-header">
            <div class="card-title"><i class="fas fa-circle-plus"></i> Add New Target</div>
        </div>
        <div class="card-body">
            <form method="POST" action="{{ route('targets.store') }}">
                @csrf
                <div class="form-grid">
                    <div class="field">
                        <label>Target Name</label>
                        <input type="text" name="name" placeholder="e.g. Google DNS" required>
                    </div>
                    <div class="field">
                        <label>IP / Hostname</label>
                        <input type="text" name="ip_address" placeholder="e.g. 8.8.8.8 or google.com" required>
                    </div>
                    <button type="submit" class="btn btn-cyan">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </form>
        </div>
    </section>

    <!-- ── Targets Table ── -->
    <section class="card" style="display:flex;flex-direction:column;overflow:hidden;">
        <div class="card-top-line"></div>
        <div class="card-header">
            <div class="card-title">
                <i class="fas fa-table-list"></i> Targets
                <span class="count-pill">{{ $targets->count() }}</span>
            </div>
            <button id="pingAllBtn" class="btn btn-green">
                <i class="fas fa-broadcast-tower"></i> Check All
            </button>
        </div>

        <div class="table-wrap" style="padding:0;flex:1;min-height:0;">
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th style="width:22%">Target</th>
                            <th style="width:20%">Address</th>
                            <th style="width:16%">Status</th>
                            <th style="width:11%">Loss</th>
                            <th style="width:16%">Last Check</th>
                            <th style="width:15%">Actions</th>
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
                                <div class="target-name">
                                    <div class="target-icon"><i class="fas fa-server"></i></div>
                                    {{ $target->name }}
                                </div>
                            </td>
                            <td><span class="ip-tag">{{ $target->ip_address }}</span></td>
                            <td id="status-{{ $target->id }}">
                                <span class="badge badge-unknown"><i class="fas fa-circle-question"></i> Unknown</span>
                            </td>
                            <td id="loss-{{ $target->id }}">
                                @if($loss === null)
                                    <span class="loss-na">—</span>
                                @elseif($loss === 0)
                                    <span class="loss-ok">0%</span>
                                @elseif($loss <= 25)
                                    <span class="loss-mid">{{ $loss }}%</span>
                                @else
                                    <span class="loss-bad">{{ $loss }}%</span>
                                @endif
                            </td>
                            <td id="time-{{ $target->id }}">
                                <span class="time-cell">Never</span>
                            </td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-icon btn-outline-cyan ping-btn"
                                        data-target-id="{{ $target->id }}"
                                        data-ping-url="{{ route('targets.ping', $target) }}"
                                        title="Check">
                                        <i class="fas fa-satellite-dish"></i> Check
                                    </button>
                                    <button class="btn btn-icon btn-outline-cyan info-btn"
                                        style="border-color:rgba(0,212,255,0.2);color:var(--txt-200);"
                                        data-target-id="{{ $target->id }}"
                                        data-target-name="{{ $target->name }}"
                                        data-target-ip="{{ $target->ip_address }}"
                                        data-total-pings="{{ $target->total_pings ?? 0 }}"
                                        data-failed-pings="{{ $target->failed_pings ?? 0 }}"
                                        data-loss="{{ $loss ?? 'null' }}"
                                        data-ping-url="{{ route('targets.ping', $target) }}"
                                        data-edit-url="{{ route('targets.update', $target) }}"
                                        data-delete-url="{{ route('targets.destroy', $target) }}"
                                        title="View details">
                                        <i class="fas fa-circle-info"></i>
                                    </button>
                                    <button class="btn btn-icon btn-outline-amber edit-btn"
                                        data-target-id="{{ $target->id }}"
                                        data-target-name="{{ $target->name }}"
                                        data-target-ip="{{ $target->ip_address }}"
                                        data-edit-url="{{ route('targets.update', $target) }}"
                                        title="Edit">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                    <form method="POST" action="{{ route('targets.destroy', $target) }}" style="display:inline;"
                                          onsubmit="return confirm('Delete {{ $target->name }}?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn btn-icon btn-outline-red" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="6">
                                <div class="empty-state">
                                    <i class="fas fa-radar"></i>
                                    <p>No targets yet. Add one above to start monitoring.</p>
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </section>
</div>

<!-- ── Edit Modal ── -->
<div class="modal-overlay" id="editModal">
    <div class="edit-modal-box">
        <div class="edit-modal-head">
            <div class="edit-modal-head-left">
                <div class="edit-modal-icon"><i class="fas fa-pen"></i></div>
                <h5>Edit Target<small id="editModalSubtitle">Modify target details</small></h5>
            </div>
            <button class="modal-close" id="closeEditModal"><i class="fas fa-xmark"></i></button>
        </div>
        <form id="editTargetForm" method="POST">
            @csrf
            @method('PUT')
            <div class="edit-modal-body">
                <div class="modal-field">
                    <label><i class="fas fa-tag"></i> Target Name</label>
                    <input type="text" id="edit_target_name" name="name" placeholder="e.g. Google DNS" required>
                </div>
                <div class="modal-field">
                    <label><i class="fas fa-network-wired"></i> IP Address / Hostname</label>
                    <input type="text" id="edit_target_ip" name="ip_address" placeholder="e.g. 8.8.8.8" required>
                </div>
            </div>
            <div class="edit-modal-foot">
                <button type="button" class="btn btn-ghost" id="cancelEditModal">Cancel</button>
                <button type="submit" class="btn btn-amber"><i class="fas fa-check"></i> Save Changes</button>
            </div>
        </form>
    </div>
</div>

<!-- ── Info Modal ── -->
<div class="modal-overlay" id="infoModal">
    <div class="info-modal-box">
        <div class="info-modal-head">
            <div class="info-modal-head-row">
                <div class="info-target-identity">
                    <div class="info-target-avatar"><i class="fas fa-server"></i></div>
                    <div>
                        <div class="info-target-name" id="infoName">—</div>
                        <span class="info-target-ip" id="infoIP">—</span>
                    </div>
                </div>
                <button class="modal-close" id="closeInfoModal"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="info-status-area">
                <span class="info-status-label">Status</span>
                <span id="infoStatusBadge" class="badge badge-unknown"><i class="fas fa-circle-question"></i> Unknown</span>
            </div>
        </div>

        <div class="info-modal-body">
            <div class="info-stats-grid">
                <div class="info-stat">
                    <div class="info-stat-val" id="infoTotal" style="color:var(--cyan)">—</div>
                    <div class="info-stat-lbl">Total Pings</div>
                </div>
                <div class="info-stat">
                    <div class="info-stat-val" id="infoSuccess" style="color:var(--green)">—</div>
                    <div class="info-stat-lbl">Successful</div>
                </div>
                <div class="info-stat">
                    <div class="info-stat-val" id="infoFailed" style="color:var(--red)">—</div>
                    <div class="info-stat-lbl">Failed</div>
                </div>
            </div>

            <div class="info-divider"></div>

            <div class="info-row">
                <span class="info-row-label"><i class="fas fa-percent"></i> Packet Loss</span>
                <span class="info-row-value" id="infoLoss">—</span>
            </div>
            <div class="info-row">
                <span class="info-row-label"><i class="fas fa-clock"></i> Last Check</span>
                <span class="info-row-value" id="infoLastCheck" style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--txt-300);">—</span>
            </div>
        </div>

        <div class="info-modal-foot">
            <button class="btn btn-outline-cyan btn-icon info-ping-btn" id="infoPingBtn">
                <i class="fas fa-satellite-dish"></i> Ping Now
            </button>
            <div class="spacer"></div>
            <button class="btn btn-outline-amber btn-icon info-edit-trigger" id="infoEditTrigger">
                <i class="fas fa-pen"></i> Edit
            </button>
            <form id="infoDeleteForm" method="POST" style="display:inline;" onsubmit="return confirm('Delete this target?')">
                @csrf
                @method('DELETE')
                <button type="submit" class="btn btn-outline-red btn-icon">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </form>
        </div>
    </div>
</div>

<script>
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    // ── helpers ──────────────────────────────────────────────────────────

    function renderLoss(pct) {
        if (pct === null || pct === undefined) return '<span class="loss-na">—</span>';
        if (pct === 0)   return '<span class="loss-ok">0%</span>';
        if (pct <= 25)   return `<span class="loss-mid">${pct}%</span>`;
        return `<span class="loss-bad">${pct}%</span>`;
    }

    // ── Edit modal ────────────────────────────────────────────────────────

    const editModal = document.getElementById('editModal');

    function openEditModal(name, ip, editUrl) {
        document.getElementById('edit_target_name').value = name;
        document.getElementById('edit_target_ip').value   = ip;
        document.getElementById('editTargetForm').action  = editUrl;
        document.getElementById('editModalSubtitle').textContent = name;
        editModal.classList.add('active');
    }
    function closeEditModal() { editModal.classList.remove('active'); }

    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditModal').addEventListener('click', closeEditModal);
    editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            openEditModal(this.dataset.targetName, this.dataset.targetIp, this.dataset.editUrl);
        });
    });

    // ── Info modal ────────────────────────────────────────────────────────

    const infoModal = document.getElementById('infoModal');
    let infoCurrentData = {};

    function openInfoModal(data) {
        infoCurrentData = data;
        document.getElementById('infoName').textContent   = data.name;
        document.getElementById('infoIP').textContent     = data.ip;

        const total   = parseInt(data.totalPings)  || 0;
        const failed  = parseInt(data.failedPings) || 0;
        const success = Math.max(0, total - failed);

        document.getElementById('infoTotal').textContent   = total   || '—';
        document.getElementById('infoSuccess').textContent = total ? success : '—';
        document.getElementById('infoFailed').textContent  = total ? failed  : '—';

        const lossEl = document.getElementById('infoLoss');
        if (data.loss === 'null' || data.loss === null || data.loss === undefined || !total) {
            lossEl.textContent = '—'; lossEl.style.color = 'var(--txt-300)';
        } else {
            const l = parseInt(data.loss);
            lossEl.textContent = l + '%';
            lossEl.style.color = l === 0 ? 'var(--green)' : l <= 25 ? 'var(--amber)' : 'var(--red)';
        }

        const liveStatus = document.getElementById(`status-${data.id}`);
        const badge = document.getElementById('infoStatusBadge');
        if (liveStatus) badge.outerHTML = liveStatus.innerHTML;
        else badge.outerHTML = `<span id="infoStatusBadge" class="badge badge-unknown"><i class="fas fa-circle-question"></i> Unknown</span>`;

        const liveTime = document.getElementById(`time-${data.id}`);
        document.getElementById('infoLastCheck').textContent = liveTime
            ? (liveTime.textContent.trim() || 'Never') : 'Never';

        document.getElementById('infoDeleteForm').action = data.deleteUrl;
        infoModal.classList.add('active');
    }
    function closeInfoModal() { infoModal.classList.remove('active'); }

    document.getElementById('closeInfoModal').addEventListener('click', closeInfoModal);
    infoModal.addEventListener('click', e => { if (e.target === infoModal) closeInfoModal(); });

    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            openInfoModal({
                id:          this.dataset.targetId,
                name:        this.dataset.targetName,
                ip:          this.dataset.targetIp,
                totalPings:  this.dataset.totalPings,
                failedPings: this.dataset.failedPings,
                loss:        this.dataset.loss,
                pingUrl:     this.dataset.pingUrl,
                editUrl:     this.dataset.editUrl,
                deleteUrl:   this.dataset.deleteUrl,
            });
        });
    });

    document.getElementById('infoEditTrigger').addEventListener('click', () => {
        closeInfoModal();
        openEditModal(infoCurrentData.name, infoCurrentData.ip, infoCurrentData.editUrl);
    });

    document.getElementById('infoPingBtn').addEventListener('click', function () {
        const d = infoCurrentData;
        if (!d.id || !d.pingUrl) return;
        const btn = this;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> Pinging…';
        btn.disabled = true;

        fetch(d.pingUrl, { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' } })
        .then(r => r.json())
        .then(data => {
            const time = new Date().toLocaleTimeString();
            const onlineHTML  = '<span id="infoStatusBadge" class="badge badge-online"><i class="fas fa-circle" style="font-size:7px"></i> Online</span>';
            const offlineHTML = '<span id="infoStatusBadge" class="badge badge-offline"><i class="fas fa-circle" style="font-size:7px"></i> Offline</span>';
            document.getElementById('infoStatusBadge').outerHTML = data.success ? onlineHTML : offlineHTML;
            document.getElementById('infoLastCheck').textContent = time;
            // also update the table row
            const statusEl = document.getElementById(`status-${d.id}`);
            const timeEl   = document.getElementById(`time-${d.id}`);
            if (statusEl) statusEl.innerHTML = data.success ? '<span class="badge badge-online"><i class="fas fa-circle" style="font-size:7px"></i> Online</span>' : '<span class="badge badge-offline"><i class="fas fa-circle" style="font-size:7px"></i> Offline</span>';
            if (timeEl)   timeEl.innerHTML   = `<span class="time-cell">${time}</span>`;
            if (data.loss_percent !== undefined) {
                const lossEl = document.getElementById('infoLoss');
                const l = data.loss_percent;
                lossEl.textContent = l !== null ? l + '%' : '—';
                lossEl.style.color = l === 0 ? 'var(--green)' : l <= 25 ? 'var(--amber)' : 'var(--red)';
                const tableLoss = document.getElementById(`loss-${d.id}`);
                if (tableLoss) tableLoss.innerHTML = renderLoss(l);
            }
        })
        .catch(() => {
            document.getElementById('infoStatusBadge').outerHTML = '<span id="infoStatusBadge" class="badge badge-offline"><i class="fas fa-triangle-exclamation"></i> Error</span>';
        })
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; });
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

        statusEl.innerHTML = '<span class="badge badge-checking"><i class="fas fa-circle-notch spin"></i> Checking</span>';
        timeEl.innerHTML   = '<span class="time-cell">Checking…</span>';
        button.innerHTML   = '<i class="fas fa-circle-notch spin"></i>';
        button.disabled    = true;

        fetch(url, { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken, 'Content-Type': 'application/json' } })
        .then(r => r.json())
        .then(data => {
            const time = new Date().toLocaleTimeString();
            statusEl.innerHTML = data.success
                ? '<span class="badge badge-online"><i class="fas fa-circle" style="font-size:7px"></i> Online</span>'
                : '<span class="badge badge-offline"><i class="fas fa-circle" style="font-size:7px"></i> Offline</span>';
            timeEl.innerHTML = `<span class="time-cell">${time}</span>`;
            if (lossEl && data.loss_percent !== undefined) {
                lossEl.innerHTML = renderLoss(data.loss_percent);
            }
        })
        .catch(() => {
            statusEl.innerHTML = '<span class="badge badge-offline"><i class="fas fa-triangle-exclamation"></i> Error</span>';
            timeEl.innerHTML   = '<span class="time-cell">Error</span>';
        })
        .finally(() => { button.innerHTML = orig; button.disabled = false; });
    }

    // ── ping all ──────────────────────────────────────────────────────────

    document.getElementById('pingAllBtn').addEventListener('click', function () {
        const btn  = this;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> Checking…';
        btn.disabled  = true;

        document.querySelectorAll('[id^="status-"]').forEach(el => {
            el.innerHTML = '<span class="badge badge-checking"><i class="fas fa-circle-notch spin"></i> Checking</span>';
        });
        document.querySelectorAll('[id^="time-"]').forEach(el => {
            el.innerHTML = '<span class="time-cell">Checking…</span>';
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
                        ? '<span class="badge badge-online"><i class="fas fa-circle" style="font-size:7px"></i> Online</span>'
                        : '<span class="badge badge-offline"><i class="fas fa-circle" style="font-size:7px"></i> Offline</span>';
                    timeEl.innerHTML = `<span class="time-cell">${time}</span>`;
                    if (lossEl && result.loss_percent !== undefined) {
                        lossEl.innerHTML = renderLoss(result.loss_percent);
                    }
                }
            });
        })
        .catch(() => {
            document.querySelectorAll('[id^="status-"]').forEach(el => {
                el.innerHTML = '<span class="badge badge-offline"><i class="fas fa-triangle-exclamation"></i> Error</span>';
            });
            document.querySelectorAll('[id^="time-"]').forEach(el => {
                el.innerHTML = '<span class="time-cell">Error</span>';
            });
        })
        .finally(() => { btn.innerHTML = orig; btn.disabled = false; });
    });
</script>
</body>
</html>
