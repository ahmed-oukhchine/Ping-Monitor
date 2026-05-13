import React from 'react';

export default function TargetTable({ targets, loading, pinging, onPing, onEdit, onDelete, onChart, onDetail, onPause, onResume, isAdmin }) {
    if (loading) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-base-300/80 bg-base-300/25">
                                {['Device', 'Location', 'IP Address', 'Status', 'Latency', 'Avg Latency', 'Uptime', 'Loss %', 'Last Check', 'Actions'].map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold text-base-content/35 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(6)].map((_, i) => (
                                <tr key={i} className="border-b border-base-300/30" style={{ animationDelay: `${i * 0.06}s` }}>
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
        <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="table-anim w-full">
                    <thead>
                        <tr className="border-b border-base-300/80 bg-base-300/25">
                            {['Device', 'Location', 'IP Address', 'Status', 'Latency', 'Avg Latency', 'Uptime', 'Loss %', 'Last Check', 'Actions'].map(h => (
                                <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold text-base-content/35 uppercase tracking-widest whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {targets.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-24 text-base-content/30">
                                    <i className="fas fa-satellite-dish text-4xl block mb-4 opacity-10"></i>
                                    <p className="text-sm font-medium">No targets yet — add one above</p>
                                </td>
                            </tr>
                        ) : targets.map(t => (
                            <TargetRow
                                key={t.id}
                                target={t}
                                isPinging={!!pinging[t.id]}
                                isAdmin={isAdmin}
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
    );
}

function TargetRow({ target: t, isPinging, isAdmin, onPing, onEdit, onDelete, onChart, onDetail, onPause, onResume }) {
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

    return (
        <tr onClick={onDetail}
            className={`target-row border-b border-base-300/30 group cursor-pointer ${t.is_paused ? 'paused-row' : ''}`}>

            {/* Device */}
            <td className="py-3.5 px-4">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${iconBg}`}>
                        <i className={`fas fa-server text-[11px] ${iconColor}`}></i>
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

            {/* Location */}
            <td className="py-3.5 px-4">
                <div className="flex items-center gap-1.5 text-xs text-base-content/50">
                    <i className="fas fa-map-marker-alt text-base-content/25 text-[10px] flex-shrink-0"></i>
                    <span className="truncate max-w-32">{t.location || <span className="text-base-content/20">—</span>}</span>
                </div>
            </td>

            {/* IP */}
            <td className="py-3.5 px-4">
                <code className="ip-code">{t.ip_address}</code>
            </td>

            {/* Status */}
            <td className="py-3.5 px-4">
                {isPinging
                    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-base-300/60 text-base-content/35 border border-base-300 whitespace-nowrap">
                        <i className="fas fa-spinner fa-spin text-[10px]"></i>
                        Checking…
                      </span>
                    : <StatusBadge status={t.last_status} isPaused={t.is_paused} />
                }
            </td>

            {/* Last latency */}
            <td className="py-3.5 px-4">
                <div className="flex items-center gap-1.5">
                    <span className={`mono text-xs tabular-nums ${latClass(t.last_response_time)}`}>
                        {t.last_response_time != null ? `${t.last_response_time} ms` : <span className="text-base-content/25 font-normal">—</span>}
                    </span>
                    {t.threshold_status === 'critical' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none bg-error/15 text-error border border-error/30">CRIT</span>
                    )}
                    {t.threshold_status === 'warn' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none bg-warning/15 text-warning border border-warning/30">WARN</span>
                    )}
                </div>
            </td>

            {/* Avg latency */}
            <td className="py-3.5 px-4">
                <span className="mono text-xs text-base-content/45 tabular-nums">
                    {t.avg_response_time != null ? `${t.avg_response_time} ms` : <span className="text-base-content/20">—</span>}
                </span>
            </td>

            {/* Uptime bar */}
            <td className="py-3.5 px-4 min-w-36">
                {t.uptime_percent != null
                    ? <UptimePct pct={t.uptime_percent} />
                    : <span className="text-base-content/20 text-xs">—</span>}
            </td>

            {/* Loss */}
            <td className="py-3.5 px-4">
                {loss != null
                    ? <span className={`mono text-xs tabular-nums ${loss === 0 ? 'text-success font-bold' : loss <= 25 ? 'text-warning font-bold' : 'text-error font-bold'}`}>{loss}%</span>
                    : <span className="text-base-content/20 text-xs">—</span>}
            </td>

            {/* Last check */}
            <td className="py-3.5 px-4">
                <span className="mono text-xs text-base-content/35 tabular-nums">
                    {t.last_ping_at ? new Date(t.last_ping_at).toLocaleTimeString() : <span className="text-base-content/20">Never</span>}
                </span>
            </td>

            {/* Actions */}
            <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <ActionBtn onClick={onPing} disabled={isPinging}
                        title={isPinging ? 'Pinging…' : 'Ping now'}
                        cls="text-primary hover:bg-primary/15"
                        icon="fa-satellite-dish" />
                    <ActionBtn onClick={onChart} title="Latency chart"
                        cls="text-warning/70 hover:bg-warning/12 hover:text-warning"
                        icon="fa-chart-line" />
                    {isAdmin && (t.is_paused
                        ? <ActionBtn onClick={onResume} title="Resume monitoring"
                            cls="text-success hover:bg-success/12"
                            icon="fa-play" />
                        : <ActionBtn onClick={onPause} title="Set maintenance"
                            cls="text-base-content/35 hover:bg-warning/12 hover:text-warning"
                            icon="fa-pause" />
                    )}
                    {isAdmin && (
                        <ActionBtn onClick={onEdit} title="Edit target"
                            cls="text-base-content/35 hover:bg-base-300 hover:text-base-content"
                            icon="fa-pen" />
                    )}
                    {isAdmin && (
                        <ActionBtn onClick={onDelete} title="Delete target"
                            cls="text-base-content/35 hover:bg-error/12 hover:text-error"
                            icon="fa-trash" />
                    )}
                </div>
            </td>
        </tr>
    );
}

function StatusBadge({ status, isPaused }) {
    if (isPaused) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning/10 text-warning/90 border border-warning/20 whitespace-nowrap">
            <i className="fas fa-pause text-[8px]"></i>
            Maintenance
        </span>
    );
    if (status === true) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/20 whitespace-nowrap">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            Online
        </span>
    );
    if (status === false) return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-error/10 text-error border border-error/20 whitespace-nowrap">
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-error flex-shrink-0"></span>
            Offline
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-base-300/60 text-base-content/35 border border-base-300 whitespace-nowrap">
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-base-content/20 flex-shrink-0"></span>
            Unknown
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
