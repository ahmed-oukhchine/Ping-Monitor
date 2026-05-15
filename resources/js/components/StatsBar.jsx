import React from 'react';

function MiniRing({ pct, color, size = 36 }) {
    const r = 14;
    const circ = 2 * Math.PI * r;
    const dash = circ * (Math.min(pct, 100) / 100);
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="stat-ring flex-shrink-0">
            <circle cx="16" cy="16" r={r} className="stat-ring-bg" />
            <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
    );
}

export default function StatsBar({ stats }) {
    const uptime = stats.fleetUptime != null ? parseFloat(stats.fleetUptime) : null;

    const cards = [
        {
            label: 'Total Targets', value: stats.total ?? 0, ring: null,
            icon: 'fa-server', grad: 'grad-blue',
            sub: stats.paused > 0 ? `${stats.paused} in maintenance` : 'All monitored',
            subCls: stats.paused > 0 ? 'text-warning/70' : 'text-success/60',
        },
        {
            label: 'Online', value: stats.online ?? 0,
            ring: <MiniRing pct={stats.total > 0 ? (stats.online / Math.max(1, stats.total - stats.paused)) * 100 : 0} color="var(--color-success)" />,
            icon: 'fa-check-circle', grad: 'grad-green',
            sub: uptime != null ? `${uptime}% fleet uptime` : 'No data',
            subCls: uptime != null && uptime >= 99 ? 'text-success/60' : uptime != null && uptime >= 90 ? 'text-warning/60' : 'text-error/60',
        },
        {
            label: 'Offline', value: stats.offline ?? 0,
            ring: stats.offline > 0 ? <MiniRing pct={stats.total > 0 ? (stats.offline / Math.max(1, stats.total - stats.paused)) * 100 : 0} color="var(--color-error)" /> : null,
            icon: 'fa-times-circle', grad: 'grad-red',
            sub: stats.offline > 0 ? 'Requires attention' : 'All clear',
            subCls: stats.offline > 0 ? 'text-error/60' : 'text-base-content/25',
        },
        {
            label: 'Avg Latency', value: stats.avgLatency != null ? `${stats.avgLatency} ms` : '—',
            ring: null,
            icon: 'fa-tachometer-alt', grad: 'grad-amber',
            sub: stats.avgLatency == null ? 'No data yet'
                : stats.avgLatency < 50 ? 'Fast' : stats.avgLatency < 150 ? 'Moderate' : 'Slow',
            subCls: stats.avgLatency == null ? 'text-base-content/25'
                : stats.avgLatency < 50 ? 'text-success/60' : stats.avgLatency < 150 ? 'text-warning/60' : 'text-error/60',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {cards.map((c, i) => (
                <div key={c.label}
                    className={`stat-card-new anim-fade-up anim-delay-${i + 1} bg-base-200 border border-base-300 rounded-xl p-4 flex items-center gap-3`}>
                    <div className={`stat-icon-wrap ${c.grad}`}>
                        <i className={`fas ${c.icon} text-base ${c.label === 'Total Targets' ? 'text-blue-400' : c.label === 'Online' ? 'text-green-400' : c.label === 'Offline' ? 'text-red-400' : 'text-amber-400'}`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="card-value text-2xl tabular-nums mono leading-none"
                                style={{ color: c.label === 'Offline' && stats.offline > 0 ? 'var(--color-error)' : c.label === 'Online' ? 'var(--color-success)' : c.label === 'Avg Latency' && stats.avgLatency != null ? stats.avgLatency < 50 ? 'var(--color-success)' : stats.avgLatency < 150 ? 'var(--color-warning)' : 'var(--color-error)' : '' }}>
                                {c.value}
                            </div>
                            {c.ring}
                        </div>
                        <div className="text-xs text-base-content/45 mt-0.5 font-medium leading-tight">
                            <span className="section-title inline">{c.label}</span>
                        </div>
                        {c.sub && (
                            <div className={`text-[10px] mt-0.5 font-medium leading-tight ${c.subCls}`}>{c.sub}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
