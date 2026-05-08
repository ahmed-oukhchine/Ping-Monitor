import React from 'react';

export default function StatsBar({ stats }) {
    const cards = [
        { label: 'Total Targets', value: stats.total,   icon: 'fa-server',         color: '#58a6ff' },
        { label: 'Online',        value: stats.online,  icon: 'fa-check-circle',   color: '#3fb950' },
        { label: 'Offline',       value: stats.offline, icon: 'fa-times-circle',   color: '#f85149' },
        {
            label: 'Avg Latency',
            value: stats.avgLatency != null ? `${stats.avgLatency}ms` : '—',
            icon: 'fa-tachometer-alt',
            color: '#d29922',
        },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {cards.map(c => (
                <div key={c.label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: `${c.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <i className={`fas ${c.icon}`} style={{ color: c.color, fontSize: 16 }}></i>
                    </div>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{c.value ?? 0}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>{c.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
