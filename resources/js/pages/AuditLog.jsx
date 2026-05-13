import React, { useState, useEffect } from 'react';
import axios from 'axios';

const actionMeta = {
    created:               { label: 'Created',         color: 'success' },
    updated:               { label: 'Updated',         color: 'warning' },
    deleted:               { label: 'Deleted',         color: 'error' },
    pinged:                { label: 'Pinged',          color: 'info' },
    ping_all:              { label: 'Bulk Ping',       color: 'info' },
    paused:                { label: 'Paused',          color: 'warning' },
    resumed:               { label: 'Resumed',         color: 'success' },
    login:                 { label: 'Login',           color: 'info' },
    logout:                { label: 'Logout',          color: 'default' },
    password_changed:      { label: 'Password Changed',  color: 'warning' },
    password_changed_by_admin: { label: 'Admin Reset Password', color: 'warning' },
};

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

function formatFullTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
}

export default function AuditLog() {
    const [logs, setLogs]               = useState([]);
    const [page, setPage]               = useState(1);
    const [lastPage, setLastPage]       = useState(1);
    const [total, setTotal]             = useState(0);
    const [loading, setLoading]         = useState(true);
    const [actions, setActions]         = useState([]);
    const [users, setUsers]             = useState([]);

    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser]     = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo]     = useState('');
    const [activeFilters, setActiveFilters]   = useState(0);
    const [expandedId, setExpandedId]   = useState(null);

    const fetchLogs = async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p });
            if (filterAction)   params.set('action', filterAction);
            if (filterUser)     params.set('user_id', filterUser);
            if (filterDateFrom) params.set('date_from', filterDateFrom);
            if (filterDateTo)   params.set('date_to', filterDateTo);
            const { data } = await axios.get(`/api/audit-logs?${params}`);
            setLogs(data.data);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotal(data.total);
            setActions(data.actions);
            setUsers(data.users);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const count = [filterAction, filterUser, filterDateFrom, filterDateTo].filter(Boolean).length;
        setActiveFilters(count);
    }, [filterAction, filterUser, filterDateFrom, filterDateTo]);

    useEffect(() => { fetchLogs(); }, []);

    const applyFilters = () => fetchLogs(1);

    const clearFilters = () => {
        setFilterAction(''); setFilterUser('');
        setFilterDateFrom(''); setFilterDateTo('');
        fetchLogs(1);
    };

    const pages = [];
    if (lastPage <= 7) {
        for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('…');
        for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) pages.push(i);
        if (page < lastPage - 2) pages.push('…');
        pages.push(lastPage);
    }

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-5xl mx-auto px-6 py-6">

                {/* ── Header ──────────────────────────────────── */}
                <div className="anim-fade-up flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                        <div>
                            <h1 className="text-base font-bold text-base-content leading-tight">Audit Log</h1>
                            <p className="text-xs text-base-content/40 mt-0.5">
                                {total > 0 ? `${total} event${total !== 1 ? 's' : ''} recorded` : 'Track every change'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => fetchLogs(page)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-base-300 rounded-lg text-base-content/50 hover:bg-base-300/50 hover:text-base-content transition-all">
                        <i className="fas fa-sync-alt text-[10px]"></i> Refresh
                    </button>
                </div>

                {/* ── Filters ──────────────────────────────────── */}
                <div className="anim-fade-up anim-delay-1 flex items-center flex-wrap gap-2 mb-5 p-3 bg-base-200/50 border border-base-300/40 rounded-xl">
                    <i className="fas fa-filter text-xs text-base-content/30"></i>
                    <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                        className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50">
                        <option value="">All actions</option>
                        {actions.map(a => (
                            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                        className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50">
                        <option value="">All users</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                        className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 [color-scheme:dark]" />
                    <span className="text-[10px] text-base-content/30">—</span>
                    <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                        className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 [color-scheme:dark]" />
                    <button onClick={applyFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                        <i className="fas fa-search text-[10px]"></i> Search
                    </button>
                    {activeFilters > 0 && (
                        <button onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-base-content/50 hover:text-error transition-colors">
                            <i className="fas fa-times text-[10px]"></i> Clear ({activeFilters})
                        </button>
                    )}
                </div>

                {/* ── Loading ──────────────────────────────────── */}
                {loading ? (
                    <div className="space-y-2">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-16 bg-base-200/50 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-clipboard-list text-xl text-base-content/20"></i>
                        </div>
                        <p className="text-sm font-medium text-base-content/40 mb-1">No audit logs found</p>
                        <p className="text-xs text-base-content/30">
                            {activeFilters > 0 ? 'Try adjusting your filters' : 'Actions will appear here as they happen'}
                        </p>
                        {activeFilters > 0 && (
                            <button onClick={clearFilters}
                                className="mt-4 px-4 py-2 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ── Timeline ────────────────────────────── */}
                        <div className="space-y-1.5">
                            {logs.map((log, idx) => {
                                const meta = actionMeta[log.action] ?? { label: log.action?.replace(/_/g, ' '), color: 'default' };
                                const colorMap = {
                                    success: { dot: 'bg-success', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success' },
                                    warning: { dot: 'bg-warning', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning' },
                                    error:   { dot: 'bg-error',   bg: 'bg-error/10',   border: 'border-error/25',   text: 'text-error' },
                                    info:    { dot: 'bg-info',    bg: 'bg-info/10',    border: 'border-info/25',    text: 'text-info' },
                                    default: { dot: 'bg-base-content/20', bg: 'bg-base-200/50', border: 'border-base-300/40', text: 'text-base-content/50' },
                                };
                                const c = colorMap[meta.color] ?? colorMap.default;
                                const expanded = expandedId === log.id;

                                return (
                                    <div key={log.id}
                                        className="anim-fade-up bg-base-200/30 border border-base-300/30 rounded-xl hover:bg-base-200/60 transition-all cursor-pointer"
                                        style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
                                        onClick={() => setExpandedId(expanded ? null : log.id)}>

                                        <div className="flex items-center gap-3 px-4 py-3">
                                            {/* Color indicator */}
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`}></div>

                                            {/* Time */}
                                            <div className="w-14 flex-shrink-0">
                                                <div className="text-xs font-medium text-base-content/70 tabular-nums leading-tight">
                                                    {log.created_at?.slice(11, 19)}
                                                </div>
                                                <div className="text-[10px] text-base-content/30 tabular-nums leading-tight mt-0.5">
                                                    {formatTime(log.created_at)}
                                                </div>
                                            </div>

                                            {/* Badge */}
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.border} ${c.text}`}>
                                                {meta.label}
                                            </span>

                                            {/* Who */}
                                            <span className="flex items-center gap-1.5 text-xs text-base-content/60 min-w-0 flex-1">
                                                <span className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center flex-shrink-0">
                                                    <i className="fas fa-user text-[8px] text-base-content/40"></i>
                                                </span>
                                                <span className="truncate font-medium text-base-content/70">
                                                    {log.user?.name ?? 'System'}
                                                </span>
                                            </span>

                                            {/* Target */}
                                            <span className="hidden sm:flex items-center gap-1.5 text-xs text-base-content/40">
                                                <i className="fas fa-tag text-[9px]"></i>
                                                <span className="capitalize">{log.target_type ?? '—'}</span>
                                                {log.target_id && <span className="text-base-content/20">#{log.target_id}</span>}
                                            </span>

                                            {/* IP */}
                                            {log.ip_address && (
                                                <span className="hidden md:block text-[10px] text-base-content/20 tabular-nums font-mono">
                                                    {log.ip_address}
                                                </span>
                                            )}

                                            {/* Expand icon */}
                                            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[9px] text-base-content/20 transition-transform flex-shrink-0`}></i>
                                        </div>

                                        {/* ── Expanded details ── */}
                                        {expanded && (
                                            <div className="border-t border-base-300/20 px-4 py-3 space-y-2 text-xs">
                                                <div className="flex items-center gap-6 flex-wrap">
                                                    <div>
                                                        <span className="text-base-content/30 block text-[10px]">Timestamp</span>
                                                        <span className="text-base-content/70">{formatFullTime(log.created_at)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-base-content/30 block text-[10px]">User</span>
                                                        <span className="text-base-content/70">{log.user?.name ?? 'System'} ({log.user?.email ?? '—'})</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-base-content/30 block text-[10px]">Action</span>
                                                        <span className="text-base-content/70 capitalize">{log.action.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-base-content/30 block text-[10px]">Target</span>
                                                        <span className="text-base-content/70 capitalize">{log.target_type ?? '—'} {log.target_id ? `#${log.target_id}` : ''}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-base-content/30 block text-[10px]">IP Address</span>
                                                        <span className="text-base-content/70 font-mono">{log.ip_address ?? '—'}</span>
                                                    </div>
                                                </div>
                                                {(log.old_values || log.new_values) && (() => {
                                                    const oldV = log.old_values ?? {};
                                                    const newV = log.new_values ?? {};
                                                    const allKeys = [...new Set([...Object.keys(oldV), ...Object.keys(newV)])]
                                                        .filter(k => k !== 'updated_at' && k !== 'created_at');
                                                    const changed = allKeys.filter(k => JSON.stringify(oldV[k]) !== JSON.stringify(newV[k]));
                                                    if (changed.length === 0) return null;

                                                    let sentence;
                                                    if (log.action === 'created') {
                                                        sentence = `Created ${log.target_type} with name "${newV.name ?? newV.ip_address ?? ''}"`;
                                                    } else if (log.action === 'deleted') {
                                                        sentence = `Deleted ${log.target_type} "${oldV.name ?? oldV.ip_address ?? ''}"`;
                                                    } else if (log.action === 'updated') {
                                                        const parts = changed.map(k => {
                                                            const oldVal = oldV[k] !== undefined ? `"${oldV[k]}"` : '(empty)';
                                                            const newVal = newV[k] !== undefined ? `"${newV[k]}"` : '(empty)';
                                                            return `${k} from ${oldVal} to ${newVal}`;
                                                        });
                                                        sentence = `Updated ${log.target_type}: ${parts.join(', ')}`;
                                                    } else {
                                                        sentence = `Action on ${log.target_type} #${log.target_id}`;
                                                    }
                                                    return (
                                                        <div className="pt-2 border-t border-base-300/20">
                                                            <p className="text-[11px] text-base-content/60 leading-relaxed">{sentence}</p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Pagination ──────────────────────────── */}
                        {lastPage > 1 && (
                            <div className="flex items-center justify-center gap-1.5 mt-6">
                                <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-base-300 text-base-content/50 hover:bg-base-300/50 disabled:opacity-30 transition-all">
                                    <i className="fas fa-chevron-left text-[9px]"></i>
                                </button>
                                {pages.map((p, i) =>
                                    p === '…' ? (
                                        <span key={`dots-${i}`} className="px-1 text-xs text-base-content/20">…</span>
                                    ) : (
                                        <button key={p} onClick={() => fetchLogs(p)}
                                            className={`min-w-[30px] h-[30px] text-xs font-medium rounded-lg border transition-all ${
                                                p === page
                                                    ? 'bg-primary text-white border-primary shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_30%,transparent)]'
                                                    : 'border-base-300 text-base-content/50 hover:bg-base-300/50'
                                            }`}>
                                            {p}
                                        </button>
                                    )
                                )}
                                <button disabled={page >= lastPage} onClick={() => fetchLogs(page + 1)}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-base-300 text-base-content/50 hover:bg-base-300/50 disabled:opacity-30 transition-all">
                                    <i className="fas fa-chevron-right text-[9px]"></i>
                                </button>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
}
