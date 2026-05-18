import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function TargetDetailModal({ target: t, isAdmin, isPinging, onPing, onEdit, onDelete, onChart, onPause, onResume, onClose }) {
    const [history, setHistory]         = useState([]);
    const [histLoading, setHistLoading] = useState(true);
    const [interfaces, setInterfaces]   = useState([]);
    const [ifacesLoading, setIfacesLoading] = useState(false);
    const [quickCommunity, setQuickCommunity] = useState(t.snmp_community || '');
    const [quickSaving, setQuickSaving] = useState(false);
    const prevPinging = useRef(isPinging);

    const fetchHistory = () => {
        setHistLoading(true);
        axios.get(`/api/targets/${t.id}/chart-data`)
            .then(({ data }) => setHistory([...data].reverse().slice(0, 25)))
            .catch(() => {})
            .finally(() => setHistLoading(false));
    };

    useEffect(() => { fetchHistory(); }, [t.id]);

    const fetchInterfaces = async () => {
        setIfacesLoading(true);
        try {
            const { data } = await axios.get(`/api/snmp/${t.id}/interfaces`);
            setInterfaces(data);
        } catch {} finally { setIfacesLoading(false); }
    };

    const discoverInterfaces = async () => {
        setIfacesLoading(true);
        try {
            await axios.post(`/api/snmp/${t.id}/discover`);
            await fetchInterfaces();
        } catch {} finally { setIfacesLoading(false); }
    };

    useEffect(() => {
        if (t.snmp_enabled) fetchInterfaces();
    }, [t.id, t.snmp_enabled]);

    useEffect(() => {
        if (prevPinging.current && !isPinging) fetchHistory();
        prevPinging.current = isPinging;
    }, [isPinging]);

    const loss  = t.total_pings > 0 ? Math.round(t.failed_pings / t.total_pings * 100) : null;
    const lats  = history.filter(h => h.is_success && h.response_time != null).map(h => +h.response_time);
    const maxLat = lats.length ? Math.max(...lats) : 200;

    const latCls = (ms) => {
        if (ms == null) return 'text-base-content/30';
        if (ms < 50)   return 'text-success';
        if (ms < 150)  return 'text-warning';
        return 'text-error';
    };

    const uptimeCls = t.uptime_percent == null ? 'text-base-content/30'
        : t.uptime_percent >= 99 ? 'text-success'
        : t.uptime_percent >= 90 ? 'text-warning'
        : 'text-error';

    const stats = [
        { label: 'Uptime',       value: t.uptime_percent     != null ? `${t.uptime_percent}%`      : '—', cls: uptimeCls },
        { label: 'Avg Latency',  value: t.avg_response_time  != null ? `${t.avg_response_time} ms` : '—', cls: latCls(t.avg_response_time) },
        { label: 'Last Ping',    value: t.last_response_time != null ? `${t.last_response_time} ms`: '—', cls: latCls(t.last_response_time) },
        { label: 'Total Pings',  value: (t.total_pings ?? 0).toLocaleString(),  cls: 'text-base-content' },
        { label: 'Failed',       value: (t.failed_pings ?? 0).toLocaleString(), cls: t.failed_pings > 0 ? 'text-error' : 'text-base-content' },
        { label: 'Packet Loss',  value: loss != null ? `${loss}%` : '—',        cls: loss === 0 ? 'text-success' : loss != null && loss <= 5 ? 'text-warning' : 'text-error' },
    ];

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="modal-enter bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
                style={{ maxHeight: '88vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between px-6 py-4 border-b border-base-300 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            t.is_paused             ? 'bg-warning/15 border border-warning/25' :
                            t.last_status === true  ? 'bg-success/15 border border-success/25' :
                            t.last_status === false ? 'bg-error/15  border border-error/25'   :
                                                      'bg-base-300  border border-base-300'
                        }`}>
                            <i className={`fas fa-server text-sm ${
                                t.is_paused             ? 'text-warning/70' :
                                t.last_status === true  ? 'text-success' :
                                t.last_status === false ? 'text-error'   :
                                                          'text-base-content/40'
                            }`}></i>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-base text-base-content leading-none">{t.name}</h3>
                                    <StatusBadge status={t.last_status} isPaused={t.is_paused} />
                                </div>
                                {isAdmin && (t.is_paused ? (
                                    <button
                                        onClick={() => onResume(t)}
                                        className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-success/80 border border-success/25 rounded-lg hover:bg-success/10 hover:text-success transition-all flex-shrink-0"
                                    >
                                        <i className="fas fa-play text-xs"></i>
                                        Resume
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onPause(t)}
                                        className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-warning/70 border border-warning/20 rounded-lg hover:bg-warning/10 hover:text-warning transition-all flex-shrink-0"
                                    >
                                        <i className="fas fa-pause text-xs"></i>
                                        Maintenance
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                <code className="ip-code text-[10px]">{t.ip_address}</code>
                                {t.location && (
                                    <span className="flex items-center gap-1 text-[11px] text-base-content/50">
                                        <i className="fas fa-map-marker-alt text-[9px] text-base-content/30"></i>
                                        {t.location}
                                    </span>
                                )}
                            </div>
                            {t.groups?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {t.groups.map(g => (
                                        <span key={g.id}
                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border"
                                            style={{ backgroundColor: `${g.color}20`, color: g.color, borderColor: `${g.color}45` }}
                                        >{g.name}</span>
                                    ))}
                                </div>
                            )}
                            {t.created_at && (
                                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-base-content/30">
                                    <i className="fas fa-calendar-plus text-[9px]"></i>
                                    Added {new Date(t.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                            )}
                            {t.notes && (
                                <div className="mt-2 px-3 py-2 bg-base-300/40 border border-base-300/60 rounded-lg">
                                    <p className="text-[11px] text-base-content/55 leading-relaxed">{t.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors flex-shrink-0 ml-2"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-base-300 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-2">
                        {stats.map(s => (
                            <div key={s.label} className="bg-base-300/50 rounded-xl p-3 text-center">
                                <div className={`text-base font-bold tabular-nums mono ${s.cls}`}>{s.value}</div>
                                <div className="text-[10px] text-base-content/40 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {t.is_paused && (
                    <div className="mx-6 mt-0 px-4 py-3 rounded-xl bg-warning/10 border border-warning/25 flex items-center gap-3 flex-shrink-0">
                        <i className="fas fa-tools text-warning text-sm flex-shrink-0"></i>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-warning leading-none">Maintenance Mode Active</p>
                            <p className="text-xs text-base-content/50 mt-1">Excluded from auto-polling. Manual pings still allowed.</p>
                        </div>
                    </div>
                )}

                {(t.warn_ms || t.critical_ms) && (
                    <div className="px-6 py-3 border-b border-base-300 flex-shrink-0">
                        <div className="flex items-center justify-between">
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
                            {t.threshold_status && t.threshold_status !== 'ok' && (
                                <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                    t.threshold_status === 'critical'
                                        ? 'bg-error/15 text-error border-error/30'
                                        : 'bg-warning/15 text-warning border-warning/30'
                                }`}>
                                    <i className="fas fa-exclamation-triangle text-[9px]"></i>
                                    {t.threshold_status === 'critical' ? 'CRITICAL' : 'WARNING'}
                                </span>
                            )}
                            {t.threshold_status === 'ok' && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/25">
                                    <i className="fas fa-check text-[9px]"></i>
                                    Normal
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {!t.snmp_enabled && isAdmin && (
                    <div className="px-6 py-3 border-b border-base-300 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-network-wired text-[9px]"></i>
                                SNMP Interfaces
                            </span>
                            <button onClick={() => { onEdit(t); onClose(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all">
                                <i className="fas fa-cog text-[9px]"></i>
                                Configure SNMP
                            </button>
                        </div>
                        <p className="text-[11px] text-base-content/30 py-2">SNMP not enabled. Click Configure to set up.</p>
                    </div>
                )}
                {t.snmp_enabled && (
                    <div className="px-6 py-3 border-b border-base-300 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fas fa-network-wired text-[9px]"></i>
                                SNMP Interfaces
                            </span>
                            <div className="flex items-center gap-2">
                                {interfaces.length === 0 && !ifacesLoading && (
                                    <button onClick={discoverInterfaces}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all">
                                        <i className="fas fa-search text-[8px]"></i>
                                        Discover
                                    </button>
                                )}
                                {ifacesLoading && (
                                    <span className="loading loading-spinner loading-xs text-primary"></span>
                                )}
                            </div>
                        </div>
                        {ifacesLoading && interfaces.length === 0 ? (
                            <p className="text-[11px] text-base-content/30 py-2 text-center">Discovering…</p>
                        ) : interfaces.length === 0 ? (
                            <p className="text-[11px] text-base-content/30 py-2">No interfaces discovered yet.</p>
                        ) : (
                            <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                                {interfaces.map((iface) => (
                                    <div key={iface.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-base-300/30 transition-colors">
                                        {iface.is_up ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0"></span>
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0"></span>
                                        )}
                                        <span className="mono text-[10px] text-base-content/50 w-6 flex-shrink-0">{iface.snmp_index}</span>
                                        <span className="text-[11px] text-base-content flex-1 truncate">{iface.name}</span>
                                        <span className={`text-[9px] font-semibold tabular-nums ${iface.is_up ? 'text-success/70' : 'text-error/70'}`}>
                                            {iface.is_up ? 'UP' : 'DOWN'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider">Recent Activity</h4>
                        {!histLoading && (
                            <span className="text-[10px] text-base-content/30 tabular-nums">{history.length} checks</span>
                        )}
                    </div>

                    {histLoading ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-md text-base-content/20"></span>
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-center text-sm text-base-content/30 py-8">No history yet</p>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {history.map((h, idx) => (
                                <div key={idx} className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-base-300/40 transition-colors group">
                                    {h.is_success ? (
                                        <span className="w-2 h-2 rounded-full bg-success flex-shrink-0"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-error flex-shrink-0"></span>
                                    )}
                                    <span className="mono text-[11px] text-base-content/40 tabular-nums w-20 flex-shrink-0">
                                        {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className={`mono text-xs font-semibold tabular-nums w-20 flex-shrink-0 ${h.is_success ? latCls(h.response_time) : 'text-error/70'}`}>
                                        {h.is_success && h.response_time != null ? `${h.response_time} ms` : 'Timeout'}
                                    </span>
                                    {h.is_success && h.response_time != null ? (
                                        <div className="flex-1 h-1 bg-base-300 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${+h.response_time < 50 ? 'bg-success' : +h.response_time < 150 ? 'bg-warning' : 'bg-error'}`}
                                                style={{ width: `${Math.min(100, (+h.response_time / maxLat) * 100)}%` }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 h-1 bg-error/15 rounded-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-base-300 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPing(t)}
                            disabled={isPinging}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary/15 text-primary border border-primary/25 rounded-lg hover:bg-primary/25 disabled:opacity-40 transition-all"
                        >
                            <i className={`fas ${isPinging ? 'fa-spinner fa-spin' : 'fa-satellite-dish'} text-xs`}></i>
                            {isPinging ? 'Pinging…' : 'Ping Now'}
                        </button>
                        <button
                            onClick={() => { onChart(t); onClose(); }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-warning/80 border border-warning/20 rounded-lg hover:bg-warning/10 hover:text-warning transition-all"
                        >
                            <i className="fas fa-chart-line text-xs"></i>
                            Full Chart
                        </button>
                        {t.snmp_enabled && interfaces.length > 0 && (
                            <button onClick={fetchInterfaces}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-info/80 border border-info/20 rounded-lg hover:bg-info/10 hover:text-info transition-all">
                                <i className="fas fa-sync text-xs"></i>
                                Poll
                            </button>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { onEdit(t); onClose(); }}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-base-content/55 border border-base-300 rounded-lg hover:bg-base-300 hover:text-base-content transition-all"
                            >
                                <i className="fas fa-pen text-xs"></i>
                                Edit
                            </button>
                            <button
                                onClick={() => { onDelete(t); onClose(); }}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-error/70 border border-error/20 rounded-lg hover:bg-error/10 hover:text-error transition-all"
                            >
                                <i className="fas fa-trash text-xs"></i>
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status, isPaused }) {
    if (isPaused) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/15 text-warning border border-warning/30">
            <i className="fas fa-pause text-[8px]"></i>
            Maintenance
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
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            Offline
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-base-300 text-base-content/40">
            <span className="w-1.5 h-1.5 rounded-full bg-base-content/25"></span>
            Unknown
        </span>
    );
}
