import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, AreaChart, Area } from 'recharts';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const RANGES = (t) => [
    { label: t('reports.24h'),  days: 1 },
    { label: t('reports.7d'),   days: 7 },
    { label: t('reports.30d'),  days: 30 },
    { label: t('reports.90d'),  days: 90 },
];

function fmtDate(d) {
    return d.toISOString().slice(0, 10);
}

export default function Reports({ user }) {
    const { t } = useLang();
    const { toast } = useToast();
    const ranges = RANGES(t);
    const [data, setData]         = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [loading, setLoading]   = useState(true);
    const [targetId, setTargetId] = useState('');
    const [dateFrom, setDateFrom] = useState(() => fmtDate(new Date(Date.now() - 7 * 86400000)));
    const [dateTo, setDateTo]     = useState(() => fmtDate(new Date()));
    const [schedules, setSchedules] = useState([]);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [form, setForm] = useState({ name: '', frequency: 'weekly', recipients: '' });
    const [page, setPage] = useState(0);
    const perPage = 10;

    const isAdmin = user?.role === 'admin' || user?.role === 'config_manager';

    useEffect(() => {
        if (isAdmin) {
            axios.get('/api/report/schedules')
                .then(res => setSchedules(res.data))
                .catch(() => {});
        }
    }, [isAdmin]);

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

    useEffect(() => { setPage(0); }, [data]);

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

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-bold text-base-content">{t('reports.title')}</h1>
                        {summary && (
                            <div className="flex items-center gap-2 text-[11px] text-base-content/40 ml-2 pl-2 border-l border-base-300">
                                <span>{t('reports.nTargets', { n: summary.total_targets })}</span>
                                <span>·</span>
                                <span>{t('reports.nChecks', { n: summary.total_pings })}</span>
                                {summary.fleet_uptime != null && (
                                    <>
                                        <span>·</span>
                                        <span className="font-semibold" style={{ color: uptimeColor(summary.fleet_uptime) }}>
                                            {summary.fleet_uptime}% uptime
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">{t('reports.scheduledReports')}</h2>
                                <span className="text-[10px] text-base-content/25">({schedules.length})</span>
                            </div>
                            <button onClick={() => setShowScheduleForm(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all">
                                <i className="fas fa-plus text-[9px]"></i> {t('reports.newSchedule')}
                            </button>
                        </div>

                        {schedules.length === 0 && !showScheduleForm ? (
                            <p className="text-center text-[11px] text-base-content/30 py-4">{t('reports.noSchedules')}</p>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {schedules.map(s => (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-100 border border-base-300">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <i className="fas fa-file-pdf text-error/60 text-sm"></i>
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-base-content truncate">{s.name}</div>
                                                <div className="flex items-center gap-2 text-[10px] text-base-content/40">
                                                    <span className="capitalize">{s.frequency}</span>
                                                    <span className="text-base-content/20">·</span>
                                                    <span>{s.recipients?.length || 0} recipient{(s.recipients?.length || 0) !== 1 ? 's' : ''}</span>
                                                    <span className="text-base-content/20">·</span>
                                                    <span>{s.frequency === 'weekly' ? 'Monday 9:00 AM' : '1st Monday 9:00 AM'}</span>
                                                    {s.last_sent_at && (
                                                        <>
                                                            <span className="text-base-content/20">·</span>
                                                            <span>Last: {new Date(s.last_sent_at).toLocaleDateString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => {
                                                axios.post(`/api/report/schedules/${s.id}/send`)
                                                    .then(() => axios.get('/api/report/schedules').then(r => setSchedules(r.data)));
                                            }}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all">
                                                <i className="fas fa-paper-plane text-[8px]"></i> {t('reports.sendNow')}
                                            </button>
                                            <button onClick={() => setPendingDelete(s)}
                                                className="text-base-content/30 hover:text-error transition-colors px-1">
                                                <i className="fas fa-trash text-[11px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {showScheduleForm && (
                            <div className="mt-3 px-3 py-3 rounded-lg bg-base-100 border border-base-300">
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div>
                                        <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider block mb-1">{t('reports.name')}</label>
                                        <input type="text" value={form.name} placeholder={t('reports.namePlaceholder')}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full bg-base-200 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider block mb-1">{t('reports.frequency')}</label>
                                        <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                                            className="w-full bg-base-200 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors">
                                            <option value="weekly">{t('reports.weekly')}</option>
                                            <option value="monthly">{t('reports.monthly')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider block mb-1">{t('reports.recipients')}</label>
                                        <input type="text" value={form.recipients} placeholder={t('reports.recipientsPlaceholder')}
                                            onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))}
                                            className="w-full bg-base-200 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => { setShowScheduleForm(false); setForm({ name: '', frequency: 'weekly', recipients: '' }); }}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-base-content/40 hover:text-base-content/60 transition-colors">
                                        {t('reports.cancel')}
                                    </button>
                                    <button onClick={() => {
                                        const recipients = form.recipients.split(',').map(r => r.trim()).filter(Boolean);
                                        if (!form.name || recipients.length === 0) return;
                                        axios.post('/api/report/schedules', { ...form, recipients })
                                            .then(res => {
                                                setSchedules(prev => [...prev, res.data]);
                                                setShowScheduleForm(false);
                                                setForm({ name: '', frequency: 'weekly', recipients: '' });
                                            });
                                    }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all">
                                        <i className="fas fa-save text-[9px]"></i> {t('reports.create')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="anim-fade-up anim-delay-2 bg-base-200 border border-base-300 rounded-xl px-4 py-3 flex items-center flex-wrap gap-x-4 gap-y-2.5">

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('reports.target')}</span>
                        <select
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}>
                            <option value="">{t('reports.allTargets')}</option>
                            {data?.targets?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('reports.period')}</span>
                        {ranges.map(r => (
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
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('reports.from')}</span>
                        <input type="date" value={dateFrom} max={dateTo || undefined}
                            onChange={e => setDateFrom(e.target.value)}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('reports.to')}</span>
                        <input type="date" value={dateTo} min={dateFrom || undefined}
                            onChange={e => setDateTo(e.target.value)}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {activeFilters > 0 && (
                        <button onClick={() => { setTargetId(''); applyRange(7); }}
                            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-base-content/50 hover:text-error hover:bg-error/10 transition-all">
                            <i className="fas fa-times text-[10px]"></i> {t('reports.reset')}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-base-content/30">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <>
                        {summary && (
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: t('reports.fleetUptimeLabel'), value: summary.fleet_uptime != null ? `${summary.fleet_uptime}%` : '—',
                                      color: uptimeColor(summary.fleet_uptime), icon: 'fa-arrow-up', bg: 'bg-success/10', ic: 'text-success',
                                      sub: summary.fleet_uptime >= 99.9 ? t('reports.excellent') : summary.fleet_uptime >= 99 ? t('reports.good') : summary.fleet_uptime != null ? t('reports.needsImprovement') : t('reports.noData') },
                                    { label: t('reports.avgLatencyLabel'), value: summary.avg_latency != null ? `${summary.avg_latency} ms` : '—',
                                      color: latencyColor(summary.avg_latency), icon: 'fa-tachometer-alt', bg: 'bg-primary/10', ic: 'text-primary',
                                      sub: summary.avg_latency < 50 ? t('reports.fast') : summary.avg_latency < 150 ? t('reports.moderate') : summary.avg_latency != null ? t('reports.slow') : t('reports.noData') },
                                    { label: t('reports.totalChecks'), value: summary.total_pings.toLocaleString(),
                                      color: 'var(--color-base-content)', icon: 'fa-broadcast-tower', bg: 'bg-base-300/50', ic: 'text-base-content/50',
                                      sub: t('reports.nFailed', { n: summary.total_failed }) },
                                    { label: t('reports.devices'), value: summary.total_targets,
                                      color: 'var(--color-base-content)', icon: 'fa-server', bg: 'bg-base-300/50', ic: 'text-base-content/50',
                                      sub: t('reports.monitored') },
                                ].map((c, i) => (
                                    <div key={c.label} className={`anim-fade-up anim-delay-${i + 3} bg-base-200 border border-base-300 rounded-xl p-4 flex items-center gap-3`}>
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

                        {daily.length > 1 && (
                            <div className="anim-fade-up anim-delay-5 bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('reports.uptimeTrend')}</h2>
                                    <span className="text-[10px] text-base-content/25">{t('reports.nDays', { n: daily.length })}</span>
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

                        <div className="anim-fade-up anim-delay-6 bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-base-300">
                                <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('reports.perTargetBreakdown')}</h2>
                                <span className="text-[10px] text-base-content/25">{t('reports.nDevices', { n: stats.length })}</span>
                                {stats.length > perPage && (
                                    <span className="text-[10px] text-base-content/20 ml-auto">Page {page + 1}/{Math.ceil(stats.length / perPage)}</span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-base-300 bg-base-300/40">
                                            {[t('reports.hash'), t('reports.target'), t('reports.ipAddress'), t('reports.checks'), t('reports.uptime'), t('reports.avgLatency'), t('reports.status')].map(h => (
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
                                                    <p className="text-sm text-base-content/30">{t('reports.noPingData')}</p>
                                                    <p className="text-xs text-base-content/20 mt-1">{t('reports.tryWiderRange')}</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.slice(page * perPage, (page + 1) * perPage).map((s, idx) => {
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
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-base-300/50 text-base-content/30 text-xs font-medium">{t('reports.noData')}</span>
                                                            ) : uptime >= 99.9 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-semibold">
                                                                    <i className="fas fa-check-circle text-[10px]"></i> {t('reports.excellent')}
                                                                </span>
                                                            ) : uptime >= 99 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/8 text-green-600 text-xs font-semibold">
                                                                    <i className="fas fa-check text-[10px]"></i> {t('reports.good')}
                                                                </span>
                                                            ) : uptime >= 95 ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-semibold">
                                                                    <i className="fas fa-exclamation-triangle text-[10px]"></i> {t('reports.degraded')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error/10 text-error text-xs font-semibold">
                                                                    <i className="fas fa-times-circle text-[10px]"></i> {t('reports.critical')}
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
                            {stats.length > perPage && (
                                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-base-300">
                                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-base-300 text-base-content/50 hover:text-base-content hover:border-base-content/30 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                                        <i className="fas fa-chevron-left mr-1"></i> Previous
                                    </button>
                                    <button onClick={() => setPage(p => Math.min(Math.ceil(stats.length / perPage) - 1, p + 1))} disabled={page >= Math.ceil(stats.length / perPage) - 1}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-base-300 text-base-content/50 hover:text-base-content hover:border-base-content/30 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                                        Next <i className="fas fa-chevron-right ml-1"></i>
                                    </button>
                                </div>
                            )}
                        </div>

                        {stats.length > 1 && (
                            <div className="anim-fade-up anim-delay-7 bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-0.5 h-3.5 rounded-full bg-error/60 flex-shrink-0"></div>
                                    <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('reports.uptimeByTarget')}</h2>
                                    <span className="text-[10px] text-base-content/25">{t('reports.sortedAsc')}</span>
                                </div>
                                {(() => {
                                    const sortedStats = [...stats].sort((a, b) => (a.uptime_percent ?? 0) - (b.uptime_percent ?? 0));
                                    const MAX_VISIBLE = 15;
                                    let chartData = [];
                                    let otherCount = 0;
                                    if (sortedStats.length > MAX_VISIBLE) {
                                        chartData = sortedStats.slice(0, MAX_VISIBLE - 1);
                                        const rest = sortedStats.slice(MAX_VISIBLE - 1);
                                        otherCount = rest.length;
                                        const avgUptime = Math.round(rest.reduce((s, t) => s + (t.uptime_percent ?? 0), 0) / rest.length * 10) / 10;
                                        chartData.push({
                                            target_name: `Other (${rest.length} targets)`,
                                            target_id: null,
                                            uptime_percent: avgUptime || 0,
                                            avg_response_time: null,
                                            isOther: true,
                                        });
                                    } else {
                                        chartData = sortedStats;
                                    }
                                    return (
                                        <div className={`rounded-xl overflow-hidden py-4 px-2 ${chartData.length > 10 ? 'overflow-x-auto' : ''}`}
                                            style={{ background: 'rgba(0,0,0,0.06)', minHeight: 520 }}>
                                            <div style={chartData.length > 10 ? { minWidth: chartData.length * 60 } : {}}>
                                            <ResponsiveContainer width={chartData.length > 10 ? chartData.length * 60 : '100%'} height={500}>
                                                <BarChart data={chartData}
                                                    margin={{ top: 4, right: 12, left: 8, bottom: chartData.length > 10 ? 100 : 80 }}>
                                                    <CartesianGrid strokeDasharray="3 8" stroke="color-mix(in oklch, var(--color-base-content) 10%, transparent)" vertical={false} />
                                                    <XAxis type="category" dataKey="target_name" interval={0} angle={chartData.length > 10 ? -50 : -45} textAnchor="end"
                                                        tick={{ fill: 'color-mix(in oklch, var(--color-base-content) 60%, transparent)', fontSize: chartData.length > 10 ? 10 : 11, fontWeight: 500 }}
                                                        tickLine={false} axisLine={{ stroke: 'color-mix(in oklch, var(--color-base-content) 15%, transparent)' }} />
                                                    <YAxis type="number" domain={[0, 100]}
                                                        tick={{ fill: 'color-mix(in oklch, var(--color-base-content) 60%, transparent)', fontSize: 11, fontWeight: 500 }}
                                                        tickLine={false} axisLine={{ stroke: 'color-mix(in oklch, var(--color-base-content) 15%, transparent)' }} unit="%" />
                                                    <Tooltip content={({ active, payload }) => {
                                                        if (!active || !payload?.length) return null;
                                                        const d = payload[0].payload;
                                                        return (
                                                            <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2 text-xs shadow-xl">
                                                                <div className="text-base-content/60 mb-1">{d.target_name}</div>
                                                                <div className="font-bold" style={{ color: uptimeColor(d.uptime_percent) }}>
                                                                    {d.uptime_percent != null ? `${d.uptime_percent}%` : '—'} uptime
                                                                </div>
                                                                {d.isOther && (
                                                                    <div className="text-base-content/40 mt-1">{d.target_name}</div>
                                                                )}
                                                                {!d.isOther && d.avg_response_time != null && (
                                                                    <div className="text-base-content/40">{d.avg_response_time} ms avg</div>
                                                                )}
                                                            </div>
                                                        );
                                                    }} />
                                                    <Bar dataKey="uptime_percent" radius={[5, 5, 0, 0]} maxBarSize={60}>
                                                        {chartData.map((s, i) => (
                                                            <Cell key={i} fill={s.isOther ? 'color-mix(in oklch, var(--color-base-content) 30%, transparent)' : uptimeColor(s.uptime_percent)} fillOpacity={0.85} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                    </>
                )}
            </div>

            {pendingDelete && (
                <ConfirmModal
                    title="Delete scheduled report?"
                    message={`Delete the scheduled report for "${pendingDelete.target?.name || 'this target'}"?`}
                    onConfirm={async () => {
                        await axios.delete(`/api/report/schedules/${pendingDelete.id}`);
                        setSchedules(prev => prev.filter(x => x.id !== pendingDelete.id));
                        setPendingDelete(null);
                        toast('Scheduled report deleted');
                    }}
                    onClose={() => setPendingDelete(null)}
                />
            )}
        </div>
    );
}
