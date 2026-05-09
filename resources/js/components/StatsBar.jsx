import React from 'react';

export default function StatsBar({ stats }) {
    const uptimeSub = stats.fleetUptime != null ? `${stats.fleetUptime}% fleet uptime` : null;
    const offlineAlert = stats.offline > 0;

    const cards = [
        {
            label: 'Total Targets',
            value: stats.total ?? 0,
            valueCls: 'text-base-content',
            sub: stats.paused > 0 ? `${stats.paused} in maintenance` : 'All monitored',
            subCls: stats.paused > 0 ? 'text-warning/70' : 'text-base-content/30',
            subIcon: stats.paused > 0 ? 'fa-pause' : null,
            icon: 'fa-server', iconBg: 'bg-primary/10', iconColor: 'text-primary', border: 'border-t-primary/60',
        },
        {
            label: 'Online',
            value: stats.online ?? 0,
            valueCls: 'text-success',
            sub: uptimeSub,
            subCls: 'text-base-content/30',
            subIcon: null,
            icon: 'fa-check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', border: 'border-t-success/60',
        },
        {
            label: 'Offline',
            value: stats.offline ?? 0,
            valueCls: offlineAlert ? 'text-error' : 'text-base-content/40',
            sub: offlineAlert ? 'Requires attention' : 'All clear',
            subCls: offlineAlert ? 'text-error/60' : 'text-base-content/25',
            subIcon: offlineAlert ? 'fa-exclamation-circle' : null,
            icon: 'fa-times-circle',
            iconBg: offlineAlert ? 'bg-error/10' : 'bg-base-300/60',
            iconColor: offlineAlert ? 'text-error' : 'text-base-content/25',
            border: offlineAlert ? 'border-t-error/60' : 'border-t-base-300',
        },
        {
            label: 'Avg Latency',
            value: stats.avgLatency != null ? `${stats.avgLatency} ms` : '—',
            valueCls: stats.avgLatency == null ? 'text-base-content/30'
                : stats.avgLatency < 50  ? 'text-success'
                : stats.avgLatency < 150 ? 'text-warning'
                : 'text-error',
            sub: stats.avgLatency == null ? 'No data yet'
                : stats.avgLatency < 50  ? 'Fast'
                : stats.avgLatency < 150 ? 'Moderate'
                : 'Slow — check targets',
            subCls: stats.avgLatency == null ? 'text-base-content/25'
                : stats.avgLatency < 50  ? 'text-success/60'
                : stats.avgLatency < 150 ? 'text-warning/60'
                : 'text-error/60',
            subIcon: null,
            icon: 'fa-tachometer-alt', iconBg: 'bg-warning/10', iconColor: 'text-warning', border: 'border-t-warning/60',
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-3 mb-4">
            {cards.map((c, i) => (
                <div key={c.label} className={`stat-card anim-fade-up anim-delay-${i + 1} bg-base-200 border border-base-300 border-t-2 ${c.border} rounded-xl p-4 flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`fas ${c.icon} ${c.iconColor} text-lg`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`text-2xl font-bold tabular-nums mono leading-none ${c.valueCls}`}>{c.value}</div>
                        <div className="text-xs text-base-content/45 mt-0.5 font-medium leading-tight">{c.label}</div>
                        {c.sub && (
                            <div className={`text-[10px] mt-0.5 font-medium flex items-center gap-1 leading-tight ${c.subCls}`}>
                                {c.subIcon && <i className={`fas ${c.subIcon} text-[8px]`}></i>}
                                {c.sub}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
