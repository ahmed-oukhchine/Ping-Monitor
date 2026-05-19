import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';

function useActionMeta() {
    const { t } = useLang();
    return {
        created:               { label: t('audit.created'),         color: 'success', icon: 'fa-plus-circle' },
        updated:               { label: t('audit.updated'),         color: 'warning', icon: 'fa-pen' },
        deleted:               { label: t('audit.deleted'),         color: 'error',   icon: 'fa-trash-alt' },
        pinged:                { label: t('audit.pinged'),          color: 'info',    icon: 'fa-bolt' },
        ping_all:              { label: t('audit.bulkPing'),       color: 'info',    icon: 'fa-broadcast-tower' },
        paused:                { label: t('audit.paused'),          color: 'warning', icon: 'fa-pause-circle' },
        resumed:               { label: t('audit.resumed'),         color: 'success', icon: 'fa-play-circle' },
        login:                 { label: t('audit.login'),           color: 'info',    icon: 'fa-sign-in-alt' },
        logout:                { label: t('audit.logout'),          color: 'default', icon: 'fa-sign-out-alt' },
        password_changed:      { label: t('audit.passwordChanged'),  color: 'warning', icon: 'fa-key' },
        password_changed_by_admin: { label: t('audit.adminResetPassword'), color: 'warning', icon: 'fa-user-shield' },
    };
}

const avatarColors = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function nameColor(name) {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatTime(iso, t) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return t('audit.justNow');
    if (diff < 3600) return t('audit.minsAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('audit.hoursAgo', { n: Math.floor(diff / 3600) });
    if (diff < 172800) return t('audit.yesterday');
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

function dateLabel(iso, t) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dDate.getTime() === today.getTime()) return t('audit.today');
    if (dDate.getTime() === yesterday.getTime()) return t('audit.yesterday');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export default function AuditLog({ active = false }) {
    const { t } = useLang();
    const actionMeta = useActionMeta();
    const [logs, setLogs]               = useState([]);
    const [page, setPage]               = useState(1);
    const [lastPage, setLastPage]       = useState(1);
    const [total, setTotal]             = useState(0);
    const [todayCount, setTodayCount]   = useState(0);
    const [loading, setLoading]         = useState(true);
    const [actions, setActions]         = useState([]);
    const [users, setUsers]             = useState([]);

    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser]     = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo]     = useState('');
    const [activeFilters, setActiveFilters]   = useState(0);
    const [expandedId, setExpandedId]   = useState(null);

    const fetchLogs = async (p) => {
        const targetPage = p ?? page;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: targetPage });
            if (filterAction)   params.set('action', filterAction);
            if (filterUser)     params.set('user_id', filterUser);
            if (filterDateFrom) params.set('date_from', filterDateFrom);
            if (filterDateTo)   params.set('date_to', filterDateTo);
            const { data } = await axios.get(`/api/audit-logs?${params}`);
            setLogs(data.data);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotal(data.total);
            setTodayCount(data.today_count);
            setActions(data.actions);
            setUsers(data.users);
        } catch {}
        finally { setLoading(false); }
    };

    useEffect(() => {
        const count = [filterAction, filterUser, filterDateFrom, filterDateTo].filter(Boolean).length;
        setActiveFilters(count);
    }, [filterAction, filterUser, filterDateFrom, filterDateTo]);

    useEffect(() => { fetchLogs(1); }, []);

    const fetchRef = useRef(fetchLogs);
    fetchRef.current = fetchLogs;

    useEffect(() => {
        if (active) fetchRef.current();
    }, [active]);

    const applyFilters = () => fetchLogs(1);

    const clearFilters = () => {
        setFilterAction(''); setFilterUser('');
        setFilterDateFrom(''); setFilterDateTo('');
        fetchLogs(1);
    };

    const perPage = 15;
    const from = total > 0 ? (page - 1) * perPage + 1 : 0;
    const to = Math.min(page * perPage, total);

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

    const colorMap = {
        success: { dot: 'bg-success', bg: 'bg-success/10', border: 'border-success/25', text: 'text-success' },
        warning: { dot: 'bg-warning', bg: 'bg-warning/10', border: 'border-warning/25', text: 'text-warning' },
        error:   { dot: 'bg-error',   bg: 'bg-error/10',   border: 'border-error/25',   text: 'text-error' },
        info:    { dot: 'bg-info',    bg: 'bg-info/10',    border: 'border-info/25',    text: 'text-info' },
        default: { dot: 'bg-base-content/20', bg: 'bg-base-200/50', border: 'border-base-300/40', text: 'text-base-content/50' },
    };

    const statsConfig = [
        { label: t('audit.totalEvents'), value: total.toLocaleString(), icon: 'fa-clipboard-list' },
        { label: t('audit.today'),       value: todayCount,            icon: 'fa-calendar-day' },
        { label: t('audit.activeUsers'), value: users.length,          icon: 'fa-users' },
    ];

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-5xl mx-auto px-6 py-6">

                <div className="anim-fade-up flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                        <div>
                            <h1 className="text-base font-bold text-base-content leading-tight">{t('audit.title')}</h1>
                            <p className="text-xs text-base-content/40 mt-0.5">
                                {total > 0 ? t('audit.eventsRecorded', { n: total }) : t('audit.trackEveryChange')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="anim-fade-up anim-delay-1 grid grid-cols-3 gap-3 mb-5">
                    {statsConfig.map((s, i) => (
                        <div key={s.label}
                            className="bg-base-200/50 border border-base-300/40 rounded-xl px-4 py-3 flex items-center gap-3"
                            style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                i === 0 ? 'bg-primary/15 text-primary' :
                                i === 1 ? 'bg-warning/15 text-warning' :
                                'bg-info/15 text-info'
                            }`}>
                                <i className={`fas ${s.icon} text-sm`}></i>
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold text-base-content/30 uppercase tracking-wider">{s.label}</div>
                                <div className="text-xl font-black text-base-content tabular-nums leading-none mt-0.5">{s.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="anim-fade-up anim-delay-1 flex items-center flex-wrap gap-2 mb-3 p-3 bg-base-200/50 border border-base-300/40 rounded-xl">
                    <i className="fas fa-filter text-xs text-base-content/30"></i>
                    <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                        className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50">
                        <option value="">{t('audit.allActions')}</option>
                        {actions.map(a => (
                            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                        className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50">
                        <option value="">{t('audit.allUsers')}</option>
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
                        className="btn-prime flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">
                        <i className="fas fa-search text-[10px]"></i> {t('audit.search')}
                    </button>
                    {activeFilters > 0 && (
                        <button onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-base-content/50 hover:text-error transition-colors">
                            <i className="fas fa-times text-[10px]"></i> {t('audit.clear')} ({activeFilters})
                        </button>
                    )}
                </div>

                {!loading && logs.length > 0 && (
                    <div className="anim-fade-up anim-delay-1 text-[11px] text-base-content/30 mb-3 tabular-nums">
                        {t('audit.showing')} <strong className="text-base-content/50">{from}–{to}</strong> {t('audit.of')} <strong className="text-base-content/50">{total.toLocaleString()}</strong>
                    </div>
                )}

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
                        <p className="text-sm font-medium text-base-content/40 mb-1">{t('audit.noLogsFound')}</p>
                        <p className="text-xs text-base-content/30">
                            {activeFilters > 0 ? t('audit.adjustFilters') : t('audit.logsWillAppear')}
                        </p>
                        {activeFilters > 0 && (
                            <button onClick={clearFilters}
                                className="mt-4 px-4 py-2 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                                {t('audit.clearFilters')}
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                                {logs.map((log, idx) => {
                                    const meta = actionMeta[log.action] ?? { label: log.action?.replace(/_/g, ' '), color: 'default', icon: 'fa-circle' };
                                    const c = colorMap[meta.color] ?? colorMap.default;
                                    const expanded = expandedId === log.id;

                                const prevDate = idx > 0 ? dateLabel(logs[idx - 1].created_at, t) : null;
                                const currDate = dateLabel(log.created_at, t);
                                    const showDateHeader = prevDate !== currDate;

                                    return (
                                        <React.Fragment key={log.id}>
                                            {showDateHeader && (
                                                <div className="flex items-center gap-2 pt-4 pb-1">
                                                    <span className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest">{currDate}</span>
                                                    <div className="flex-1 h-px bg-base-300/30"></div>
                                                </div>
                                            )}

                                            <div className={`anim-fade-up transition-all cursor-pointer ${
                                                expanded ? 'shadow-[0_0_20px_color-mix(in_oklch,var(--color-primary)_12%,transparent)]' : ''
                                            }`}
                                            style={{ animationDelay: `${Math.min(idx * 0.02, 0.25)}s` }}>
                                                <div className={`bg-base-200/30 border rounded-xl hover:bg-base-200/60 transition-all overflow-hidden ${
                                                    expanded ? 'border-primary/30' : 'border-base-300/30 hover:border-base-300/60'
                                                }`}
                                                onClick={() => setExpandedId(expanded ? null : log.id)}>

                                                    <div className="flex items-center gap-3 px-4 py-3">
                                                        <div className="w-14 flex-shrink-0">
                                                            <div className="text-xs font-medium text-base-content/70 tabular-nums leading-tight">
                                                                {log.created_at?.slice(11, 19)}
                                                            </div>
                                                            <div className={`text-[10px] tabular-nums leading-tight mt-0.5 ${expanded ? 'text-base-content/40' : 'text-base-content/30'}`}>
                                                                {formatTime(log.created_at, t)}
                                                            </div>
                                                        </div>

                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.border} ${c.text} flex-shrink-0`}>
                                                            <i className={`fas ${meta.icon} text-[9px]`}></i>
                                                            {meta.label}
                                                        </span>

                                                        <span className="flex items-center gap-1.5 text-xs text-base-content/60 min-w-0 flex-1">
                                                            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden text-white text-[9px] font-bold"
                                                                style={{ backgroundColor: nameColor(log.user?.name) }}>
                                                                {log.user?.name
                                                                    ? log.user.name.charAt(0).toUpperCase()
                                                                    : <i className="fas fa-user text-[8px]"></i>
                                                                }
                                                            </span>
                                                            <span className="truncate font-medium text-base-content/70">
                                                                {log.user?.name ?? 'System'}
                                                            </span>
                                                        </span>

                                                        <span className="hidden sm:flex items-center gap-1.5 text-xs text-base-content/40">
                                                            <i className="fas fa-tag text-[9px]"></i>
                                                            <span className="capitalize">{log.target_type ?? '—'}</span>
                                                            {log.target_id && <span className="text-base-content/20">#{log.target_id}</span>}
                                                        </span>

                                                        {log.ip_address && (
                                                            <span className="hidden md:block text-[10px] text-base-content/20 tabular-nums font-mono">
                                                                {log.ip_address}
                                                            </span>
                                                        )}

                                                        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[9px] text-base-content/20 transition-transform flex-shrink-0`}></i>
                                                    </div>

                                                    <div className={`transition-all duration-200 ease-in-out ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                                        {expanded && (
                                                            <div className="border-t border-base-300/20 px-4 py-3 space-y-3 text-xs">
                                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                                                    <div className="bg-base-200/50 rounded-lg p-2.5">
                                                                        <span className="text-base-content/30 block text-[10px] mb-0.5 font-medium">{t('audit.timestamp')}</span>
                                                                        <span className="text-base-content/70 text-[11px]">{formatFullTime(log.created_at)}</span>
                                                                    </div>
                                                                    <div className="bg-base-200/50 rounded-lg p-2.5">
                                                                        <span className="text-base-content/30 block text-[10px] mb-0.5 font-medium">{t('audit.user')}</span>
                                                                        <span className="text-base-content/70 text-[11px]">{log.user?.name ?? 'System'}</span>
                                                                        <span className="text-base-content/40 text-[10px] block mt-0.5">{log.user?.email ?? '—'}</span>
                                                                    </div>
                                                                    <div className="bg-base-200/50 rounded-lg p-2.5">
                                                                        <span className="text-base-content/30 block text-[10px] mb-0.5 font-medium">{t('audit.action')}</span>
                                                                        <span className={`text-[11px] font-semibold ${c.text} flex items-center gap-1.5`}>
                                                                            <i className={`fas ${meta.icon} text-[9px]`}></i>
                                                                            {meta.label}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-base-200/50 rounded-lg p-2.5">
                                                                        <span className="text-base-content/30 block text-[10px] mb-0.5 font-medium">{t('audit.target')}</span>
                                                                        <span className="text-base-content/70 text-[11px] capitalize flex items-center gap-1.5">
                                                                            <i className="fas fa-tag text-[9px] text-base-content/30"></i>
                                                                            {log.target_type ?? '—'} {log.target_id ? `#${log.target_id}` : ''}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-base-200/50 rounded-lg p-2.5">
                                                                        <span className="text-base-content/30 block text-[10px] mb-0.5 font-medium">{t('audit.ipAddress')}</span>
                                                                        <span className="text-base-content/70 text-[11px] font-mono">{log.ip_address ?? '—'}</span>
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
                                                                        <div className="bg-base-200/50 rounded-lg p-2.5 border border-base-300/20">
                                                                            <div className="flex items-start gap-2">
                                                                                <i className="fas fa-info-circle text-[10px] text-base-content/30 mt-0.5"></i>
                                                                                <p className="text-[11px] text-base-content/60 leading-relaxed">{sentence}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>

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
                                                    ? 'btn-prime bg-primary text-white border-primary shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_30%,transparent)]'
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
