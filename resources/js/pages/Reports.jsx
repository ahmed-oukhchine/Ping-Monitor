import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, AreaChart, Area } from 'recharts';

const RANGES = [
    { label: '24h',  days: 1 },
    { label: '7d',   days: 7 },
    { label: '30d',  days: 30 },
    { label: '90d',  days: 90 },
];

function fmtDate(d) {
    return d.toISOString().slice(0, 10);
}

export default function Reports() {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [targetId, setTargetId] = useState('');
    const [dateFrom, setDateFrom] = useState(() => fmtDate(new Date(Date.now() - 7 * 86400000)));
    const [dateTo, setDateTo]     = useState(() => fmtDate(new Date()));

    useEffect(() => {
        setLoading(true);
        axios.get('/api/report', {
            params: {
                target_id: targetId || undefined,
                date_from: dateFrom || undefined,
                date_to:   dateTo   || undefined,
            },
        })
            .then(res => setData(res.data))
            .finally(() => setLoading(false));
    }, [targetId, dateFrom, dateTo]);

    const applyRange = (days) => {
        setDateFrom(fmtDate(new Date(Date.now() - days * 86400000)));
        setDateTo(fmtDate(new Date()));
    };

    const uptimeColor = (pct) => {
        if (pct == null) return 'var(--color-base-content)';
        if (pct >= 99.9) return '#22c55e';
        if (pct >= 99)   return '#16a34a';
        if (pct >= 95)   return '#f59e0b';
        return '#ef4444';
    };

    const latencyColor = (ms) => {
        if (ms == null) return 'var(--color-base-content)';
        if (ms < 50)   return '#22c55e';
        if (ms < 150)  return '#f59e0b';
        return '#ef4444';
    };

    const summary = data?.summary;
    const stats   = data?.stats ?? [];
    const daily   = data?.daily ?? [];

    const activeFilters = [targetId, dateFrom !== fmtDate(new Date(Date.now() - 7 * 86400000)) || dateTo !== fmtDate(new Date())].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

                {/* ── Header ─────────────────────────────────────── */}
                <div className="anim-fade-up flex items-center gap-3">
                    <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-base-content leading-tight">SLA Reports</h1>
                        {summary ? (
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                <span className="text-xs text-base-content/40">{summary.total_targets} target{summary.total_targets !== 1 ? 's' : ''}</span>
                                <span className="text-base-content/20">·</span>
                                <span className="text-xs text-base-content/40">{summary.total_pings.toLocaleString()} checks</span>
                                {summary.fleet_uptime != null && (
                                    <>
                                        <span className="text-base-content/20">·</span>
                                        <span className="text-xs font-semibold" style={{ color: uptimeColor(summary.fleet_uptime) }}>
                                            {summary.fleet_uptime}% fleet uptime
                                        </span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-base-content/40 mt-0.5">Loading…</p>
                        )}
                    </div>
                </div>

                {/* ── Filter bar ──────────────────────────────────── */}
                <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl px-4 py-3 flex items-center flex-wrap gap-x-4 gap-y-2.5">

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">Target</span>
                        <select
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}>
                            <option value="">All Targets</option>
                            {data?.targets?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">Period</span>
                        {RANGES.map(r => (
                            <button key={r.days} onClick={() => applyRange(r.days)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    dateFrom === fmtDate(new Date(Date.now() - r.days * 86400000)) && dateTo === fmtDate(new Date())
                                        ? 'bg-primary/15 text-primary border border-primary/30'
                                        : 'text-base-content/50 border border-base-300 hover:bg-base-300/50'
                                }`}>
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">From</span>
                        <input type="date" value={dateFrom} max={dateTo || undefined}
                            onChange={e => setDateFrom(e.target.value)}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">To</span>
                        <input type="date" value={dateTo} min={dateFrom || undefined}
                            onChange={e => setDateTo(e.target.value)}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {activeFilters > 0 && (
                        <button onClick={() => { setTargetId(''); applyRange(7); }}
                            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-base-content/50 hover:text-error hover:bg-error/10 transition-all">
                            <i className="fas fa-times text-[10px]"></i> Reset
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-base-content/30">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <>
                        {/* ── Summary cards ──────────────────────────────── */}
                        {summary && (
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: 'Fleet Uptime', value: summary.fleet_uptime != null ? `${summary.fleet_uptime}%` : '—',
                                      color: uptimeColor(summary.fleet_uptime), icon: 'fa-arrow-up', bg: 'bg-success/10', ic: 'text-success',
                                      sub: summary.fleet_uptime >= 99.9 ? 'Excellent' : summary.fleet_uptime >= 99 ? 'Good' : summary.fleet_uptime != null ? 'Needs improvement' : 'No data' },
                                    { label: 'Avg Latency', value: summary.avg_latency != null ? `${summary.avg_latency} ms` : '—',
                                      color: latencyColor(summary.avg_latency), icon: 'fa-tachometer-alt', bg: 'bg-primary/10', ic: 'text-primary',
                                      sub: summary.avg_latency < 50 ? 'Fast' : summary.avg_latency < 150 ? 'Moderate' : summary.avg_latency != null ? 'Slow' : 'No data' },
                                    { label: 'Total Checks', value: summary.total_pings.toLocaleString(),
                                      color: 'var(--color-base-content)', icon: 'fa-broadcast-tower', bg: 'bg-base-300/50', ic: 'text-base-content/50',
                                      sub: `${summary.total_failed.toLocaleString()} failed` },
                                    { label: 'Devices', value: summary.total_targets,
                                      color: 'var(--color-base-content)', icon: 'fa-server', bg: 'bg-base-300/50', ic: 'text-base-content/50',
                                      sub: 'monitored' },
                                ].map((c, i) => (
                                    <div key={c.label} className={`anim-fade-up anim-delay-${i + 1} bg-base-200 border border-base-300 rounded-xl p-4 flex items-center gap-3`}>
                                        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                            <i className={`fas ${c.icon} ${c.ic} text-lg`}></i>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-2xl font-bold tabular-nums mono leading-none" style={{ color: c.color }}>{c.value}</div>
                                            <div className="text-xs text-base-content/45 mt-0.5 font-medium leading-tight">{c.label}</div>
                                            <div className="text-[10px] mt-0.5 leading-tight text-base-content/30">{c.sub}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Uptime trend chart ────────────────────────── */}
                        {daily.length > 1 && (
                            <div className="anim-fade-up anim-delay-3 bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Uptime Trend</h2>
                                    <span className="text-[10px] text-base-content/25">{daily.length} days</span>
                                </div>
                                <div className="rounded-xl overflow-hidden py-4 px-2" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <AreaChart data={daily} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                                            <defs>
                                                <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 8" stroke="rgba(255,255,255,0.06)" />
                                            <XAxis dataKey="date" tick={{ fill: '#c9cdd6', fontSize: 11, fontWeight: 500 }}
                                                tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                                                tickFormatter={d => d.slice(5)} />
                                            <YAxis domain={[95, 100]} tick={{ fill: '#c9cdd6', fontSize: 11, fontWeight: 500 }}
                                                tickLine={false} axisLine={false} unit="%" width={50} />
                                            <Tooltip content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2 text-xs shadow-xl">
                                                        <div className="text-base-content/60 mb-1">{d.date}</div>
                                                        <div className="font-bold text-success">{d.uptime}% uptime</div>
                                                        <div className="text-base-content/40">{d.failed} of {d.total} failed</div>
                                                    </div>
                                                );
                                            }} />
                                            <Area type="monotone" dataKey="uptime" stroke="#22c55e" strokeWidth={2.5}
                                                fill="url(#uptimeGrad)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* ── Per-target breakdown table ──────────────── */}
                        <div className="anim-fade-up anim-delay-4 bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-base-300">
                                <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Per-Target Breakdown</h2>
                                <span className="text-[10px] text-base-content/25">{stats.length} device{stats.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-base-300 bg-base-300/40">
                                            {['#', 'Target', 'IP Address', 'Checks', 'Uptime', 'Avg Latency', 'Status'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-base-content/50 uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-base-300/50">
                                        {stats.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="text-center py-14">
                                                    <i className="fas fa-chart-bar text-3xl block mb-3 text-base-content/10"></i>
                                                    <p className="text-sm text-base-content/30">No ping data for this period</p>
                                                    <p className="text-xs text-base-content/20 mt-1">Try a wider date range</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.map((s, idx) => {
                                                const uptime = s.uptime_percent;
                                                const lat    = s.avg_response_time;
                                                return (
                                                    <tr key={s.target_id} className="hover:bg-base-300/20 transition-colors duration-100">
                                                        <td className="px-4 py-3 text-xs text-base-content/25 font-bold tabular-nums">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-medium text-sm text-base-content">{s.target_name}</td>
                                                        <td className="px-4 py-3"><code className="ip-code">{s.target_ip}</code></td>
                                                        <td className="px-4 py-3 mono text-xs text-base-content/50 tabular-nums">{s.total_pings.toLocaleString()}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="flex-1 max-w-[120px] h-2 rounded-full bg-base-300 overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all duration-500"
                                                                        style={{
                                                                            width: `${uptime ?? 0}%`,
                                                                            backgroundColor: uptimeColor(uptime),
                                                                        }}></div>
                                                                </div>
                                                                <span className="mono text-xs font-bold tabular-nums" style={{ color: uptimeColor(uptime) }}>
                                                                    {uptime != null ? `${uptime}%` : '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="mono text-xs font-semibold tabular-nums" style={{ color: latencyColor(lat) }}>
                                                                {lat != null ? `${lat} ms` : '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {uptime == null ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-base-300/50 text-base-content/30 text-xs font-medium">No data</span>
                                                            ) : uptime >= 99.9 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-semibold">
                                                                    <i className="fas fa-check-circle text-[10px]"></i> Excellent
                                                                </span>
                                                            ) : uptime >= 99 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/8 text-green-600 text-xs font-semibold">
                                                                    <i className="fas fa-check text-[10px]"></i> Good
                                                                </span>
                                                            ) : uptime >= 95 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-semibold">
                                                                    <i className="fas fa-exclamation-triangle text-[10px]"></i> Degraded
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error/10 text-error text-xs font-semibold">
                                                                    <i className="fas fa-times-circle text-[10px]"></i> Critical
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Worst performers bar chart ──────────────── */}
                        {stats.length > 1 && (
                            <div className="anim-fade-up anim-delay-5 bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-0.5 h-3.5 rounded-full bg-error/60 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Uptime by Target</h2>
                                    <span className="text-[10px] text-base-content/25">sorted ascending</span>
                                </div>
                                <div className="rounded-xl overflow-hidden py-4 px-2" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                    <ResponsiveContainer width="100%" height={Math.max(200, stats.length * 36)}>
                                        <BarChart data={[...stats].sort((a, b) => (a.uptime_percent ?? 0) - (b.uptime_percent ?? 0))} layout="vertical"
                                            margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 8" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                            <XAxis type="number" domain={[90, 100]} tick={{ fill: '#c9cdd6', fontSize: 11, fontWeight: 500 }}
                                                tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} unit="%" />
                                            <YAxis type="category" dataKey="target_name"
                                                tick={{ fill: '#c9cdd6', fontSize: 12, fontWeight: 500 }}
                                                tickLine={false} axisLine={false} width={130} />
                                            <Tooltip content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2 text-xs shadow-xl">
                                                        <div className="text-base-content/60 mb-1">{d.target_name}</div>
                                                        <div className="font-bold" style={{ color: uptimeColor(d.uptime_percent) }}>
                                                            {d.uptime_percent != null ? `${d.uptime_percent}%` : '—'} uptime
                                                        </div>
                                                        {d.avg_response_time != null && (
                                                            <div className="text-base-content/40">{d.avg_response_time} ms avg</div>
                                                        )}
                                                    </div>
                                                );
                                            }} />
                                            <Bar dataKey="uptime_percent" radius={[0, 5, 5, 0]} maxBarSize={22}>
                                                {stats.map((s, i) => (
                                                    <Cell key={i} fill={uptimeColor(s.uptime_percent)} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
