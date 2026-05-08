import React from 'react';

export default function TargetTable({ targets, loading, pinging, onPing, onEdit, onDelete, onChart }) {
    if (loading) {
        return (
            <div className="bg-base-200 border border-base-300 rounded-xl flex items-center justify-center py-16 text-base-content/30">
                <div className="text-center">
                    <span className="loading loading-spinner loading-lg block mx-auto mb-3"></span>
                    <p className="text-sm">Loading targets…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-base-300 bg-base-300/50">
                            {['Device', 'IP Address', 'Status', 'Latency', 'Avg Latency', 'Uptime', 'Loss %', 'Last Check', 'Actions'].map(h => (
                                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-base-content/50 uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {targets.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-16 text-base-content/30">
                                    <i className="fas fa-radar text-4xl block mb-3 opacity-20"></i>
                                    <p className="text-sm">No targets yet — add one above</p>
                                </td>
                            </tr>
                        ) : targets.map(t => (
                            <TargetRow
                                key={t.id}
                                target={t}
                                isPinging={!!pinging[t.id]}
                                onPing={() => onPing(t)}
                                onEdit={() => onEdit(t)}
                                onDelete={() => onDelete(t)}
                                onChart={() => onChart(t)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TargetRow({ target: t, isPinging, onPing, onEdit, onDelete, onChart }) {
    const loss = t.total_pings > 0 ? Math.round(t.failed_pings / t.total_pings * 100) : null;

    const latClass = (ms) => {
        if (ms == null) return 'text-base-content/30';
        if (ms < 50)   return 'lat-fast';
        if (ms < 150)  return 'lat-medium';
        return 'lat-slow';
    };

    return (
        <tr className="border-b border-base-300/40 hover:bg-base-300/30 transition-colors duration-100 group">
            <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-server text-primary text-[11px]"></i>
                    </div>
                    <span className="font-semibold text-sm text-base-content">{t.name}</span>
                </div>
            </td>
            <td className="py-3 px-4">
                <code className="ip-code">{t.ip_address}</code>
            </td>
            <td className="py-3 px-4">
                <StatusIndicator status={t.last_status} />
            </td>
            <td className="py-3 px-4">
                <span className={`mono text-xs font-semibold tabular-nums ${latClass(t.last_response_time)}`}>
                    {t.last_response_time != null ? `${t.last_response_time} ms` : '—'}
                </span>
            </td>
            <td className="py-3 px-4">
                <span className="mono text-xs text-base-content/50 tabular-nums">
                    {t.avg_response_time != null ? `${t.avg_response_time} ms` : '—'}
                </span>
            </td>
            <td className="py-3 px-4 min-w-36">
                {t.uptime_percent != null
                    ? <UptimePct pct={t.uptime_percent} />
                    : <span className="text-base-content/30 text-xs">—</span>}
            </td>
            <td className="py-3 px-4">
                {loss != null
                    ? <span className={`mono text-xs font-bold tabular-nums ${loss === 0 ? 'lat-fast' : loss <= 25 ? 'lat-medium' : 'lat-slow'}`}>{loss}%</span>
                    : <span className="text-base-content/30 text-xs">—</span>}
            </td>
            <td className="py-3 px-4">
                <span className="mono text-xs text-base-content/40 tabular-nums">
                    {t.last_ping_at ? new Date(t.last_ping_at).toLocaleTimeString() : 'Never'}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                    <ActionBtn onClick={onPing} disabled={isPinging} title="Ping"
                        cls="text-primary hover:bg-primary/10"
                        icon={isPinging ? 'fa-spinner fa-spin' : 'fa-satellite-dish'}
                        label={isPinging ? 'Pinging…' : 'Ping'} />
                    <ActionBtn onClick={onChart} title="Chart"
                        cls="text-warning hover:bg-warning/10"
                        icon="fa-chart-line" label="Chart" />
                    <ActionBtn onClick={onEdit} title="Edit"
                        cls="text-base-content/50 hover:text-base-content hover:bg-base-300"
                        icon="fa-pen" label="Edit" />
                    <ActionBtn onClick={onDelete} title="Delete"
                        cls="text-error hover:bg-error/10"
                        icon="fa-trash" label="Delete" />
                </div>
            </td>
        </tr>
    );
}

function StatusIndicator({ status }) {
    if (status === true) return (
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-success text-xs font-semibold">Online</span>
        </div>
    );
    if (status === false) return (
        <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-error"></span>
            <span className="text-error text-xs font-semibold">Offline</span>
        </div>
    );
    return (
        <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-base-content/20"></span>
            <span className="text-base-content/40 text-xs font-semibold">Unknown</span>
        </div>
    );
}

function UptimePct({ pct }) {
    const bar  = pct >= 99 ? 'bg-success' : pct >= 90 ? 'bg-warning' : 'bg-error';
    const text = pct >= 99 ? 'lat-fast'  : pct >= 90 ? 'lat-medium' : 'lat-slow';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-base-300 rounded-full h-1 overflow-hidden">
                <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
            </div>
            <span className={`mono text-[11px] font-bold tabular-nums ${text} w-9 text-right`}>{pct}%</span>
        </div>
    );
}

function ActionBtn({ onClick, disabled, title, cls, icon, label }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
        >
            <i className={`fas ${icon} text-[10px]`}></i>
            <span>{label}</span>
        </button>
    );
}
