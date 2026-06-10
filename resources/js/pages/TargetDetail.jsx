import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import Gauge from '../components/Gauge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function TargetDetail() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'config_manager';
    const { toast } = useToast();

    const pathParts = window.location.pathname.split('/');
    const targetId = parseInt(pathParts[pathParts.length - 1], 10);

    const [target, setTarget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [systemData, setSystemData] = useState(null);
    const [sysLoading, setSysLoading] = useState(false);
    const [storageData, setStorageData] = useState([]);
    const [storageLoading, setStorageLoading] = useState(false);
    const [pinging, setPinging] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);
    const [isDark, setIsDark] = useState(
        () => (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light'
    );

    useEffect(() => {
        if (!targetId || isNaN(targetId)) {
            setError('Invalid target ID');
            setLoading(false);
            return;
        }
        axios.get('/api/targets')
            .then(({ data }) => {
                const t = data.find(x => x.id === targetId);
                if (t) {
                    setTarget(t);
                } else {
                    setError('Target not found');
                }
            })
            .catch(() => setError('Failed to load target'))
            .finally(() => setLoading(false));
    }, [targetId]);

    const fetchSystem = async () => {
        try {
            const { data } = await axios.get(`/api/snmp/${targetId}/system`);
            setSystemData(data);
        } catch {}
    };

    useEffect(() => {
        if (target?.snmp_enabled) {
            fetchSystem();
            const id = setInterval(fetchSystem, 5000);
            return () => clearInterval(id);
        }
    }, [target?.snmp_enabled, targetId]);

    const fetchStorage = async () => {
        setStorageLoading(true);
        try {
            const { data } = await axios.get(`/api/snmp/${targetId}/storage`);
            setStorageData(data);
        } catch {} finally { setStorageLoading(false); }
    };

    useEffect(() => {
        if (target?.snmp_enabled) fetchStorage();
    }, [target?.snmp_enabled, targetId]);

    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDark((document.documentElement.getAttribute('data-theme') || 'dark') !== 'light')
        );
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const fetchChartData = () => {
        setChartLoading(true);
        axios.get(`/api/targets/${targetId}/chart-data`)
            .then(res => {
                setChartData(res.data.map((d, i) => ({
                    i: i + 1,
                    time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    latency: d.is_success && d.response_time != null ? +d.response_time : null,
                    offlineMark: !d.is_success ? 0 : null,
                    success: d.is_success,
                })));
            })
            .finally(() => setChartLoading(false));
    };

    useEffect(() => { if (target) fetchChartData(); }, [target?.id]);

    const pingTarget = async () => {
        setPinging(true);
        try {
            await axios.post(`/targets/${targetId}/ping`);
            const { data } = await axios.get('/api/targets');
            const t = data.find(x => x.id === targetId);
            if (t) setTarget(t);
            fetchChartData();
        } catch {} finally { setPinging(false); }
    };

    const pauseTarget = async () => {
        try {
            await axios.post(`/targets/${targetId}/pause`);
            const { data } = await axios.get('/api/targets');
            const t = data.find(x => x.id === targetId);
            if (t) setTarget(t);
            toast('Target paused', 'success');
        } catch { toast('Failed to pause', 'error'); }
    };

    const resumeTarget = async () => {
        try {
            await axios.post(`/targets/${targetId}/resume`);
            const { data } = await axios.get('/api/targets');
            const t = data.find(x => x.id === targetId);
            if (t) setTarget(t);
            toast('Target resumed', 'success');
        } catch { toast('Failed to resume', 'error'); }
    };

    const deleteTarget = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/targets/${targetId}`);
            toast('Target deleted', 'success');
            window.location.href = '/monitoring';
        } catch { toast('Failed to delete', 'error'); }
        finally { setDeleting(false); setShowDeleteConfirm(false); }
    };

    const formatBytes = (b) => {
        if (!b) return '—';
        const k = 1024, s = ['B','KB','MB','GB','TB'];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), s.length - 1);
        return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );

    if (error || !target) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <i className="fas fa-exclamation-triangle text-4xl text-warning"></i>
            <p className="text-base-content/50">{error || 'Target not found'}</p>
            <a href="/monitoring" className="btn btn-primary btn-sm">Back to Dashboard</a>
        </div>
    );

    const t = target;
    const loss = t.total_pings > 0 ? Math.round(t.failed_pings / t.total_pings * 100) : null;

    const latCls = (ms) => {
        if (ms == null) return 'text-base-content/30';
        if (ms < 50) return 'text-success';
        if (ms < 150) return 'text-warning';
        return 'text-error';
    };

    const uptimeCls = t.uptime_percent == null ? 'text-base-content/30'
        : t.uptime_percent >= 99 ? 'text-success'
        : t.uptime_percent >= 90 ? 'text-warning'
        : 'text-error';

    const stats = [
        { label: 'Uptime', value: t.uptime_percent != null ? `${t.uptime_percent}%` : '—', cls: uptimeCls },
        { label: 'Avg Latency', value: t.avg_response_time != null ? `${t.avg_response_time} ms` : '—', cls: latCls(t.avg_response_time) },
        { label: 'Last Ping', value: t.last_response_time != null ? `${t.last_response_time} ms` : '—', cls: latCls(t.last_response_time) },
        { label: 'Total Pings', value: (t.total_pings ?? 0).toLocaleString(), cls: 'text-base-content' },
        { label: 'Failed', value: (t.failed_pings ?? 0).toLocaleString(), cls: t.failed_pings > 0 ? 'text-error' : 'text-base-content' },
        { label: 'Packet Loss', value: loss != null ? `${loss}%` : '—', cls: loss === 0 ? 'text-success' : loss != null && loss <= 5 ? 'text-warning' : 'text-error' },
    ];

    const chartLatencies = chartData.filter(d => d.latency != null).map(d => d.latency);
    const chartAvg = chartLatencies.length ? (chartLatencies.reduce((a, b) => a + b, 0) / chartLatencies.length).toFixed(1) : null;
    const chartMin = chartLatencies.length ? Math.min(...chartLatencies).toFixed(1) : null;
    const chartMax = chartLatencies.length ? Math.max(...chartLatencies).toFixed(1) : null;
    const chartOnline = chartData.filter(d => d.success).length;
    const chartUptime = chartData.length ? Math.round(chartOnline / chartData.length * 100) : null;
    const uptimeColor = chartUptime == null ? 'text-base-content/30' : chartUptime >= 99 ? 'text-success' : chartUptime >= 90 ? 'text-warning' : 'text-error';

    const chartColors = isDark ? {
        tickLabel: '#c9cdd6', tickFaint: 'rgba(255,255,255,0.18)', axisLine: 'rgba(255,255,255,0.12)',
        grid: 'rgba(255,255,255,0.06)', refStroke: 'rgba(255,255,255,0.20)', refLabel: 'rgba(255,255,255,0.50)', cursor: 'rgba(255,255,255,0.10)',
    } : {
        tickLabel: '#374151', tickFaint: 'rgba(0,0,0,0.20)', axisLine: 'rgba(0,0,0,0.15)',
        grid: 'rgba(0,0,0,0.07)', refStroke: 'rgba(0,0,0,0.20)', refLabel: 'rgba(0,0,0,0.45)', cursor: 'rgba(0,0,0,0.06)',
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <a href="/monitoring"
                        className="w-9 h-9 rounded-xl bg-base-300/50 border border-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all">
                        <i className="fas fa-arrow-left text-sm"></i>
                    </a>
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            t.is_paused ? 'bg-warning/15 border border-warning/25' :
                            t.last_status === true ? 'bg-success/15 border border-success/25' :
                            t.last_status === false ? 'bg-error/15 border border-error/25' :
                            'bg-base-300 border border-base-300'
                        }`}>
                            <i className={`fas fa-server text-base ${
                                t.is_paused ? 'text-warning/70' :
                                t.last_status === true ? 'text-success' :
                                t.last_status === false ? 'text-error' :
                                'text-base-content/40'
                            }`}></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-base-content">{t.name}</h1>
                                <StatusBadge status={t.last_status} isPaused={t.is_paused} />
                            </div>
                            <div className="flex items-center gap-2.5 mt-0.5">
                                <code className="ip-code text-xs">{t.ip_address}</code>
                                {t.location && (
                                    <span className="flex items-center gap-1 text-xs text-base-content/50">
                                        <i className="fas fa-map-marker-alt text-[10px] text-base-content/30"></i>
                                        {t.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={pingTarget} disabled={pinging}
                        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-primary/15 text-primary border border-primary/25 rounded-xl hover:bg-primary/25 disabled:opacity-40 transition-all">
                        <i className={`fas ${pinging ? 'fa-spinner fa-spin' : 'fa-satellite-dish'} text-xs`}></i>
                        {pinging ? 'Pinging…' : 'Ping'}
                    </button>
                    {t.is_paused ? (
                        <button onClick={resumeTarget}
                            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-success/80 border border-success/25 rounded-xl hover:bg-success/10 hover:text-success transition-all">
                            <i className="fas fa-play text-xs"></i>
                            Resume
                        </button>
                    ) : (
                        <button onClick={pauseTarget}
                            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-warning/70 border border-warning/20 rounded-xl hover:bg-warning/10 hover:text-warning transition-all">
                            <i className="fas fa-pause text-xs"></i>
                            Pause
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-error/70 border border-error/20 rounded-xl hover:bg-error/10 hover:text-error transition-all">
                            <i className="fas fa-trash text-xs"></i>
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {t.is_paused && (
                <div className="mb-6 px-4 py-3 rounded-xl bg-warning/10 border border-warning/25 flex items-center gap-3">
                    <i className="fas fa-tools text-warning text-sm flex-shrink-0"></i>
                    <div>
                        <p className="text-sm font-semibold text-warning">Maintenance Mode Active</p>
                        <p className="text-xs text-base-content/50 mt-0.5">Excluded from auto-polling. Manual pings still allowed.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 mb-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-base-300/50 rounded-xl p-3.5 text-center">
                        <div className={`text-lg font-bold tabular-nums mono ${s.cls}`}>{s.value}</div>
                        <div className="text-[10px] text-base-content/40 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
                    </div>
                ))}
            </div>

            {(t.warn_ms || t.critical_ms) && (
                <div className="mb-6 px-5 py-3 rounded-xl bg-base-300/30 border border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider">Thresholds</span>
                        {t.warn_ms && (
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0"></span>
                                <span className="text-base-content/50">Warn</span>
                                <span className="font-bold text-warning mono">≥ {t.warn_ms} ms</span>
                            </span>
                        )}
                        {t.critical_ms && (
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-error flex-shrink-0"></span>
                                <span className="text-base-content/50">Critical</span>
                                <span className="font-bold text-error mono">≥ {t.critical_ms} ms</span>
                            </span>
                        )}
                    </div>
                    {t.threshold_status && (
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                            t.threshold_status === 'critical' ? 'bg-error/15 text-error border-error/30' :
                            t.threshold_status === 'warning' ? 'bg-warning/15 text-warning border-warning/30' :
                            'bg-success/10 text-success border-success/25'
                        }`}>
                            <i className={`fas ${t.threshold_status === 'ok' ? 'fa-check' : 'fa-exclamation-triangle'} text-[9px]`}></i>
                            {t.threshold_status === 'critical' ? 'CRITICAL' : t.threshold_status === 'warning' ? 'WARNING' : 'Normal'}
                        </span>
                    )}
                </div>
            )}

            {t.snmp_enabled && (
                <div className="bg-base-200 border border-base-300 rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="fas fa-microchip text-[9px]"></i>
                            System Resources
                        </span>
                        {sysLoading && <span className="loading loading-spinner loading-xs text-primary"></span>}
                    </div>
                    {systemData ? (
                        <div className="flex items-center justify-center gap-8 py-2">
                            <Gauge value={systemData.cpu_load ?? 0} label="CPU" size={130} />
                            <Gauge value={systemData.ram_total ? Math.round((systemData.ram_used / systemData.ram_total) * 100) : 0} label="RAM" size={130} />
                        </div>
                    ) : (
                        <p className="text-[11px] text-base-content/30 py-4 text-center">No system data yet.</p>
                    )}
                </div>
            )}

            {t.snmp_enabled && (
                <div className="bg-base-200 border border-base-300 rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="fas fa-hdd text-[9px]"></i>
                            Storage
                        </span>
                        {storageLoading && <span className="loading loading-spinner loading-xs text-primary"></span>}
                    </div>
                    {storageLoading && storageData.length === 0 ? (
                        <p className="text-[11px] text-base-content/30 py-4 text-center">Loading storage info…</p>
                    ) : storageData.length === 0 ? (
                        <p className="text-[11px] text-base-content/30 py-4 text-center">No storage data available.</p>
                    ) : (
                        <div className="space-y-3">
                            {storageData.map((d, i) => (
                                <div key={i} className="bg-base-300/40 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-lg bg-base-300 flex items-center justify-center text-[11px] font-bold text-base-content/50">{d.label.replace(':', '')}</span>
                                            <span className="text-sm font-semibold text-base-content">{d.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs tabular-nums text-base-content/50">
                                                {formatBytes(d.used)} / {formatBytes(d.total)}
                                            </span>
                                            {d.filesystem && (
                                                <span className="ml-2 text-[9px] font-mono text-base-content/30">{d.filesystem}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-base-300 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${d.pct}%`,
                                                background: d.pct >= 90 ? '#ef4444' : d.pct >= 70 ? '#eab308' : '#22c55e',
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className={`text-[10px] font-semibold tabular-nums ${d.pct >= 90 ? 'text-error' : d.pct >= 70 ? 'text-warning' : 'text-success'}`}>
                                            {d.pct}% used
                                        </span>
                                        <span className="text-[10px] text-base-content/30 tabular-nums">{formatBytes(d.free)} free</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!t.snmp_enabled && isAdmin && (
                <div className="bg-base-200 border border-base-300 rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="fas fa-network-wired text-[9px]"></i>
                            SNMP
                        </span>
                        <a href="/monitoring"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all">
                            <i className="fas fa-cog text-[9px]"></i>
                            Configure in Dashboard
                        </a>
                    </div>
                    <p className="text-[11px] text-base-content/30 py-2">SNMP is not enabled. Go to Dashboard to configure.</p>
                </div>
            )}

            <div className="bg-base-200 border border-base-300 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fas fa-chart-line text-[9px]"></i>
                        Latency History
                    </span>
                    {!chartLoading && <span className="text-[10px] text-base-content/30 tabular-nums">{chartData.length} checks</span>}
                </div>
                {chartLoading ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-sm text-base-content/20"></span>
                    </div>
                ) : chartData.length === 0 ? (
                    <p className="text-center text-sm text-base-content/30 py-8">No ping history yet.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-4 gap-3 mb-4">
                            {[
                                { label: 'Uptime', value: chartUptime != null ? `${chartUptime}%` : '—', cls: uptimeColor },
                                { label: 'Avg',    value: chartAvg ? `${chartAvg} ms` : '—', cls: 'text-primary' },
                                { label: 'Min',    value: chartMin ? `${chartMin} ms` : '—', cls: 'text-success' },
                                { label: 'Max',    value: chartMax ? `${chartMax} ms` : '—', cls: 'text-warning' },
                            ].map(s => (
                                <div key={s.label} className="bg-base-300/60 rounded-xl p-3 text-center">
                                    <div className={`text-lg font-bold tabular-nums mono ${s.cls}`}>{s.value}</div>
                                    <div className="text-[10px] text-base-content/40 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-base-300/60 overflow-hidden py-4 px-2 mb-4" style={{ background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.02)' }}>
                            <ResponsiveContainer width="100%" height={260}>
                                <ComposedChart data={chartData} margin={{ top: 6, right: 20, bottom: 2, left: 8 }}>
                                    <defs>
                                        <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.40} />
                                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 8" stroke={chartColors.grid} vertical={false} />
                                    <XAxis dataKey="time" tick={{ fill: chartColors.tickLabel, fontSize: 11, fontWeight: 500 }}
                                        tickLine={{ stroke: chartColors.tickFaint }} axisLine={{ stroke: chartColors.axisLine }}
                                        interval="preserveStartEnd" dy={6} />
                                    <YAxis tick={{ fill: chartColors.tickLabel, fontSize: 11, fontWeight: 500 }}
                                        tickLine={{ stroke: chartColors.tickFaint }} axisLine={{ stroke: chartColors.axisLine }}
                                        unit=" ms" domain={[0, 'auto']} width={58} dx={-2} />
                                    {chartAvg && (
                                        <ReferenceLine y={parseFloat(chartAvg)} stroke={chartColors.refStroke}
                                            strokeDasharray="5 4" strokeWidth={1.5}
                                            label={{ value: `avg ${chartAvg} ms`, fill: chartColors.refLabel, fontSize: 10, fontWeight: 600, position: 'insideTopRight' }} />
                                    )}
                                    <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: chartColors.cursor, strokeWidth: 24 }} />
                                    <Area type="monotone" dataKey="latency" stroke="var(--color-primary)" strokeWidth={2}
                                        fill="url(#latGrad)" dot={false}
                                        activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: isDark ? '#1e2028' : '#ffffff', strokeWidth: 2 }}
                                        connectNulls={false} />
                                    <Line type="monotone" dataKey="offlineMark" stroke="none" strokeWidth={0}
                                        dot={(props) => {
                                            if (props.payload.offlineMark == null) return null;
                                            return (
                                                <g key={props.key}>
                                                    <circle cx={props.cx} cy={props.cy} r={7} fill="var(--color-error)" opacity={0.15} />
                                                    <circle cx={props.cx} cy={props.cy} r={3.5} fill="var(--color-error)" />
                                                </g>
                                            );
                                        }}
                                        activeDot={false} isAnimationActive={false} legendType="none" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-end gap-3 mb-3">
                            <span className="flex items-center gap-1.5 text-[11px] text-base-content/35">
                                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-error)', opacity: 0.8 }}></span>
                                Offline
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                            {chartData.slice(-50).reverse().map((d, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-base-300/40 transition-colors">
                                    {d.success ? (
                                        <span className="w-2 h-2 rounded-full bg-success flex-shrink-0"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-error flex-shrink-0"></span>
                                    )}
                                    <span className="mono text-[11px] text-base-content/40 tabular-nums w-24 flex-shrink-0">{d.time}</span>
                                    <span className={`mono text-xs font-semibold tabular-nums ${d.success && d.latency != null ? latCls(d.latency) : 'text-error/70'}`}>
                                        {d.success && d.latency != null ? `${d.latency} ms` : 'Timeout'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-base-200 border border-base-300 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-base-content mb-2">Delete Target</h3>
                        <p className="text-sm text-base-content/60 mb-5">Are you sure you want to delete <strong>{t.name}</strong>? This cannot be undone.</p>
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium rounded-xl border border-base-300 hover:bg-base-300 transition-all">Cancel</button>
                            <button onClick={deleteTarget} disabled={deleting}
                                className="px-4 py-2 text-sm font-medium rounded-xl bg-error/15 text-error border border-error/30 hover:bg-error/25 disabled:opacity-40 transition-all">
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status, isPaused }) {
    if (isPaused) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/15 text-warning border border-warning/30">
            <i className="fas fa-pause text-[8px]"></i> Maintenance
        </span>
    );
    if (status === true) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/25">
            <span className="relative flex h-1.5 w-1.5">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            Online
        </span>
    );
    if (status === false) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/15 text-error border border-error/25">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Offline
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-base-300 text-base-content/40">
            <span className="w-1.5 h-1.5 rounded-full bg-base-content/25"></span> Unknown
        </span>
    );
}

function CustomChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
        <div className="bg-base-300 border border-base-content/15 rounded-xl px-3 py-2.5 text-xs shadow-2xl">
            <div className="text-base-content/50 mb-1.5 font-medium tabular-nums">{d.time}</div>
            {d.latency != null
                ? <div className="text-primary font-bold tabular-nums">{d.latency} ms</div>
                : <div className="text-error font-bold">Offline</div>}
        </div>
    );
}
