import React from 'react';

export default function StatsBar({ stats }) {
    const cards = [
        { label: 'Total Targets', value: stats.total ?? 0,   icon: 'fa-server',       iconBg: 'bg-primary/10', iconColor: 'text-primary', border: 'border-t-primary/60' },
        { label: 'Online',        value: stats.online ?? 0,  icon: 'fa-check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', border: 'border-t-success/60' },
        { label: 'Offline',       value: stats.offline ?? 0, icon: 'fa-times-circle', iconBg: 'bg-error/10',   iconColor: 'text-error',   border: 'border-t-error/60'   },
        {
            label: 'Avg Latency',
            value: stats.avgLatency != null ? `${stats.avgLatency} ms` : '—',
            icon: 'fa-tachometer-alt',
            iconBg: 'bg-warning/10', iconColor: 'text-warning', border: 'border-t-warning/60',
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-3 mb-5">
            {cards.map(c => (
                <div key={c.label} className={`relative bg-base-200 border border-base-300 border-t-2 ${c.border} rounded-xl p-4 flex items-center gap-4`}>
                    <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`fas ${c.icon} ${c.iconColor} text-xl`}></i>
                    </div>
                    <div className="min-w-0">
                        <div className="text-2xl font-bold text-base-content tabular-nums leading-none">{c.value}</div>
                        <div className="text-xs text-base-content/50 mt-1 font-medium">{c.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
