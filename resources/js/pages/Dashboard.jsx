import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import StatsBar from '../components/StatsBar';
import TargetTable from '../components/TargetTable';
import AddModal from '../components/AddModal';
import EditModal from '../components/EditModal';
import ChartModal from '../components/ChartModal';
import DeleteModal from '../components/DeleteModal';
import GroupManagerModal from '../components/GroupManagerModal';
import TargetDetailModal from '../components/TargetDetailModal';
import { useAuth } from '../contexts/AuthContext';

const LS_AUTO     = 'argusnet_auto';
const LS_INTERVAL = 'argusnet_interval';
const LS_NEXT     = 'argusnet_next_ping';

function readLS(key, fallback) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
}

export default function Dashboard({ targets, setTargets, fetchTargets, loading }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [groups, setGroups]                 = useState([]);
    const [selectedGroup, setSelectedGroup]   = useState(null);
    const [pinging, setPinging]               = useState({});
    const [pingAllLoading, setPingAllLoading] = useState(false);
    const [autoRefresh, setAutoRefresh]       = useState(() => readLS(LS_AUTO, false));
    const [interval_, setInterval_]           = useState(() => readLS(LS_INTERVAL, 60));
    const [countdown, setCountdown]           = useState(0);
    const [showAdd, setShowAdd]               = useState(false);
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [detailTargetId, setDetailTargetId] = useState(null);
    const [editTarget, setEditTarget]         = useState(null);
    const [chartTarget, setChartTarget]       = useState(null);
    const [deleteTarget, setDeleteTarget]     = useState(null);
    const [lastUpdated, setLastUpdated]       = useState(null);
    const [tick, setTick]                     = useState(0);

    const timerRef      = useRef(null);
    const cdownRef      = useRef(null);
    const inProgressRef = useRef(false);
    const targetsRef    = useRef(targets);
    targetsRef.current  = targets;

    const timeAgoShort = (dateStr) => {
        if (!dateStr) return '—';
        const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        return `${Math.floor(diff / 3600)}h`;
    };

    const sentinelRef = useRef(null);
    const [showFloatAlert, setShowFloatAlert] = useState(false);
    const [expandedFloat, setExpandedFloat] = useState(false);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => setShowFloatAlert(!entry.isIntersecting),
            { threshold: 0 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => { fetchTargets(); fetchGroups(); }, []);

    useEffect(() => {
        if (targets.length > 0) {
            const dates = targets.map(t => t.last_ping_at).filter(Boolean).map(d => new Date(d).getTime());
            const latest = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
            setLastUpdated(latest);
        }
    }, [targets]);

    useEffect(() => {
        if (!lastUpdated || pingAllLoading) return;
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [lastUpdated, pingAllLoading]);

    useEffect(() => {
        clearInterval(timerRef.current);
        clearInterval(cdownRef.current);
        if (!autoRefresh) { setCountdown(0); return; }

        const storedNext = readLS(LS_NEXT, 0);
        const remaining  = Math.ceil((storedNext - Date.now()) / 1000);
        const initial    = remaining > 0 && remaining <= interval_ ? remaining : interval_;
        setCountdown(initial);

        cdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? interval_ : c - 1), 1000);

        const scheduleNext = () => {
            if (inProgressRef.current) {
                timerRef.current = setTimeout(scheduleNext, 3000);
                return;
            }
            localStorage.setItem(LS_NEXT, JSON.stringify(Date.now() + interval_ * 1000));
            pingAll(true);
        };
        const firstDelay = initial < interval_ ? initial * 1000 : interval_ * 1000;
        const firstTimer = setTimeout(() => {
            scheduleNext();
            timerRef.current = setInterval(scheduleNext, interval_ * 1000);
        }, firstDelay);

        return () => { clearTimeout(firstTimer); clearInterval(timerRef.current); clearInterval(cdownRef.current); };
    }, [autoRefresh, interval_]);

    const toggleAutoRefresh = () => {
        setAutoRefresh(prev => {
            const next = !prev;
            localStorage.setItem(LS_AUTO, JSON.stringify(next));
            if (next) localStorage.setItem(LS_NEXT, JSON.stringify(Date.now() + interval_ * 1000));
            else localStorage.removeItem(LS_NEXT);
            return next;
        });
    };

    const changeInterval = (val) => {
        setInterval_(val);
        localStorage.setItem(LS_INTERVAL, JSON.stringify(val));
        if (autoRefresh) localStorage.setItem(LS_NEXT, JSON.stringify(Date.now() + val * 1000));
    };

    const fetchGroups = async () => {
        try { const { data } = await axios.get('/api/groups'); setGroups(data); }
        catch { /* ignore */ }
    };

    const pingTarget = async (target) => {
        setPinging(p => ({ ...p, [target.id]: true }));
        try {
            const { data } = await axios.post(`/targets/${target.id}/ping`);
            setTargets(ts => ts.map(t => {
                if (t.id !== target.id) return t;
                const total = t.total_pings + 1, failed = t.failed_pings + (data.success ? 0 : 1);
                return { ...t, last_status: data.success, last_response_time: data.response_time ?? null,
                    last_ping_at: new Date().toISOString(), total_pings: total, failed_pings: failed,
                    uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10,
                    threshold_status: data.threshold_status ?? null };
            }));
        } catch {} finally { setPinging(p => ({ ...p, [target.id]: false })); }
    };

    const pingAll = async (auto = false) => {
        if (inProgressRef.current) return;
        inProgressRef.current = true;
        if (!auto) setPingAllLoading(true);
        try {
            const toPing = targetsRef.current.filter(t => !t.is_paused);
            for (const target of toPing) {
                setPinging(p => ({ ...p, [target.id]: true }));
                try {
                    const { data } = await axios.post(`/targets/${target.id}/ping`);
                    setTargets(ts => ts.map(t => {
                        if (t.id !== target.id) return t;
                        const total = t.total_pings + 1, failed = t.failed_pings + (data.success ? 0 : 1);
                        return { ...t, last_status: data.success, last_response_time: data.response_time ?? null,
                            last_ping_at: new Date().toISOString(), total_pings: total, failed_pings: failed,
                            uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10,
                            threshold_status: data.threshold_status ?? null };
                    }));
                } catch {} finally { setPinging(p => ({ ...p, [target.id]: false })); }
            }
        } finally { inProgressRef.current = false; if (!auto) setPingAllLoading(false); }
    };

    const pingOffline = async () => {
        if (inProgressRef.current) return;
        inProgressRef.current = true;
        setPingAllLoading(true);
        try {
            const offline = targetsRef.current.filter(t => !t.is_paused && t.last_status === false);
            for (const target of offline) {
                setPinging(p => ({ ...p, [target.id]: true }));
                try {
                    const { data } = await axios.post(`/targets/${target.id}/ping`);
                    setTargets(ts => ts.map(t => {
                        if (t.id !== target.id) return t;
                        const total = t.total_pings + 1, failed = t.failed_pings + (data.success ? 0 : 1);
                        return { ...t, last_status: data.success, last_response_time: data.response_time ?? null,
                            last_ping_at: new Date().toISOString(), total_pings: total, failed_pings: failed,
                            uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10,
                            threshold_status: data.threshold_status ?? null };
                    }));
                } catch {} finally { setPinging(p => ({ ...p, [target.id]: false })); }
            }
        } finally { inProgressRef.current = false; setPingAllLoading(false); }
    };

    const addTarget = async (data) => {
        await axios.post('/targets', data);
        setShowAdd(false);
        fetchTargets();
    };

    const updateTarget = async (id, data) => {
        await axios.put(`/targets/${id}`, data);
        setEditTarget(null);
        fetchTargets();
    };

    const confirmDelete = async (target) => {
        await axios.delete(`/targets/${target.id}`);
        setTargets(ts => ts.filter(t => t.id !== target.id));
        setDeleteTarget(null);
    };

    const pauseTarget = async (target) => {
        await axios.post(`/targets/${target.id}/pause`);
        setTargets(ts => ts.map(t => t.id === target.id ? { ...t, is_paused: true } : t));
    };

    const resumeTarget = async (target) => {
        await axios.post(`/targets/${target.id}/resume`);
        setTargets(ts => ts.map(t => t.id === target.id ? { ...t, is_paused: false } : t));
    };

    const saveGroup = async ({ id, name, color }) => {
        if (id) {
            await axios.put(`/api/groups/${id}`, { name, color });
        } else {
            await axios.post('/api/groups', { name, color });
        }
        fetchGroups();
        fetchTargets();
    };

    const deleteGroup = async (id) => {
        await axios.delete(`/api/groups/${id}`);
        if (selectedGroup === id) setSelectedGroup(null);
        fetchGroups();
        fetchTargets();
    };

    const filteredTargets = selectedGroup
        ? targets.filter(t => t.groups?.some(g => g.id === selectedGroup))
        : targets;

    const offlineTargets = targets.filter(t => !t.is_paused && t.last_status === false);

    const stats = {
        total:   targets.length,
        online:  targets.filter(t => !t.is_paused && t.last_status === true).length,
        offline: offlineTargets.length,
        paused:  targets.filter(t => t.is_paused).length,
        unknown: targets.filter(t => !t.is_paused && t.last_status == null).length,
        avgLatency: (() => {
            const w = targets.filter(t => t.avg_response_time != null);
            return w.length ? (w.reduce((s, t) => s + t.avg_response_time, 0) / w.length).toFixed(1) : null;
        })(),
        fleetUptime: (() => {
            const w = targets.filter(t => t.uptime_percent != null);
            return w.length ? (w.reduce((s, t) => s + t.uptime_percent, 0) / w.length).toFixed(1) : null;
        })(),
    };

    const activeGroupName = selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : null;

    const fmtLastUpdated = () => {
        if (!lastUpdated) return null;
        const secs = Math.floor((Date.now() - lastUpdated) / 1000);
        if (secs < 5)    return 'just now';
        if (secs < 60)  return `${secs}s ago`;
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        return `${Math.floor(secs / 3600)}h ago`;
    };

    return (
            <div className="min-h-screen bg-base-100">
                <div className="max-w-screen-xl mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                        <div>
                            <h1 className="text-base font-bold text-base-content leading-tight">Monitoring Dashboard</h1>
                            <p className="text-xs text-base-content/40 mt-0.5">
                                {selectedGroup
                                    ? <>{filteredTargets.length} of {targets.length} device{targets.length !== 1 ? 's' : ''} — <span className="font-medium" style={{ color: groups.find(g => g.id === selectedGroup)?.color }}>{activeGroupName}</span></>
                                    : <>{targets.length} device{targets.length !== 1 ? 's' : ''} monitored</>
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button onClick={() => setShowAdd(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-primary/40 text-primary rounded-lg hover:bg-primary/10 transition-colors">
                                <i className="fas fa-plus text-[10px]"></i> Add Target
                            </button>
                        )}
                        <button onClick={() => pingAll()} disabled={pingAllLoading}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                            <i className={`fas ${pingAllLoading ? 'fa-spinner fa-spin' : 'fa-broadcast-tower'} text-[10px]`}></i>
                            {pingAllLoading ? 'Checking…' : 'Check All'}
                        </button>
                    </div>
                </div>

                {/* ── Offline alert banner ──────────────────────── */}
                <div ref={sentinelRef} className="h-px"></div>
                {offlineTargets.length > 0 && (
                    <div className="banner-enter flex items-center gap-3 px-4 py-3 mb-4 bg-error/8 border border-error/25 rounded-xl">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-70"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                        </span>
                        <span className="text-xs font-bold text-error flex-shrink-0">
                            {offlineTargets.length} device{offlineTargets.length !== 1 ? 's' : ''} offline
                        </span>
                        <div className="w-px h-3.5 bg-error/20 flex-shrink-0"></div>
                        <div className="flex flex-wrap gap-1.5">
                            {offlineTargets.map(t => (
                                <span key={t.id} className="text-[11px] px-2 py-0.5 rounded-md bg-error/12 text-error/80 font-medium border border-error/20">
                                    {t.name}
                                </span>
                            ))}
                        </div>
                        <button onClick={() => pingOffline()} disabled={pingAllLoading}
                            className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-error/70 hover:text-error hover:bg-error/10 px-2.5 py-1 rounded-lg transition-all">
                            {pingAllLoading ? <i className="fas fa-spinner fa-spin text-[9px]"></i> : <i className="fas fa-play text-[9px]"></i>}
                            Check now
                        </button>
                    </div>
                )}

                <StatsBar stats={stats} />

                {/* ── Fleet health bar ──────────────────────────── */}
                {targets.length > 0 && (
                    <div className="anim-fade-up anim-delay-2 flex items-center gap-4 px-4 py-3 mb-4 bg-base-200 border border-base-300 rounded-xl">
                        <div className="flex-1">
                            <div className="flex h-2 rounded-full overflow-hidden bg-base-300/60 gap-px">
                                {stats.online  > 0 && <div className="bg-success transition-all duration-700" style={{ width: `${(stats.online  / stats.total) * 100}%` }}></div>}
                                {stats.paused  > 0 && <div className="bg-warning transition-all duration-700" style={{ width: `${(stats.paused  / stats.total) * 100}%` }}></div>}
                                {stats.offline > 0 && <div className="bg-error   transition-all duration-700" style={{ width: `${(stats.offline / stats.total) * 100}%` }}></div>}
                                {stats.unknown > 0 && <div className="bg-base-content/20 transition-all duration-700" style={{ width: `${(stats.unknown / stats.total) * 100}%` }}></div>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
                            {stats.online  > 0 && <span className="flex items-center gap-1.5 text-success/80"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>{stats.online} online</span>}
                            {stats.paused  > 0 && <span className="flex items-center gap-1.5 text-warning/80"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block"></span>{stats.paused} maintenance</span>}
                            {stats.offline > 0 && <span className="flex items-center gap-1.5 text-error/80"><span className="w-1.5 h-1.5 rounded-full bg-error inline-block"></span>{stats.offline} offline</span>}
                            {stats.unknown > 0 && <span className="flex items-center gap-1.5 text-base-content/40"><span className="w-1.5 h-1.5 rounded-full bg-base-content/20 inline-block"></span>{stats.unknown} unknown</span>}
                            <div className="w-px h-3.5 bg-base-300 flex-shrink-0"></div>
                            <span className={`font-bold mono ${stats.offline > 0 ? 'text-error' : stats.fleetUptime >= 99 ? 'text-success' : 'text-warning'}`}>
                                {stats.fleetUptime ?? '—'}% uptime
                            </span>
                        </div>
                    </div>
                )}

                {/* Auto-refresh */}
                <div className={`anim-fade-up anim-delay-3 flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border transition-colors ${
                    autoRefresh
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-base-200 border-base-300'
                }`}>
                    {autoRefresh ? (
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                    ) : (
                        <i className="fas fa-clock text-base-content/30 text-xs flex-shrink-0"></i>
                    )}
                    <span className={`text-xs font-medium ${autoRefresh ? 'text-primary/80' : 'text-base-content/45'}`}>Auto-refresh</span>
                    <select
                        className={`border rounded-lg px-2 py-1 text-xs outline-none transition-colors ${
                            autoRefresh
                                ? 'bg-primary/8 border-primary/25 text-primary'
                                : 'bg-base-100 border-base-300 text-base-content'
                        }`}
                        value={interval_} onChange={e => changeInterval(Number(e.target.value))}>
                        <option value={30}>30 sec</option>
                        <option value={60}>1 min</option>
                        <option value={300}>5 min</option>
                        <option value={600}>10 min</option>
                    </select>
                    <button onClick={toggleAutoRefresh}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            autoRefresh
                                ? 'bg-primary text-white shadow-[0_0_10px_color-mix(in_oklch,var(--color-primary)_30%,transparent)]'
                                : 'bg-base-300 text-base-content/55 hover:bg-base-300/80'
                        }`}>
                        {autoRefresh ? 'Live' : 'Off'}
                    </button>
                    <div className="ml-auto flex items-center gap-3">
                        {lastUpdated && (
                            <span className="text-[11px] text-base-content/30 tabular-nums">
                                Updated <strong className="text-base-content/45">{fmtLastUpdated()}</strong>
                            </span>
                        )}
                        {autoRefresh && countdown > 0 && (
                            <span className="text-xs text-primary/50 tabular-nums">
                                Next in <strong className="text-primary/70">{countdown}s</strong>
                            </span>
                        )}
                    </div>
                </div>

                {/* Group filter bar */}
                <div className="anim-fade-up anim-delay-4 flex items-center flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] font-semibold text-base-content/30 uppercase tracking-wider mr-1">Groups</span>
                    <button
                        onClick={() => setSelectedGroup(null)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            selectedGroup === null
                                ? 'bg-primary/15 text-primary border-primary/30'
                                : 'text-base-content/50 border-base-300 hover:bg-base-300/50 hover:text-base-content'
                        }`}
                    >
                        All
                        <span className="text-[10px] opacity-60">({targets.length})</span>
                    </button>
                    {groups.map(g => {
                        const count  = targets.filter(t => t.groups?.some(x => x.id === g.id)).length;
                        const active = selectedGroup === g.id;
                        return (
                            <button key={g.id}
                                onClick={() => setSelectedGroup(active ? null : g.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                                style={active ? {
                                    backgroundColor: `${g.color}20`,
                                    color: g.color,
                                    borderColor: `${g.color}50`,
                                } : {
                                    color: 'var(--color-base-content)',
                                    opacity: 0.55,
                                    borderColor: 'var(--color-base-300)',
                                }}
                            >
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }}></span>
                                {g.name}
                                <span className="text-[10px] opacity-70">({count})</span>
                            </button>
                        );
                    })}
                    {isAdmin && (
                        <button
                            onClick={() => setShowGroupManager(true)}
                            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-base-300 text-base-content/40 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                        >
                            <i className="fas fa-tags text-[9px]"></i>
                            Manage Groups
                        </button>
                    )}
                </div>

                {/* ── Active monitors header ────────────────────── */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Active Monitors</span>
                        <span className="text-[10px] font-medium text-base-content/25 tabular-nums">
                            {filteredTargets.length} device{filteredTargets.length !== 1 ? 's' : ''}
                            {selectedGroup ? '' : stats.paused > 0 ? ` · ${stats.paused} in maintenance` : ''}
                        </span>
                    </div>
                    {stats.offline > 0 && (
                        <span className="text-[10px] font-semibold text-error/70 flex items-center gap-1">
                            <i className="fas fa-exclamation-circle text-[9px]"></i>
                            {stats.offline} alert{stats.offline !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <TargetTable targets={filteredTargets} loading={loading} pinging={pinging} isAdmin={isAdmin}
                    onPing={pingTarget} onEdit={setEditTarget} onDelete={setDeleteTarget} onChart={setChartTarget}
                    onDetail={setDetailTargetId} onPause={pauseTarget} onResume={resumeTarget} paused={pingAllLoading} />
            </div>

            {showAdd && (
                <AddModal groups={groups} onSave={addTarget} onClose={() => setShowAdd(false)} />
            )}
            {editTarget && (
                <EditModal target={editTarget} groups={groups} onSave={updateTarget} onClose={() => setEditTarget(null)} />
            )}
            {chartTarget  && <ChartModal  target={chartTarget}  onClose={() => setChartTarget(null)} />}
            {deleteTarget && <DeleteModal target={deleteTarget} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)} />}
            {showGroupManager && (
                <GroupManagerModal groups={groups} onSave={saveGroup} onDelete={deleteGroup} onClose={() => setShowGroupManager(false)} />
            )}
            {detailTargetId && (() => {
                const dt = targets.find(t => t.id === detailTargetId);
                return dt ? (
                    <TargetDetailModal
                        target={dt}
                        isAdmin={isAdmin}
                        isPinging={!!pinging[dt.id]}
                        onPing={pingTarget}
                        onEdit={setEditTarget}
                        onDelete={setDeleteTarget}
                        onChart={setChartTarget}
                        onPause={pauseTarget}
                        onResume={resumeTarget}
                        onClose={() => setDetailTargetId(null)}
                    />
                ) : null;
            })()}

            {/* ── Floating offline alert on scroll ──────────────── */}
            {offlineTargets.length > 0 && showFloatAlert && (
                <div className="fixed top-4 right-6 z-50 pointer-events-none">
                    <div className="anim-slide-down pointer-events-auto">
                    <div className="bg-error/15 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl shadow-error/20 min-w-[260px] overflow-hidden">
                        {/* Pill bar */}
                        <div className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedFloat(!expandedFloat)}>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                            </span>
                            <span className="text-xs font-bold tabular-nums text-error flex-1">{offlineTargets.length} device{offlineTargets.length !== 1 ? 's' : ''} offline</span>
                            <button onClick={e => { e.stopPropagation(); pingOffline(); }}
                                disabled={pingAllLoading}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50">
                                <i className={`fas ${pingAllLoading ? 'fa-spinner fa-spin' : 'fa-play'} text-[8px]`}></i>
                                Check
                            </button>
                        </div>

                        {/* Expanded device list */}
                        {expandedFloat && (
                            <div className="border-t border-white/10 px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                                {offlineTargets.map(t => (
                                    <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-[11px] text-error/90">
                                        <span className="w-1.5 h-1.5 rounded-full bg-error/50 flex-shrink-0"></span>
                                        <span className="font-medium truncate flex-1">{t.name}</span>
                                        <span className="text-error/50 tabular-nums flex-shrink-0">
                                            {t.last_ping_at ? timeAgoShort(t.last_ping_at) : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
}
