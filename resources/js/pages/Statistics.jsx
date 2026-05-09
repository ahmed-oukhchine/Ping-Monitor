import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

export default function Statistics({ targets = [], loading = false, onRefresh }) {
    const [activeTab, setActiveTab] = useState('latency');
    const [isDark, setIsDark] = useState(
        () => (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light'
    );

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

    const shorten  = (name) => name.length > 16 ? name.slice(0, 14) + '…' : name;
    const latColor = (ms)   => ms  < 50  ? '#22c55e' : ms  < 150 ? '#f59e0b' : '#ef4444';
    const pctColor = (pct)  => pct >= 99 ? '#22c55e' : pct >= 90 ? '#f59e0b' : '#ef4444';

    // ── Counts ───────────────────────────────────────────────────────────────
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
    const withLatency   = targets.filter(t => t.avg_response_time != null);
    const globalLatency = withLatency.length
        ? (withLatency.reduce((s, t) => s + t.avg_response_time, 0) / withLatency.length).toFixed(1) : null;

    const withUptime   = targets.filter(t => t.uptime_percent != null);
    const globalUptime = withUptime.length
        ? (withUptime.reduce((s, t) => s + t.uptime_percent, 0) / withUptime.length).toFixed(1) : null;

    // ── Per-target datasets ───────────────────────────────────────────────────
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

    const uptimeCls = globalUptime == null ? 'text-base-content/30'
        : parseFloat(globalUptime) >= 99 ? 'text-success'
        : parseFloat(globalUptime) >= 90 ? 'text-warning'
        : 'text-error';

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

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-screen-xl mx-auto px-6 py-6">

                {/* Page title */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                        <div>
                            <h1 className="text-base font-bold text-base-content leading-tight">Network Statistics</h1>
                            <p className="text-xs text-base-content/40 mt-0.5">
                                {loading ? 'Loading…' : `${targets.length} device${targets.length !== 1 ? 's' : ''} monitored`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-base-300 text-base-content/55 rounded-lg hover:bg-base-300/50 hover:text-base-content transition-all"
                    >
                        <i className="fas fa-sync text-[10px]"></i>
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32 text-base-content/30">
                        <div className="text-center">
                            <span className="loading loading-spinner loading-lg block mx-auto mb-3"></span>
                            <p className="text-sm">Loading statistics…</p>
                        </div>
                    </div>
                ) : targets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 shadow-[0_0_24px_color-mix(in_oklch,var(--color-primary)_15%,transparent)]">
                            <i className="fas fa-satellite-dish text-primary text-2xl"></i>
                        </div>
                        <h2 className="text-base font-bold text-base-content mb-1">No devices monitored yet</h2>
                        <p className="text-sm text-base-content/40 mb-6 max-w-xs">
                            Add your first target on the Monitoring page to start collecting data.
                        </p>
                        <Link to="/monitoring"
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]"
                            style={{ textDecoration: 'none' }}>
                            <i className="fas fa-plus text-[10px]"></i>
                            Go to Monitoring
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">

                        {/* ── Offline alert banner ──────────────────── */}
                        {offline > 0 && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-error/8 border border-error/25 rounded-xl">
                                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                    <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-70"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                                </span>
                                <span className="text-xs font-bold text-error flex-shrink-0">
                                    {offline} device{offline !== 1 ? 's' : ''} offline
                                </span>
                                <div className="w-px h-3.5 bg-error/20 flex-shrink-0"></div>
                                <div className="flex flex-wrap gap-1.5">
                                    {targets.filter(t => !t.is_paused && t.last_status === false).map(t => (
                                        <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-md bg-error/12 text-error/80 font-medium border border-error/20">
                                            {t.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Fleet health bar ──────────────────────── */}
                        {targets.length > 0 && (
                            <div className="flex items-center gap-4 px-4 py-3 bg-base-200 border border-base-300 rounded-xl">
                                <div className="flex-1">
                                    <div className="flex h-2 rounded-full overflow-hidden bg-base-300/60 gap-px">
                                        {online       > 0 && <div className="bg-success transition-all duration-700" style={{ width: `${(online       / targets.length) * 100}%` }}></div>}
                                        {maintenance  > 0 && <div className="bg-warning transition-all duration-700" style={{ width: `${(maintenance  / targets.length) * 100}%` }}></div>}
                                        {offline      > 0 && <div className="bg-error   transition-all duration-700" style={{ width: `${(offline      / targets.length) * 100}%` }}></div>}
                                        {unknown      > 0 && <div className="bg-base-content/20 transition-all duration-700" style={{ width: `${(unknown / targets.length) * 100}%` }}></div>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
                                    {online      > 0 && <span className="flex items-center gap-1.5 text-success/80"><span className="w-1.5 h-1.5 rounded-full bg-success"></span>{online} online</span>}
                                    {maintenance > 0 && <span className="flex items-center gap-1.5 text-warning/80"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span>{maintenance} maintenance</span>}
                                    {offline     > 0 && <span className="flex items-center gap-1.5 text-error/80"><span className="w-1.5 h-1.5 rounded-full bg-error"></span>{offline} offline</span>}
                                    {unknown     > 0 && <span className="flex items-center gap-1.5 text-base-content/40"><span className="w-1.5 h-1.5 rounded-full bg-base-content/20"></span>{unknown} unknown</span>}
                                    <div className="w-px h-3.5 bg-base-300"></div>
                                    <span className={`font-bold mono ${offline > 0 ? 'text-error' : parseFloat(globalUptime) >= 99 ? 'text-success' : 'text-warning'}`}>
                                        {globalUptime ?? '—'}% uptime
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ── Summary cards ──────────────────────────────── */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total Devices', value: targets.length,
                                  sub: maintenance > 0 ? `${maintenance} in maintenance` : 'All monitored',
                                  subCls: maintenance > 0 ? 'text-warning/70' : 'text-base-content/25',
                                  cls: 'text-base-content', icon: 'fa-server', bg: 'bg-primary/10', ic: 'text-primary', border: 'border-t-primary/60' },
                                { label: 'Online', value: online,
                                  sub: globalUptime ? `${globalUptime}% fleet uptime` : null,
                                  subCls: 'text-base-content/30',
                                  cls: 'text-success', icon: 'fa-check-circle', bg: 'bg-success/10', ic: 'text-success', border: 'border-t-success/60' },
                                { label: 'Offline', value: offline,
                                  sub: offline > 0 ? 'Requires attention' : 'All clear',
                                  subCls: offline > 0 ? 'text-error/60' : 'text-base-content/25',
                                  cls: offline > 0 ? 'text-error' : 'text-base-content/35',
                                  icon: 'fa-times-circle', bg: offline > 0 ? 'bg-error/10' : 'bg-base-300/50', ic: offline > 0 ? 'text-error' : 'text-base-content/25', border: offline > 0 ? 'border-t-error/60' : 'border-t-base-300' },
                                { label: 'Maintenance', value: maintenance,
                                  sub: maintenance > 0 ? 'Excluded from stats' : 'None paused',
                                  subCls: maintenance > 0 ? 'text-warning/60' : 'text-base-content/25',
                                  cls: maintenance > 0 ? 'text-warning' : 'text-base-content/35',
                                  icon: 'fa-pause', bg: 'bg-warning/10', ic: 'text-warning', border: 'border-t-warning/60' },
                                { label: 'Avg Latency', value: globalLatency ? `${globalLatency} ms` : '—',
                                  sub: globalLatency == null ? 'No data yet' : globalLatency < 50 ? 'Fast' : globalLatency < 150 ? 'Moderate' : 'Slow — check targets',
                                  subCls: globalLatency == null ? 'text-base-content/25' : globalLatency < 50 ? 'text-success/60' : globalLatency < 150 ? 'text-warning/60' : 'text-error/60',
                                  cls: 'text-primary', icon: 'fa-tachometer-alt', bg: 'bg-primary/10', ic: 'text-primary', border: 'border-t-primary/60' },
                                { label: 'Avg Uptime', value: globalUptime ? `${globalUptime}%` : '—',
                                  sub: globalUptime == null ? 'No data yet' : parseFloat(globalUptime) >= 99 ? 'Excellent' : parseFloat(globalUptime) >= 90 ? 'Good' : 'Needs improvement',
                                  subCls: globalUptime == null ? 'text-base-content/25' : parseFloat(globalUptime) >= 99 ? 'text-success/60' : parseFloat(globalUptime) >= 90 ? 'text-warning/60' : 'text-error/60',
                                  cls: uptimeCls, icon: 'fa-arrow-up', bg: 'bg-success/10', ic: 'text-success', border: 'border-t-success/60' },
                            ].map((c, i) => (
                                <div key={c.label} className={`stat-card anim-fade-up anim-delay-${i + 1} bg-base-200 border border-base-300 border-t-2 ${c.border} rounded-xl p-4 flex items-center gap-3`}>
                                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                        <i className={`fas ${c.icon} ${c.ic} text-lg`}></i>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-2xl font-bold tabular-nums mono leading-none ${c.cls}`}>{c.value}</div>
                                        <div className="text-xs text-base-content/45 mt-0.5 font-medium leading-tight">{c.label}</div>
                                        {c.sub && <div className={`text-[10px] mt-0.5 leading-tight ${c.subCls}`}>{c.sub}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Donut + Fleet health ───────────────────────── */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Status Distribution</h2>
                                </div>
                                {pieData.length === 0 ? (
                                    <div className="flex items-center justify-center h-36 text-base-content/30 text-sm">No data yet</div>
                                ) : (
                                    <div className="flex items-center gap-8">
                                        <ResponsiveContainer width={150} height={150}>
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={66} paddingAngle={3} dataKey="value">
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<PieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex flex-col gap-3">
                                            {pieData.map(d => (
                                                <div key={d.name} className="flex items-center gap-3">
                                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                                                    <span className="text-sm text-base-content/60">{d.name}</span>
                                                    <span className="text-sm font-bold mono tabular-nums ml-auto" style={{ color: d.color }}>{d.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Fleet Health</h2>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Average Latency',     value: globalLatency ? `${globalLatency} ms` : '—', cls: 'text-primary'                                                                              },
                                        { label: 'Average Uptime',      value: globalUptime  ? `${globalUptime}%`    : '—', cls: uptimeCls                                                                                   },
                                        { label: 'In Maintenance',      value: maintenance,                                  cls: maintenance > 0 ? 'text-warning'         : 'text-base-content/35'                          },
                                        { label: 'Unknown Status',      value: unknown,                                      cls: unknown     > 0 ? 'text-base-content/60' : 'text-base-content/35'                          },
                                        { label: 'Total Ping Checks',   value: targets.reduce((s, t) => s + (t.total_pings ?? 0), 0).toLocaleString(), cls: 'text-base-content'                                              },
                                        { label: 'Total Failed Checks', value: targets.reduce((s, t) => s + (t.failed_pings ?? 0), 0).toLocaleString(), cls: targets.some(t => t.failed_pings > 0) ? 'text-error' : 'text-base-content/35' },
                                    ].map(m => (
                                        <div key={m.label} className="flex items-center justify-between gap-4 border-b border-base-300/50 pb-3 last:border-0 last:pb-0">
                                            <span className="text-sm text-base-content/50">{m.label}</span>
                                            <span className={`text-sm font-bold mono tabular-nums ${m.cls}`}>{m.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Per-device breakdown ───────────────────────── */}
                        <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Per-Device Breakdown</h2>
                                </div>
                                <div className="flex items-center gap-0.5 bg-base-300/60 rounded-lg p-0.5">
                                    {tabs.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveTab(t.id)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                activeTab === t.id
                                                    ? 'bg-primary/15 text-primary shadow-sm'
                                                    : 'text-base-content/45 hover:text-base-content'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {tab.data.length === 0 ? (
                                <div className="flex items-center justify-center h-48 text-base-content/30 text-sm">
                                    No data yet — run some pings first
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden py-4 px-2" style={{ background: C.bg }}>
                                    <ResponsiveContainer width="100%" height={Math.max(200, tab.data.length * 38)}>
                                        <BarChart data={tab.data} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
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
                                                tick={{ fill: C.tick, fontSize: 12, fontWeight: 500 }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={120}
                                            />
                                            <Tooltip content={<BarTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                                            <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={24}>
                                                {tab.data.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                                ))}
                                                <LabelList
                                                    dataKey="value"
                                                    position="right"
                                                    style={{ fill: C.tick, fontSize: 12, fontWeight: 600 }}
                                                    formatter={(v) => `${v}${tab.unit}`}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
