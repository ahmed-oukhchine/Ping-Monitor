import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sparkline from './Sparkline';
import { useLang } from '../contexts/LanguageContext';

function timeAgo(dateStr, t) {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 5)    return t('table.justNow');
    if (diff < 60)   return t('table.secsAgo', { n: diff });
    if (diff < 3600) return t('table.minsAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400)return t('table.hoursAgo', { n: Math.floor(diff / 3600) });
    return t('table.daysAgo', { n: Math.floor(diff / 86400) });
}

function SparklineData({ target }) {
    const [data, setData] = useState(null);
    useEffect(() => {
        let cancelled = false;
        axios.get(`/api/history`, { params: { target_id: target.id, per_page: 15 } })
            .then(res => {
                if (!cancelled) {
                    const items = res.data?.data || [];
                    setData(items.map(p => p.response_time).filter(v => v != null).reverse());
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [target.id]);
    if (!data || data.length < 2) return null;
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    const color = avg < 50 ? 'var(--color-success)' : avg < 150 ? 'var(--color-warning)' : 'var(--color-error)';
    return <Sparkline data={data} width={40} height={16} color={color} />;
}

const TargetTable = React.memo(({ targets, loading, pinging, onPing, onEdit, onDelete, onChart, onDetail, onPause, onResume, isAdmin, paused = false, selectedIds = new Set(), onSelect }) => {
    const { t } = useLang();
    const [, forceRender] = useState(0);
    const allSelected = targets.length > 0 && targets.every(t => selectedIds.has(t.id));
    useEffect(() => { if (paused) return; const id = setInterval(() => forceRender(t => t + 1), 1000); return () => clearInterval(id); }, [paused]);

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        onSelect(next);
    };

    const toggleAll = () => {
        if (allSelected) { onSelect(new Set()); return; }
        const next = new Set(targets.map(t => t.id));
        onSelect(next);
    };

    const headerLabels = ['', t('table.device'), t('table.type'), t('table.location'), t('table.ipAddress'), t('table.status'), t('table.latency'), t('table.avgLatency'), t('table.trend'), t('table.uptime'), t('table.loss'), t('table.lastCheck')];

    if (loading) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full target-table">
                        <thead>
                            <tr className="border-b border-base-300/80 bg-base-300/25">
                                {headerLabels.map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold text-base-content/35 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(6)].map((_, i) => (
                                <tr key={i} className="border-b border-base-300/30" style={{ animationDelay: `${i * 0.06}s` }}>
                                    <td className="py-3.5 px-4"></td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="skeleton-row w-8 h-8 rounded-xl flex-shrink-0" style={{ animationDelay: `${i * 0.06}s` }}></div>
                                            <div className="skeleton-row h-4 w-24 rounded" style={{ animationDelay: `${i * 0.06 + 0.05}s` }}></div>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-3.5 w-20 rounded" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-5 w-24 rounded-md" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-6 w-16 rounded-full" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-3.5 w-12 rounded" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-3.5 w-12 rounded" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-2 w-24 rounded-full" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-3.5 w-8 rounded" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"><div className="skeleton-row h-3.5 w-16 rounded" style={{ animationDelay: `${i * 0.06}s` }}></div></td>
                                    <td className="py-3.5 px-4"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden target-table-wrapper">
                <div className="overflow-x-auto">
                    <table className="table-anim w-full target-table">
                        <thead>
                            <tr className="border-b border-base-300/80 bg-base-300/25">
                                <th className="text-left py-3 px-4 w-10">
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                                        className="checkbox checkbox-sm rounded border-base-content/30 checked:border-primary checked:bg-primary" />
                                </th>
                                {headerLabels.filter((_, i) => i !== 0).map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold text-base-content/35 uppercase tracking-widest whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {targets.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="text-center py-20 text-base-content/30">
                                        <div className="empty-float mb-4">
                                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto opacity-15">
                                                <rect x="12" y="20" width="40" height="30" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                                                <circle cx="32" cy="35" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
                                                <path d="M32 29v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                <path d="M8 8l48 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium">{t('table.noTargets')}</p>
                                        <p className="text-xs mt-1 opacity-60">{t('table.noTargetsHint')}</p>
                                    </td>
                                </tr>
                            ) : targets.map(t => (
                                <TargetRow
                                    key={t.id}
                                    target={t}
                                    isPinging={!!pinging[t.id]}
                                    isAdmin={isAdmin}
                                    selected={selectedIds.has(t.id)}
                                    onToggleSelect={() => toggleSelect(t.id)}
                                    onPing={() => onPing(t)}
                                    onEdit={() => onEdit(t)}
                                    onDelete={() => onDelete(t)}
                                    onChart={() => onChart(t)}
                                    onDetail={() => onDetail(t.id)}
                                    onPause={() => onPause(t)}
                                    onResume={() => onResume(t)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {targets.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-base-content/30 bg-base-200 border border-base-300 rounded-xl">
                        <i className="fas fa-satellite-dish text-3xl block mb-3 opacity-10"></i>
                        <p className="text-sm font-medium">{t('table.noTargets')}</p>
                    </div>
                ) : targets.map(t => (
                    <TargetCard key={t.id} target={t} isPinging={!!pinging[t.id]} isAdmin={isAdmin}
                        selected={selectedIds.has(t.id)} onToggleSelect={() => toggleSelect(t.id)}
                        onPing={() => onPing(t)} onDetail={() => onDetail(t.id)}
                        onEdit={() => onEdit(t)} onDelete={() => onDelete(t)}
                        onChart={() => onChart(t)} onPause={() => onPause(t)} onResume={() => onResume(t)} />
                ))}
            </div>
        </>
    );
});

function TargetRow({ target: t, isPinging, isAdmin, onPing, onEdit, onDelete, onChart, onDetail, onPause, onResume, selected, onToggleSelect }) {
    const deviceIcons = {
        switch: 'fa-network-wired', router: 'fa-route', firewall: 'fa-shield-halved',
        server: 'fa-server', workstation: 'fa-desktop', printer: 'fa-print',
        access_point: 'fa-wifi',
    };

    const { t: tr } = useLang();
    const loss = t.total_pings > 0 ? Math.round(t.failed_pings / t.total_pings * 100) : null;

    const latClass = (ms) => {
        if (ms == null) return 'text-base-content/30';
        if (ms < 50)   return 'text-success font-bold';
        if (ms < 150)  return 'text-warning font-bold';
        return 'text-error font-bold';
    };

    const iconColor = t.is_paused        ? 'text-warning/70'
        : t.last_status === true          ? 'text-success'
        : t.last_status === false         ? 'text-error/80'
        : 'text-base-content/25';

    const iconBg = t.is_paused           ? 'bg-warning/8 border-warning/20'
        : t.last_status === true          ? 'bg-success/8 border-success/20'
        : t.last_status === false         ? 'bg-error/8 border-error/20'
        : 'bg-base-300/60 border-base-300';

    const devIcon = deviceIcons[t.type] || 'fa-server';

    return (
        <tr onClick={e => { if (e.target.type !== 'checkbox') onDetail(); }}
            className={`target-row border-b border-base-300/30 group cursor-pointer ${t.is_paused ? 'paused-row' : ''} ${selected ? 'bg-primary/5' : ''}`}>

            <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected} onChange={onToggleSelect}
                    className="checkbox checkbox-sm rounded border-base-content/30 checked:border-primary checked:bg-primary" />
            </td>

            <td className="py-3.5 px-4">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${iconBg}`}>
                        <i className={`fas ${devIcon} text-[11px] ${iconColor}`}></i>
                    </div>
                    <div className="min-w-0">
                        <span className="block font-semibold text-sm text-base-content leading-tight">{t.name}</span>
                        {t.groups?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {t.groups.map(g => <GroupBadge key={g.id} group={g} />)}
                            </div>
                        )}
                    </div>
                </div>
            </td>

            <td className="py-3.5 px-4">
                {t.type ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary/80 border border-primary/20 whitespace-nowrap">
                        <i className="fas fa-tag text-[8px]"></i>
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1).replace('_', ' ')}
                    </span>
                ) : (
                    <span className="text-base-content/20 text-xs">—</span>
                )}
            </td>

            <td className="py-3.5 px-4">
                <div className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <i className="fas fa-map-marker-alt text-base-content/25 text-[10px] flex-shrink-0"></i>
                    <span className="truncate max-w-32">{t.location || <span className="text-base-content/20">—</span>}</span>
                </div>
            </td>

            <td className="py-3.5 px-4">
                <code className="ip-code">{t.ip_address}</code>
            </td>

            <td className="py-3.5 px-4">
                {isPinging
                    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 whitespace-nowrap shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_25%,transparent)]">
                        <i className="fas fa-spinner fa-spin text-[10px]"></i>
                        {tr('table.checking')}
                      </span>
                    : <StatusBadge status={t.last_status} isPaused={t.is_paused} />
                }
            </td>

            <td className="py-3.5 px-4">
                <div className="flex items-center gap-1.5">
                    <span className={`mono text-xs tabular-nums ${latClass(t.last_response_time)}`}>
                        {t.last_response_time != null ? `${t.last_response_time} ms` : <span className="text-base-content/25 font-normal">—</span>}
                    </span>
                    {t.threshold_status === 'critical' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none bg-error/15 text-error border border-error/30">{tr('table.crit')}</span>
                    )}
                    {t.threshold_status === 'warn' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none bg-warning/15 text-warning border border-warning/30">{tr('table.warn')}</span>
                    )}
                </div>
            </td>

            <td className="py-3.5 px-4">
                <span className="mono text-xs text-base-content/45 tabular-nums">
                    {t.avg_response_time != null ? `${t.avg_response_time} ms` : <span className="text-base-content/20">—</span>}
                </span>
            </td>

            <td className="py-3.5 px-4">
                <SparklineData target={t} />
            </td>

            <td className="py-3.5 px-4 min-w-36">
                {t.uptime_percent != null
                    ? <UptimePct pct={t.uptime_percent} />
                    : <span className="text-base-content/20 text-xs">—</span>}
            </td>

            <td className="py-3.5 px-4">
                {loss != null
                    ? <span className={`mono text-xs tabular-nums ${loss === 0 ? 'text-success font-bold' : loss <= 25 ? 'text-warning font-bold' : 'text-error font-bold'}`}>{loss}%</span>
                    : <span className="text-base-content/20 text-xs">—</span>}
            </td>

            <td className="py-3.5 px-4">
                <span className="mono text-xs text-base-content/35 tabular-nums">
                    {t.last_ping_at ? timeAgo(t.last_ping_at, tr) : <span className="text-base-content/20">{tr('table.never')}</span>}
                </span>
            </td>

        </tr>
    );
}

function StatusBadge({ status, isPaused }) {
    const { t } = useLang();
    if (isPaused) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning/10 text-warning/90 border border-warning/20 whitespace-nowrap">
            <i className="fas fa-pause text-[8px]"></i>
            {t('table.maintenance')}
        </span>
    );
    if (status === true) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/20 whitespace-nowrap">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            {t('table.online')}
        </span>
    );
    if (status === false) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-error/10 text-error border border-error/20 whitespace-nowrap offline-pulse">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-error"></span>
            </span>
            {t('table.offline')}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-base-300/60 text-base-content/35 border border-base-300 whitespace-nowrap">
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-base-content/20 flex-shrink-0"></span>
            {t('table.unknown')}
        </span>
    );
}

function UptimePct({ pct }) {
    const barCls  = pct >= 99 ? 'bg-success uptime-glow-success' : pct >= 90 ? 'bg-warning' : 'bg-error';
    const textCls = pct >= 99 ? 'text-success' : pct >= 90 ? 'text-warning' : 'text-error';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-base-300/60 rounded-full h-1 overflow-hidden min-w-16">
                <div className={`h-full ${barCls} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
            </div>
            <span className={`mono text-[11px] font-bold tabular-nums ${textCls} w-9 text-right flex-shrink-0`}>{pct}%</span>
        </div>
    );
}

function GroupBadge({ group }) {
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold border"
            style={{
                backgroundColor: `${group.color}18`,
                color: group.color,
                borderColor: `${group.color}35`,
            }}
        >
            {group.name}
        </span>
    );
}

function TargetCard({ target: t, isPinging, isAdmin, onPing, onDetail, onEdit, onDelete, onChart, onPause, onResume, selected, onToggleSelect }) {
    const deviceIcons = {
        switch: 'fa-network-wired', router: 'fa-route', firewall: 'fa-shield-halved',
        server: 'fa-server', workstation: 'fa-desktop', printer: 'fa-print',
        access_point: 'fa-wifi',
    };
    const { t: tc } = useLang();
    const loss = t.total_pings > 0 ? Math.round(t.failed_pings / t.total_pings * 100) : null;
    const statusColor = t.is_paused ? 'text-warning' : t.last_status === true ? 'text-success' : t.last_status === false ? 'text-error' : 'text-base-content/30';
    const statusLabel = t.is_paused ? tc('table.maintenance') : t.last_status === true ? tc('table.online') : t.last_status === false ? tc('table.offline') : tc('table.unknown');
    const devIcon = deviceIcons[t.type] || 'fa-server';
    return (
        <div onClick={e => { if (e.target.type !== 'checkbox') onDetail(); }} className={`target-card cursor-pointer bg-base-200 border border-base-300 rounded-xl p-4 ${selected ? 'ring-1 ring-primary/30' : ''}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" checked={selected} onChange={onToggleSelect}
                        className="checkbox checkbox-sm rounded border-base-content/30 checked:border-primary checked:bg-primary flex-shrink-0"
                        onClick={e => e.stopPropagation()} />
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        t.is_paused ? 'bg-warning/8 border-warning/20 text-warning' :
                        t.last_status === true ? 'bg-success/8 border-success/20 text-success' :
                        t.last_status === false ? 'bg-error/8 border-error/20 text-error offline-pulse' :
                        'bg-base-300/60 border-base-300 text-base-content/30'
                    }`}>
                        <i className={`fas ${devIcon} text-[11px]`}></i>
                    </div>
                    <div className="min-w-0">
                        <span className="block font-semibold text-sm text-base-content leading-tight truncate">{t.name}</span>
                        <code className="text-[10px] text-primary/70 font-mono">{t.ip_address}</code>
                    </div>
                </div>
                <span className={`text-[10px] font-bold ${statusColor} flex items-center gap-1 flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${t.last_status === false ? 'animate-ping' : ''}`}
                        style={{ backgroundColor: 'currentColor' }}></span>
                    {statusLabel}
                </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-base-content/40 mb-3">
                {t.location && <span><i className="fas fa-map-marker-alt text-[9px] mr-1"></i>{t.location}</span>}
                {t.last_response_time != null && <span className="tabular-nums">{t.last_response_time} ms</span>}
                {t.uptime_percent != null && <span className={`tabular-nums font-semibold ${t.uptime_percent >= 99 ? 'text-success' : t.uptime_percent >= 90 ? 'text-warning' : 'text-error'}`}>{t.uptime_percent}% uptime</span>}
                {loss != null && <span className={`tabular-nums ${loss === 0 ? 'text-success' : 'text-error'}`}>{loss}% loss</span>}
            </div>
            <div className="flex items-center gap-1 border-t border-base-300/50 pt-2" onClick={e => e.stopPropagation()}>
                <ActionBtn onClick={onPing} disabled={isPinging} title={tc('table.ping')} cls="text-primary hover:bg-primary/15" icon="fa-satellite-dish" />
                <ActionBtn onClick={onChart} title={tc('table.chart')} cls="text-warning/70 hover:bg-warning/12 hover:text-warning" icon="fa-chart-line" />
                {isAdmin && (t.is_paused
                    ? <ActionBtn onClick={onResume} title={tc('table.resume')} cls="text-success hover:bg-success/12" icon="fa-play" />
                    : <ActionBtn onClick={onPause} title={tc('table.maintenance')} cls="text-base-content/35 hover:bg-warning/12 hover:text-warning" icon="fa-pause" />
                )}
                {isAdmin && <ActionBtn onClick={onEdit} title={tc('table.edit')} cls="text-base-content/35 hover:bg-base-300 hover:text-base-content" icon="fa-pen" />}
                {isAdmin && <ActionBtn onClick={onDelete} title={tc('table.delete')} cls="text-base-content/35 hover:bg-error/12 hover:text-error" icon="fa-trash" />}
            </div>
        </div>
    );
}

function ActionBtn({ onClick, disabled, title, cls, icon }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed ${cls}`}
        >
            <i className={`fas ${icon} text-[11px]`}></i>
        </button>
    );
}

export default TargetTable;
