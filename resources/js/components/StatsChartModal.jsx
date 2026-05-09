import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

export default function StatsChartModal({ targets, onClose }) {
    const [isDark, setIsDark] = useState(
        () => (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light'
    );
    const [activeTab, setActiveTab] = useState('latency');

    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDark((document.documentElement.getAttribute('data-theme') || 'dark') !== 'light')
        );
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const C = isDark ? {
        tick: '#c9cdd6', grid: 'rgba(255,255,255,0.06)', axis: 'rgba(255,255,255,0.12)', bg: 'rgba(0,0,0,0.18)',
    } : {
        tick: '#374151', grid: 'rgba(0,0,0,0.07)',       axis: 'rgba(0,0,0,0.15)',       bg: 'rgba(0,0,0,0.02)',
    };

    const shorten = (name) => name.length > 16 ? name.slice(0, 14) + '…' : name;
    const latColor = (ms)  => ms  < 50  ? '#22c55e' : ms  < 150 ? '#f59e0b' : '#ef4444';
    const pctColor = (pct) => pct >= 99 ? '#22c55e' : pct >= 90 ? '#f59e0b' : '#ef4444';

    // ── Counts ──────────────────────────────────────────────────────────────
    const online      = targets.filter(t => !t.is_paused && t.last_status === true).length;
    const offline     = targets.filter(t => !t.is_paused && t.last_status === false).length;
    const maintenance = targets.filter(t =>  t.is_paused).length;
    const unknown     = targets.filter(t => !t.is_paused && t.last_status == null).length;

    const pieData = [
        { name: 'Online',      value: online,      color: '#22c55e' },
        { name: 'Offline',     value: offline,      color: '#ef4444' },
        { name: 'Maintenance', value: maintenance,  color: '#f59e0b' },
        { name: 'Unknown',     value: unknown,      color: '#6b7280' },
    ].filter(d => d.value > 0);

    // ── Fleet averages ───────────────────────────────────────────────────────
    const withLatency = targets.filter(t => t.avg_response_time != null);
    const globalLatency = withLatency.length
        ? (withLatency.reduce((s, t) => s + t.avg_response_time, 0) / withLatency.length).toFixed(1)
        : null;

    const withUptime = targets.filter(t => t.uptime_percent != null);
    const globalUptime = withUptime.length
        ? (withUptime.reduce((s, t) => s + t.uptime_percent, 0) / withUptime.length).toFixed(1)
        : null;

    // ── Per-target datasets ──────────────────────────────────────────────────
    const byLatency = [...targets]
        .filter(t => t.avg_response_time != null)
        .sort((a, b) => b.avg_response_time - a.avg_response_time)
        .slice(0, 12)
        .map(t => ({ name: shorten(t.name), value: t.avg_response_time, color: latColor(t.avg_response_time) }));

    const byUptime = [...targets]
        .filter(t => t.uptime_percent != null)
        .sort((a, b) => a.uptime_percent - b.uptime_percent)
        .slice(0, 12)
        .map(t => ({ name: shorten(t.name), value: t.uptime_percent, color: pctColor(t.uptime_percent) }));

    const byLoss = [...targets]
        .filter(t => t.total_pings > 0)
        .map(t => {
            const loss = Math.round(t.failed_pings / t.total_pings * 100);
            return { name: shorten(t.name), value: loss, color: loss === 0 ? '#22c55e' : loss <= 25 ? '#f59e0b' : '#ef4444' };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);

    const tabs = [
        { id: 'latency', label: 'Avg Latency', data: byLatency, unit: 'ms' },
        { id: 'uptime',  label: 'Uptime %',    data: byUptime,  unit: '%'  },
        { id: 'loss',    label: 'Packet Loss',  data: byLoss,    unit: '%'  },
    ];
    const tab = tabs.find(t => t.id === activeTab);

    // ── Tooltips ─────────────────────────────────────────────────────────────
    const PieTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2 text-xs shadow-xl">
                <span style={{ color: payload[0].payload.color }} className="font-bold">{payload[0].name}</span>
                <span className="text-base-content/60 ml-2">{payload[0].value} device{payload[0].value !== 1 ? 's' : ''}</span>
            </div>
        );
    };

    const BarTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2 text-xs shadow-xl">
                <div className="text-base-content/60 mb-1">{payload[0].payload.name}</div>
                <div className="font-bold" style={{ color: payload[0].payload.color }}>
                    {payload[0].value} {tab.unit}
                </div>
            </div>
        );
    };

    const uptimeCls = globalUptime == null ? 'text-base-content/30'
        : parseFloat(globalUptime) >= 99 ? 'text-success'
        : parseFloat(globalUptime) >= 90 ? 'text-warning'
        : 'text-error';

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="modal-enter bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
                style={{ maxHeight: '88vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ───────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <i className="fas fa-chart-pie text-primary text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Network Statistics</h3>
                            <p className="text-[11px] text-base-content/40 mt-0.5">{targets.length} device{targets.length !== 1 ? 's' : ''} monitored</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {/* ── Summary cards ────────────────────────────────── */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Total Devices', value: targets.length,   cls: 'text-base-content',  icon: 'fa-server',       bg: 'bg-primary/10',  ic: 'text-primary'  },
                            { label: 'Online',         value: online,           cls: 'text-success',        icon: 'fa-check-circle', bg: 'bg-success/10',  ic: 'text-success'  },
                            { label: 'Offline',        value: offline,          cls: 'text-error',          icon: 'fa-times-circle', bg: 'bg-error/10',    ic: 'text-error'    },
                            { label: 'Avg Uptime',     value: globalUptime ? `${globalUptime}%` : '—', cls: uptimeCls, icon: 'fa-arrow-up', bg: 'bg-success/10', ic: 'text-success' },
                        ].map(c => (
                            <div key={c.label} className="bg-base-300/50 border border-base-content/8 rounded-xl p-3 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                    <i className={`fas ${c.icon} ${c.ic} text-sm`}></i>
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-lg font-bold tabular-nums mono leading-none ${c.cls}`}>{c.value}</div>
                                    <div className="text-[10px] text-base-content/40 mt-0.5 font-medium truncate">{c.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Donut + Fleet health ─────────────────────────── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-base-300/30 border border-base-300 rounded-xl p-4">
                            <h4 className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider mb-3">Status Distribution</h4>
                            {pieData.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-base-content/30 text-sm">No data yet</div>
                            ) : (
                                <div className="flex items-center gap-5">
                                    <ResponsiveContainer width={120} height={120}>
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={54} paddingAngle={3} dataKey="value">
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col gap-2.5">
                                        {pieData.map(d => (
                                            <div key={d.name} className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                                                <span className="text-xs text-base-content/55">{d.name}</span>
                                                <span className="text-xs font-bold mono tabular-nums ml-2" style={{ color: d.color }}>{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-base-300/30 border border-base-300 rounded-xl p-4">
                            <h4 className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider mb-3">Fleet Health</h4>
                            <div className="space-y-3">
                                {[
                                    { label: 'Avg Latency (all devices)', value: globalLatency ? `${globalLatency} ms` : '—', cls: 'text-primary' },
                                    { label: 'Avg Uptime (all devices)',  value: globalUptime  ? `${globalUptime}%`   : '—', cls: uptimeCls      },
                                    { label: 'In Maintenance',            value: maintenance,                               cls: maintenance > 0 ? 'text-warning'         : 'text-base-content/35' },
                                    { label: 'Unknown Status',            value: unknown,                                   cls: unknown     > 0 ? 'text-base-content/60' : 'text-base-content/35' },
                                ].map(m => (
                                    <div key={m.label} className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-base-content/45 truncate">{m.label}</span>
                                        <span className={`text-sm font-bold mono tabular-nums flex-shrink-0 ${m.cls}`}>{m.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Per-device bar charts ─────────────────────────── */}
                    <div className="bg-base-300/30 border border-base-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">Per-Device Breakdown</h4>
                            <div className="flex items-center gap-0.5 bg-base-300 rounded-lg p-0.5">
                                {tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id)}
                                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                            activeTab === t.id
                                                ? 'bg-base-200 text-base-content shadow-sm'
                                                : 'text-base-content/45 hover:text-base-content'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab.data.length === 0 ? (
                            <div className="flex items-center justify-center h-36 text-base-content/30 text-sm">No data yet</div>
                        ) : (
                            <div className="rounded-xl overflow-hidden py-3 px-1" style={{ background: C.bg }}>
                                <ResponsiveContainer width="100%" height={Math.max(160, tab.data.length * 34)}>
                                    <BarChart data={tab.data} layout="vertical" margin={{ top: 2, right: 55, left: 4, bottom: 2 }}>
                                        <CartesianGrid strokeDasharray="3 8" stroke={C.grid} horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fill: C.tick, fontSize: 11, fontWeight: 500 }}
                                            tickLine={{ stroke: C.grid }}
                                            axisLine={{ stroke: C.axis }}
                                            unit={` ${tab.unit}`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{ fill: C.tick, fontSize: 11, fontWeight: 500 }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={115}
                                        />
                                        <Tooltip content={<BarTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                            {tab.data.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                            ))}
                                            <LabelList
                                                dataKey="value"
                                                position="right"
                                                style={{ fill: C.tick, fontSize: 11, fontWeight: 600 }}
                                                formatter={(v) => `${v}${tab.unit}`}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
