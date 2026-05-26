import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

import { useLang } from '../contexts/LanguageContext';

const shorten  = (s, n = 18) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const latColor = (ms)  => ms  < 50  ? '#22c55e' : ms  < 150 ? '#f59e0b' : '#ef4444';
const pctColor = (pct) => pct >= 99 ? '#22c55e' : pct >= 90 ? '#f59e0b' : '#ef4444';

function timeAgo(dateStr, t) {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)   return t ? t('stats.sAgo', { n: diff }) : `${diff}s ago`;
    if (diff < 3600) return t ? t('stats.mAgo', { n: Math.floor(diff / 60) }) : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return t ? t('stats.hAgo', { n: Math.floor(diff / 3600) }) : `${Math.floor(diff / 3600)}h ago`;
    return t ? t('stats.dAgo', { n: Math.floor(diff / 86400) }) : `${Math.floor(diff / 86400)}d ago`;
}

function healthScore(online, total, maintenance, globalUptime, globalLatency) {
    const active = Math.max(1, total - maintenance);
    const onlineScore  = (online / active) * 50;
    const uptimeScore  = ((globalUptime ?? 100) / 100) * 40;
    const latScore     = globalLatency == null ? 10 : globalLatency < 50 ? 10 : globalLatency < 150 ? 5 : 0;
    return Math.round(Math.min(100, Math.max(0, onlineScore + uptimeScore + latScore)));
}

function ScoreRing({ score, t }) {
    const r = 38;
    const circ = 2 * Math.PI * r;
    const dash = circ * (score / 100);
    const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
    const label = score >= 90 ? t('stats.healthy') : score >= 70 ? t('stats.degraded') : t('stats.critical');
    return (
        <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-base-300" />
                <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                <span className="text-xl font-black tabular-nums leading-none" style={{ color }}>{score}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>{label}</span>
            </div>
        </div>
    );
}

function StatusDot({ status, paused }) {
    if (paused) return <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0 inline-block"></span>;
    if (status === true)  return (
        <span className="relative flex h-2 w-2 flex-shrink-0 inline-flex">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" style={{ animationDuration: '2s' }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
    );
    if (status === false) return <span className="w-2 h-2 rounded-full bg-error flex-shrink-0 inline-block"></span>;
    return <span className="w-2 h-2 rounded-full bg-base-content/20 flex-shrink-0 inline-block"></span>;
}

export default function Statistics({ targets = [], loading = false }) {
    const { t } = useLang();
    const [activeTab, setActiveTab] = useState('latency');
    const [tick, setTick] = useState(0);
    useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
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
        tick: '#374151', grid: 'rgba(0,0,0,0.07)', axis: 'rgba(0,0,0,0.15)', bg: 'rgba(0,0,0,0.02)',
    };

    const online      = targets.filter(t => !t.is_paused && t.last_status === true).length;
    const offline     = targets.filter(t => !t.is_paused && t.last_status === false).length;
    const maintenance = targets.filter(t =>  t.is_paused).length;
    const unknown     = targets.filter(t => !t.is_paused && t.last_status == null).length;
    const offlineTargets = targets.filter(t => !t.is_paused && t.last_status === false);

    const withLatency   = targets.filter(t => t.avg_response_time != null);
    const globalLatency = withLatency.length
        ? +(withLatency.reduce((s, t) => s + t.avg_response_time, 0) / withLatency.length).toFixed(1) : null;

    const withUptime   = targets.filter(t => t.uptime_percent != null);
    const globalUptime = withUptime.length
        ? +(withUptime.reduce((s, t) => s + t.uptime_percent, 0) / withUptime.length).toFixed(1) : null;

    const totalPings  = targets.reduce((s, t) => s + (t.total_pings  ?? 0), 0);
    const totalFailed = targets.reduce((s, t) => s + (t.failed_pings ?? 0), 0);

    const score = targets.length ? healthScore(online, targets.length, maintenance, globalUptime, globalLatency) : null;

    const pieData = [
        { name: 'Online',      value: online,      color: '#22c55e' },
        { name: 'Offline',     value: offline,      color: '#ef4444' },
        { name: 'Maintenance', value: maintenance,  color: '#f59e0b' },
        { name: 'Unknown',     value: unknown,      color: '#6b7280' },
    ].filter(d => d.value > 0);

    const worstPerformers = [...targets]
        .filter(t => t.total_pings > 0 && !t.is_paused)
        .sort((a, b) => (a.uptime_percent ?? 100) - (b.uptime_percent ?? 100))
        .slice(0, 5);

    const bestPerformers = [...targets]
        .filter(t => t.total_pings >= 3 && !t.is_paused && t.uptime_percent != null)
        .sort((a, b) => b.uptime_percent - a.uptime_percent || (a.avg_response_time ?? 9999) - (b.avg_response_time ?? 9999))
        .slice(0, 3);

    const highestLatency = [...targets]
        .filter(t => t.avg_response_time != null)
        .sort((a, b) => b.avg_response_time - a.avg_response_time)[0] ?? null;

    const mostPinged = [...targets].sort((a, b) => (b.total_pings ?? 0) - (a.total_pings ?? 0))[0] ?? null;

    const byLatency = [...targets]
        .filter(t => t.avg_response_time != null)
        .sort((a, b) => b.avg_response_time - a.avg_response_time)
        .slice(0, 10)
        .map(t => ({ name: shorten(t.name, 16), value: t.avg_response_time, color: latColor(t.avg_response_time) }));

    const byUptime = [...targets]
        .filter(t => t.uptime_percent != null)
        .sort((a, b) => b.uptime_percent - a.uptime_percent)
        .slice(0, 10)
        .map(t => ({ name: shorten(t.name, 16), value: t.uptime_percent, color: pctColor(t.uptime_percent) }));

    const byLoss = [...targets]
        .filter(t => t.total_pings > 0)
        .map(t => {
            const loss = Math.round(t.failed_pings / t.total_pings * 100);
            return { name: shorten(t.name, 16), value: loss, color: loss === 0 ? '#22c55e' : loss <= 25 ? '#f59e0b' : '#ef4444' };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    const tabs = [
        { id: 'latency', labelKey: 'stats.avgLatencyTab', data: byLatency, unit: 'ms' },
        { id: 'uptime',  labelKey: 'stats.uptimeTab',     data: byUptime,  unit: '%'  },
        { id: 'loss',    labelKey: 'stats.packetLossTab',  data: byLoss,    unit: '%'  },
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
                <span className="text-base-content/60 ms-2">{payload[0].value} {payload[0].value !== 1 ? t('stats.devices') : t('stats.device')}</span>
            </div>
        );
    };

    const BarTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2 text-xs shadow-xl">
                <div className="text-base-content/60 mb-1">{payload[0].payload.name}</div>
                <div className="font-bold" style={{ color: payload[0].payload.color }}>
                    {payload[0].value}{tab.unit}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
            <div className="text-center">
                <span className="loading loading-spinner loading-lg block mx-auto mb-3 text-primary"></span>
                <p className="text-sm text-base-content/40">{t('stats.loading')}</p>
            </div>
        </div>
    );

    if (targets.length === 0) return (
        <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 shadow-[0_0_24px_color-mix(in_oklch,var(--color-primary)_15%,transparent)]">
                <i className="fas fa-satellite-dish text-primary text-2xl"></i>
            </div>
            <h2 className="text-base font-bold text-base-content mb-1">{t('stats.noDevices')}</h2>
            <p className="text-sm text-base-content/40 mb-6 max-w-xs text-center">
                {t('stats.addTargetHint')}
            </p>
            <Link to="/monitoring"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]"
                style={{ textDecoration: 'none' }}>
                <i className="fas fa-plus text-[10px]"></i>{t('stats.goToMonitoring')}
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

                <div className="anim-fade-up flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                        <div>
                            <h1 className="text-base font-bold text-base-content leading-tight">{t('stats.networkDashboard')}</h1>
                            <p className="text-xs text-base-content/40 mt-0.5">{targets.length === 1 ? t('stats.nDevicesMonitored', { n: targets.length }) : t('stats.nDevicesMonitored_plural', { n: targets.length })}</p>
                        </div>
                    </div>
                </div>

                <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl p-5 flex items-center gap-6">
                    {score !== null && <ScoreRing score={score} t={t} />}
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-2">{t('stats.networkHealthScore')}</div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-base-content/50">
                            <span><span className="font-bold text-success">{online}</span> {t('stats.online')}</span>
                            <span><span className={`font-bold ${offline > 0 ? 'text-error' : 'text-base-content/35'}`}>{offline}</span> {t('stats.offline')}</span>
                            <span><span className="font-bold text-warning">{maintenance}</span> {t('stats.inMaintenance')}</span>
                            <span><span className={`font-bold ${uptimeCls}`}>{globalUptime ?? '—'}%</span> {t('stats.avgUptime')}</span>
                            <span><span className="font-bold text-primary">{globalLatency ?? '—'} ms</span> {t('stats.avgLatency')}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 flex-shrink-0">
                        {highestLatency && (
                            <div className="bg-base-300/50 border border-base-300 rounded-xl px-4 py-3 text-center min-w-[110px]">
                                <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-1">{t('stats.highestLatency')}</div>
                                <div className="text-base font-black tabular-nums" style={{ color: latColor(highestLatency.avg_response_time) }}>
                                    {highestLatency.avg_response_time} ms
                                </div>
                                <div className="text-[10px] text-base-content/50 mt-0.5 truncate max-w-[100px]">{shorten(highestLatency.name, 12)}</div>
                            </div>
                        )}
                        {mostPinged && (
                            <div className="bg-base-300/50 border border-base-300 rounded-xl px-4 py-3 text-center min-w-[110px]">
                                <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-1">{t('stats.mostChecked')}</div>
                                <div className="text-base font-black tabular-nums text-primary">
                                    {mostPinged.total_pings.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-base-content/50 mt-0.5 truncate max-w-[100px]">{shorten(mostPinged.name, 12)}</div>
                            </div>
                        )}
                        <div className="bg-base-300/50 border border-base-300 rounded-xl px-4 py-3 text-center min-w-[110px]">
                            <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-1">{t('stats.totalChecks')}</div>
                            <div className="text-base font-black tabular-nums text-base-content">
                                {totalPings.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-base-content/50 mt-0.5">{totalFailed.toLocaleString()} {t('stats.failed')}</div>
                        </div>
                    </div>
                </div>

                        {offline > 0 && (
                    <div className="banner-enter bg-error/8 border border-error/25 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-70"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                            </span>
                            <span className="text-xs font-bold text-error">
                                {offline === 1 ? t('stats.nOfflineAlert', { n: offline }) : t('stats.nOfflineAlert_plural', { n: offline })}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {offlineTargets.map(target => (
                                <div key={target.id} className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-lg px-3 py-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0"></span>
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-error/90 truncate">{target.name}</div>
                                        <div className="text-[10px] text-error/50 font-mono truncate">{target.ip_address}</div>
                                    </div>
                                    {target.last_ping_at && (
                                        <div className="text-[10px] text-error/40 ms-auto flex-shrink-0">{timeAgo(target.last_ping_at, t)}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="anim-fade-up anim-delay-2 flex items-center gap-4 px-4 py-3 bg-base-200 border border-base-300 rounded-xl">
                    <div className="flex-1">
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-base-300/60 gap-px">
                            {online      > 0 && <div className="bg-success   transition-all duration-700" style={{ width: `${(online      / targets.length) * 100}%` }}></div>}
                            {maintenance > 0 && <div className="bg-warning   transition-all duration-700" style={{ width: `${(maintenance / targets.length) * 100}%` }}></div>}
                            {offline     > 0 && <div className="bg-error     transition-all duration-700" style={{ width: `${(offline     / targets.length) * 100}%` }}></div>}
                            {unknown     > 0 && <div className="bg-base-content/20 transition-all duration-700" style={{ width: `${(unknown / targets.length) * 100}%` }}></div>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
                        {online      > 0 && <span className="flex items-center gap-1.5 text-success/80"><span className="w-1.5 h-1.5 rounded-full bg-success"></span>{online} {t('stats.onlineLabel')}</span>}
                        {maintenance > 0 && <span className="flex items-center gap-1.5 text-warning/80"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span>{maintenance} {t('stats.maintenanceLabel')}</span>}
                        {offline     > 0 && <span className="flex items-center gap-1.5 text-error/80"><span className="w-1.5 h-1.5 rounded-full bg-error"></span>{offline} {t('stats.offlineLabel')}</span>}
                        {unknown     > 0 && <span className="flex items-center gap-1.5 text-base-content/40"><span className="w-1.5 h-1.5 rounded-full bg-base-content/20"></span>{unknown} {t('stats.unknownLabel')}</span>}
                        <div className="w-px h-3.5 bg-base-300"></div>
                        <span className={`font-bold mono ${offline > 0 ? 'text-error' : parseFloat(globalUptime) >= 99 ? 'text-success' : 'text-warning'}`}>
                            {t('stats.ntUptime', { n: globalUptime ?? '—' })}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { labelKey: 'stats.totalDevices', value: targets.length,
                          sub: maintenance > 0 ? t('stats.nInMaintenance', { n: maintenance }) : t('stats.allMonitored'),
                          subCls: maintenance > 0 ? 'text-warning/70' : 'text-base-content/25',
                          cls: 'text-base-content', icon: 'fa-server', bg: 'bg-primary/10', ic: 'text-primary', border: 'border-t-primary/60' },
                        { labelKey: 'stats.onlineLabel', value: online,
                          sub: globalUptime ? t('stats.nFleetUptime', { n: globalUptime }) : t('stats.noPingData'),
                          subCls: 'text-base-content/30',
                          cls: 'text-success', icon: 'fa-check-circle', bg: 'bg-success/10', ic: 'text-success', border: 'border-t-success/60' },
                        { labelKey: 'stats.offlineLabel', value: offline,
                          sub: offline > 0 ? t('stats.requiresAttention') : t('stats.allClear'),
                          subCls: offline > 0 ? 'text-error/60' : 'text-base-content/25',
                          cls: offline > 0 ? 'text-error' : 'text-base-content/35',
                          icon: 'fa-times-circle', bg: offline > 0 ? 'bg-error/10' : 'bg-base-300/50', ic: offline > 0 ? 'text-error' : 'text-base-content/25', border: offline > 0 ? 'border-t-error/60' : 'border-t-base-300' },
                        { labelKey: 'stats.maintenanceLabel', value: maintenance,
                          sub: maintenance > 0 ? t('stats.excludedFromStats') : t('stats.nonePaused'),
                          subCls: maintenance > 0 ? 'text-warning/60' : 'text-base-content/25',
                          cls: maintenance > 0 ? 'text-warning' : 'text-base-content/35',
                          icon: 'fa-pause', bg: 'bg-warning/10', ic: 'text-warning', border: 'border-t-warning/60' },
                        { labelKey: 'stats.avgLatencyCard', value: globalLatency ? `${globalLatency} ms` : '—',
                          sub: globalLatency == null ? t('stats.noDataYet') : globalLatency < 50 ? t('stats.fast') : globalLatency < 150 ? t('stats.moderate') : t('stats.slowCheckTargets'),
                          subCls: globalLatency == null ? 'text-base-content/25' : globalLatency < 50 ? 'text-success/60' : globalLatency < 150 ? 'text-warning/60' : 'text-error/60',
                          cls: 'text-primary', icon: 'fa-tachometer-alt', bg: 'bg-primary/10', ic: 'text-primary', border: 'border-t-primary/60' },
                        { labelKey: 'stats.fleetUptimeCard', value: globalUptime ? `${globalUptime}%` : '—',
                          sub: globalUptime == null ? t('stats.noDataYet') : parseFloat(globalUptime) >= 99 ? t('stats.excellent') : parseFloat(globalUptime) >= 90 ? t('stats.good') : t('stats.needsImprovement'),
                          subCls: globalUptime == null ? 'text-base-content/25' : parseFloat(globalUptime) >= 99 ? 'text-success/60' : parseFloat(globalUptime) >= 90 ? 'text-warning/60' : 'text-error/60',
                          cls: uptimeCls, icon: 'fa-arrow-up', bg: 'bg-success/10', ic: 'text-success', border: 'border-t-success/60' },
                    ].map((c, i) => (
                        <div key={c.labelKey} className={`stat-card anim-fade-up anim-delay-${i + 1} bg-base-200 border border-base-300 border-t-2 ${c.border} rounded-xl p-4 flex items-center gap-3`}>
                            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                                <i className={`fas ${c.icon} ${c.ic} text-lg`}></i>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className={`text-2xl font-bold tabular-nums mono leading-none ${c.cls}`}>{c.value}</div>
                                <div className="text-xs text-base-content/45 mt-0.5 font-medium leading-tight">{t(c.labelKey)}</div>
                                {c.sub && <div className={`text-[10px] mt-0.5 leading-tight ${c.subCls}`}>{c.sub}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="anim-fade-up anim-delay-4 grid grid-cols-2 gap-4">
                    <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('stats.statusDistribution')}</h2>
                        </div>
                        {pieData.length === 0 ? (
                            <div className="flex items-center justify-center h-36 text-base-content/30 text-sm">{t('stats.noDataYet')}</div>
                        ) : (
                            <div className="flex items-center gap-8">
                                <ResponsiveContainer width={160} height={160}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-3 flex-1">
                                    {pieData.map(d => (
                                        <div key={d.name} className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                                            <span className="text-sm text-base-content/60 flex-1">{t('stats.' + d.name.toLowerCase() + 'Label')}</span>
                                            <span className="text-sm font-bold mono tabular-nums" style={{ color: d.color }}>{d.value}</span>
                                            <span className="text-[10px] text-base-content/30 w-8 text-right">
                                                {Math.round(d.value / targets.length * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('stats.fleetHealth')}</h2>
                        </div>
                        <div className="space-y-3">
                            {[
                                { labelKey: 'stats.averageLatency',     value: globalLatency ? `${globalLatency} ms` : '—', cls: 'text-primary' },
                                { labelKey: 'stats.averageUptime',      value: globalUptime  ? `${globalUptime}%`    : '—', cls: uptimeCls },
                                { labelKey: 'stats.inMaintenanceLabel', value: maintenance,   cls: maintenance > 0 ? 'text-warning'         : 'text-base-content/35' },
                                { labelKey: 'stats.unknownStatus',      value: unknown,       cls: unknown > 0     ? 'text-base-content/60' : 'text-base-content/35' },
                                { labelKey: 'stats.totalPingChecks',   value: totalPings.toLocaleString(),  cls: 'text-base-content' },
                                { labelKey: 'stats.totalFailedChecks', value: totalFailed.toLocaleString(), cls: totalFailed > 0 ? 'text-error' : 'text-base-content/35' },
                            ].map(m => (
                                <div key={m.labelKey} className="flex items-center justify-between gap-4 border-b border-base-300/50 pb-2.5 last:border-0 last:pb-0">
                                    <span className="text-sm text-base-content/50">{t(m.labelKey)}</span>
                                    <span className={`text-sm font-bold mono tabular-nums ${m.cls}`}>{m.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="anim-fade-up anim-delay-5 grid grid-cols-2 gap-4">

                    <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-3.5 rounded-full bg-error/60 flex-shrink-0"></div>
                            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('stats.worstPerformers')}</h2>
                            <span className="text-[10px] text-base-content/25 ms-1">{t('stats.byUptime')}</span>
                        </div>
                        {worstPerformers.length === 0 ? (
                            <div className="flex items-center justify-center h-28 text-base-content/30 text-sm">{t('stats.noPingDataYet')}</div>
                        ) : (
                            <div className="space-y-1">
                                {worstPerformers.map((wp, i) => (
                                    <div key={wp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-base-300/30 transition-colors">
                                        <span className="text-[11px] font-bold text-base-content/20 w-4 flex-shrink-0">#{i + 1}</span>
                                        <StatusDot status={wp.last_status} paused={wp.is_paused} />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-base-content truncate">{wp.name}</div>
                                            <div className="text-[10px] text-base-content/35 font-mono">{wp.ip_address}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0 space-y-0.5">
                                            <div className="text-sm font-bold tabular-nums" style={{ color: pctColor(wp.uptime_percent ?? 0) }}>
                                                {wp.uptime_percent != null ? `${wp.uptime_percent}%` : '—'}
                                            </div>
                                            {wp.avg_response_time != null && (
                                                <div className="text-[10px] text-base-content/35 tabular-nums">
                                                    {wp.avg_response_time} ms
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-3.5 rounded-full bg-success/60 flex-shrink-0"></div>
                            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('stats.topPerformers')}</h2>
                            <span className="text-[10px] text-base-content/25 ms-1">{t('stats.mostReliable')}</span>
                        </div>
                        {bestPerformers.length === 0 ? (
                            <div className="flex items-center justify-center h-28 text-base-content/30 text-sm">{t('stats.needMorePingData')}</div>
                        ) : (
                            <div className="space-y-2">
                                {bestPerformers.map((bp, i) => (
                                    <div key={bp.id} className={`flex items-center gap-3 rounded-xl px-3 py-3 border transition-colors ${
                                        i === 0
                                            ? 'bg-success/8 border-success/20'
                                            : 'bg-base-300/20 border-base-300/50'
                                    }`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black ${
                                            i === 0 ? 'bg-success/20 text-success' : 'bg-base-300 text-base-content/40'
                                        }`}>
                                            {i === 0 ? '★' : `#${i + 1}`}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-base-content truncate">{bp.name}</div>
                                            <div className="text-[10px] text-base-content/35 font-mono">{bp.ip_address}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm font-bold text-success tabular-nums">{bp.uptime_percent}%</div>
                                            {bp.avg_response_time != null && (
                                                <div className="text-[10px] tabular-nums" style={{ color: latColor(bp.avg_response_time) }}>
                                                    {bp.avg_response_time} ms
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="anim-fade-up anim-delay-6 bg-base-200 border border-base-300 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                            <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('stats.perDeviceBreakdown')}</h2>
                        </div>
                        <div className="flex items-center gap-0.5 bg-base-300/60 rounded-lg p-0.5">
                            {tabs.map(tabItem => (
                                <button key={tabItem.id} onClick={() => setActiveTab(tabItem.id)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                                        activeTab === tabItem.id
                                            ? 'bg-primary/15 text-primary shadow-sm'
                                            : 'text-base-content/45 hover:text-base-content'
                                    }`}>
                                    {t(tabItem.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {tab.data.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-base-content/30 text-sm">
                            {t('stats.noDataRunPings')}
                        </div>
                    ) : (
                        <div className="rounded-xl overflow-hidden py-4 px-2" style={{ background: C.bg }}>
                            <ResponsiveContainer width="100%" height={Math.max(200, tab.data.length * 38)}>
                                <BarChart data={tab.data} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 8" stroke={C.grid} horizontal={false} />
                                    <XAxis type="number" tick={{ fill: C.tick, fontSize: 11, fontWeight: 500 }}
                                        tickLine={{ stroke: C.grid }} axisLine={{ stroke: C.axis }} unit={` ${tab.unit}`} />
                                    <YAxis type="category" dataKey="name"
                                        tick={{ fill: C.tick, fontSize: 12, fontWeight: 500 }}
                                        tickLine={false} axisLine={false} width={120} />
                                    <Tooltip content={<BarTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                                    <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={24}>
                                        {tab.data.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                        ))}
                                        <LabelList dataKey="value" position="right"
                                            style={{ fill: C.tick, fontSize: 12, fontWeight: 600 }}
                                            formatter={(v) => `${v}${tab.unit}`} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
