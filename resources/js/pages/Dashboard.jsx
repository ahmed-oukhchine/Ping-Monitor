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
import { useToast } from '../contexts/ToastContext';
import { useLang } from '../contexts/LanguageContext';
import ImportModal from '../components/ImportModal';

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
    const [showImport, setShowImport]          = useState(false);
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [detailTargetId, setDetailTargetId] = useState(null);
    const [editTarget, setEditTarget]         = useState(null);
    const [chartTarget, setChartTarget]       = useState(null);
    const [deleteTarget, setDeleteTarget]     = useState(null);
    const [lastUpdated, setLastUpdated]       = useState(null);
    const [tick, setTick]                     = useState(0);
    const [search, setSearch]                 = useState('');
    const { t } = useLang();
    const { toast } = useToast();
    const prevStatsRef  = useRef(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const clearSelection = () => setSelectedIds(new Set());

    const bulkPing = () => {
        selectedIds.forEach(id => { const t = targets.find(x => x.id === id); if (t) pingTarget(t); });
        clearSelection();
    };

    const bulkPause = () => {
        Promise.all([...selectedIds].map(id => axios.post(`/targets/${id}/pause`)))
            .then(() => { toast(t('dashboard.pausedN', { n: selectedIds.size }), 'success'); fetchTargets(); })
            .catch(() => toast(t('dashboard.failedToPause'), 'error'));
        clearSelection();
    };

    const bulkResume = () => {
        Promise.all([...selectedIds].map(id => axios.post(`/targets/${id}/resume`)))
            .then(() => { toast(t('dashboard.resumedN', { n: selectedIds.size }), 'success'); fetchTargets(); })
            .catch(() => toast(t('dashboard.failedToResume'), 'error'));
        clearSelection();
    };

    const bulkDelete = () => {
        if (!window.confirm(t('dashboard.confirmDelete', { n: selectedIds.size }))) return;
        Promise.all([...selectedIds].map(id => axios.delete(`/targets/${id}`)))
            .then(() => { toast(t('dashboard.deletedN', { n: selectedIds.size }), 'success'); fetchTargets(); })
            .catch(() => toast(t('dashboard.failedToDelete'), 'error'));
        clearSelection();
    };

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
        catch {}
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
            if (data.success) {
                toast(`${target.name} responded (${data.response_time} ms)`, 'success');
            } else {
                toast(`${target.name} unreachable`, 'error');
            }
        } catch { toast(`${target.name} check failed`, 'error'); } finally { setPinging(p => ({ ...p, [target.id]: false })); }
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
        try {
            await axios.post('/targets', data);
            toast(t('dashboard.targetAdded'));
            setShowAdd(false);
            fetchTargets();
        } catch { toast(t('dashboard.failedToAdd'), 'error'); }
    };

    const updateTarget = async (id, data) => {
        try {
            await axios.put(`/targets/${id}`, data);
            toast(t('dashboard.targetUpdated'));
            setEditTarget(null);
            fetchTargets();
        } catch { toast(t('dashboard.failedToUpdate'), 'error'); }
    };

    const confirmDelete = async (target) => {
        try {
            await axios.delete(`/targets/${target.id}`);
            toast(t('dashboard.targetDeleted'));
            setTargets(ts => ts.filter(t => t.id !== target.id));
            setDeleteTarget(null);
        } catch { toast(t('dashboard.failedToDelete'), 'error'); }
    };

    const pauseTarget = async (target) => {
        try {
            await axios.post(`/targets/${target.id}/pause`);
            setTargets(ts => ts.map(t => t.id === target.id ? { ...t, is_paused: true } : t));
            toast(t('dashboard.maintenanceEnabled'));
        } catch { toast(t('dashboard.failedToPause'), 'error'); }
    };

    const resumeTarget = async (target) => {
        try {
            await axios.post(`/targets/${target.id}/resume`);
            setTargets(ts => ts.map(t => t.id === target.id ? { ...t, is_paused: false } : t));
            toast(t('dashboard.monitoringResumed'));
        } catch { toast(t('dashboard.failedToResume'), 'error'); }
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

    const filteredTargets = (selectedGroup
        ? targets.filter(t => t.groups?.some(g => g.id === selectedGroup))
        : targets
    ).filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q)
            || t.ip_address.toLowerCase().includes(q)
            || (t.location || '').toLowerCase().includes(q)
            || (t.notes || '').toLowerCase().includes(q);
    });

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

    useEffect(() => { prevStatsRef.current = stats; });

    const fmtLastUpdated = () => {
        if (!lastUpdated) return null;
        const secs = Math.floor((Date.now() - lastUpdated) / 1000);
        if (secs < 5)    return t('dashboard.justNow');
        if (secs < 60)  return t('dashboard.secsAgo', { n: secs });
        if (secs < 3600) return t('dashboard.minsAgo', { n: Math.floor(secs / 60) });
        return t('dashboard.hoursAgo', { n: Math.floor(secs / 3600) });
    };

    return (
            <div className="min-h-screen bg-base-100">
                <div className="max-w-screen-xl mx-auto px-6 py-6">

                <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-sm font-bold text-base-content flex-shrink-0">{t('dashboard.title')}</h1>
                    <span className="text-[11px] text-base-content/40 flex-shrink-0">
                        {selectedGroup
                            ? <>{filteredTargets.length}/{targets.length} — <span className="font-medium" style={{ color: groups.find(g => g.id === selectedGroup)?.color }}>{activeGroupName}</span></>
                            : <>{t('dashboard.devicesMonitored', { n: targets.length })}</>
                        }
                    </span>
                    <div className="search-wrap flex-1 relative">
                        <i className="search-icon fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/25 pointer-events-none"></i>
                        <input type="text" placeholder={t('dashboard.searchPlaceholder')} value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm bg-base-200 border border-base-300 rounded-xl outline-none text-base-content placeholder:text-base-content/25 transition-all focus:border-primary/50 focus:bg-base-100 focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_10%,transparent)]"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-base-content/25 hover:text-base-content/50 transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isAdmin && (
                            <>
                                <button onClick={() => setShowAdd(true)}
                                    className="btn-prime flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-primary/40 text-primary rounded-lg hover:border-primary/60 transition-colors">
                                    <i className="fas fa-plus text-[10px]"></i> {t('dashboard.addTarget')}
                                </button>
                                <button onClick={() => setShowImport(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-accent/40 text-accent rounded-lg hover:bg-accent/10 transition-colors">
                                    <i className="fas fa-file-import text-[10px]"></i> {t('dashboard.import')}
                                </button>
                            </>
                        )}
                        <button onClick={() => pingAll()} disabled={pingAllLoading}
                            className="btn-prime flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                            <i className={`fas ${pingAllLoading ? 'fa-spinner fa-spin' : 'fa-broadcast-tower'} text-[10px]`}></i>
                            {pingAllLoading ? t('dashboard.checking') : t('dashboard.checkAll')}
                        </button>
                    </div>
                </div>


                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 mb-3 bg-primary/8 border border-primary/25 rounded-xl">
                        <span className="text-xs font-semibold text-primary/80 tabular-nums">{t('dashboard.nSelected', { n: selectedIds.size })}</span>
                        <div className="w-px h-4 bg-primary/20"></div>
                        <button onClick={bulkPing} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-all">
                            <i className="fas fa-play text-[8px]"></i> {t('dashboard.ping')}
                        </button>
                        <button onClick={bulkPause} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-warning border border-warning/30 hover:bg-warning/10 transition-all">
                            <i className="fas fa-pause text-[8px]"></i> {t('dashboard.pause')}
                        </button>
                        <button onClick={bulkResume} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-success border border-success/30 hover:bg-success/10 transition-all">
                            <i className="fas fa-play text-[8px]"></i> {t('dashboard.resume')}
                        </button>
                        <button onClick={bulkDelete} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-error border border-error/30 hover:bg-error/10 transition-all">
                            <i className="fas fa-trash text-[8px]"></i> {t('dashboard.delete')}
                        </button>
                        <button onClick={clearSelection} className="ml-auto flex items-center gap-1 text-[10px] text-base-content/30 hover:text-base-content/50 transition-colors">
                            <i className="fas fa-times text-[8px]"></i> {t('dashboard.clear')}
                        </button>
                    </div>
                )}
                <div ref={sentinelRef} className="h-px"></div>
                {offlineTargets.length > 0 && (
                    <div className="banner-enter flex items-center gap-3 px-4 py-3 mb-4 bg-error/8 border border-error/25 rounded-xl">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-70"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                        </span>
                        <span className="text-xs font-bold text-error flex-shrink-0">
                            {t('dashboard.nOffline', { n: offlineTargets.length })}
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
                            {t('dashboard.checkNow')}
                        </button>
                    </div>
                )}

                <StatsBar stats={stats} prevStats={prevStatsRef.current} />


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
                            {stats.online  > 0 && <span className="flex items-center gap-1.5 text-success/80"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>{stats.online} {t('dashboard.online')}</span>}
                            {stats.paused  > 0 && <span className="flex items-center gap-1.5 text-warning/80"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block"></span>{stats.paused} {t('dashboard.maintenance')}</span>}
                            {stats.offline > 0 && <span className="flex items-center gap-1.5 text-error/80"><span className="w-1.5 h-1.5 rounded-full bg-error inline-block"></span>{stats.offline} {t('dashboard.offline')}</span>}
                            {stats.unknown > 0 && <span className="flex items-center gap-1.5 text-base-content/40"><span className="w-1.5 h-1.5 rounded-full bg-base-content/20 inline-block"></span>{stats.unknown} {t('dashboard.unknown')}</span>}
                            <div className="w-px h-3.5 bg-base-300 flex-shrink-0"></div>
                            <span className={`font-bold mono ${stats.offline > 0 ? 'text-error' : stats.fleetUptime >= 99 ? 'text-success' : 'text-warning'}`}>
                                {stats.fleetUptime ?? '—'}% {t('dashboard.uptime')}
                            </span>
                        </div>
                    </div>
                )}

                <div className={`anim-fade-up anim-delay-3 flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border transition-colors ${
                    autoRefresh
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-base-200 border-base-300'
                }`}>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                        {autoRefresh ? (
                            <><span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></>
                        ) : (
                            <span className="inline-flex rounded-full h-2 w-2 bg-base-content/20"></span>
                        )}
                    </span>
                    <span className={`text-xs font-medium ${autoRefresh ? 'text-primary/80' : 'text-base-content/45'}`}>{t('dashboard.autoRefresh')}</span>
                    <select
                        className={`border rounded-lg px-2 py-1 text-xs outline-none transition-colors ${
                            autoRefresh
                                ? 'bg-primary/8 border-primary/25 text-primary'
                                : 'bg-base-100 border-base-300 text-base-content'
                        }`}
                        value={interval_} onChange={e => changeInterval(Number(e.target.value))}>
                        <option value={30}>{t('dashboard.sec', { n: 30 })}</option>
                        <option value={60}>{t('dashboard.min', { n: 1 })}</option>
                        <option value={300}>{t('dashboard.min', { n: 5 })}</option>
                        <option value={600}>{t('dashboard.min', { n: 10 })}</option>
                    </select>
                    <button onClick={toggleAutoRefresh} role="switch" aria-checked={autoRefresh}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            autoRefresh
                                ? 'bg-primary border-primary/40'
                                : 'bg-base-300 border-base-300'
                        }`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            autoRefresh ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`} />
                    </button>
                    <div className="ml-auto flex items-center gap-3">
                        {lastUpdated && (
                            <span className="text-[11px] text-base-content/30 tabular-nums">
                                {t('dashboard.updated')} <strong className="text-base-content/45">{fmtLastUpdated()}</strong>
                            </span>
                        )}
                        {autoRefresh && countdown > 0 && (
                            <span className="text-xs text-primary/50 tabular-nums">
                                {t('dashboard.nextIn')} <strong className="text-primary/70">{countdown}s</strong>
                            </span>
                        )}
                    </div>
                </div>


                <div className="anim-fade-up anim-delay-4 flex items-center flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] font-semibold text-base-content/30 uppercase tracking-wider mr-1">{t('dashboard.groups')}</span>
                    <button
                        onClick={() => setSelectedGroup(null)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            selectedGroup === null
                                ? 'bg-primary/15 text-primary border-primary/30'
                                : 'text-base-content/50 border-base-300 hover:bg-base-300/50 hover:text-base-content'
                        }`}
                    >
                        {t('dashboard.all')}
                        <span className="text-[10px] opacity-60">({targets.length})</span>
                    </button>
                    {groups.map(g => {
                        const count  = targets.filter(t => t.groups?.some(x => x.id === g.id)).length;
                        const active = selectedGroup === g.id;
                        return (
                            <button key={g.id}
                                onClick={() => setSelectedGroup(active ? null : g.id)}
                                className="group-badge flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
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
                            {t('dashboard.manageGroups')}
                        </button>
                    )}
                </div>




                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{t('dashboard.activeMonitors')}</span>
                        <span className="text-[10px] font-medium text-base-content/25 tabular-nums">
                            {t('dashboard.nDevices', { n: filteredTargets.length })}
                            {selectedGroup ? '' : stats.paused > 0 ? ` · ${t('dashboard.nInMaintenance', { n: stats.paused })}` : ''}
                        </span>
                    </div>
                    {stats.offline > 0 && (
                        <span className="text-[10px] font-semibold text-error/70 flex items-center gap-1">
                            <i className="fas fa-exclamation-circle text-[9px]"></i>
                            {t('dashboard.nAlerts', { n: stats.offline })}
                        </span>
                    )}
                </div>

                <TargetTable targets={filteredTargets} loading={loading} pinging={pinging} isAdmin={isAdmin}
                    onPing={pingTarget} onEdit={setEditTarget} onDelete={setDeleteTarget} onChart={setChartTarget}
                    onDetail={setDetailTargetId} onPause={pauseTarget} onResume={resumeTarget} paused={pingAllLoading}
                    selectedIds={selectedIds} onSelect={setSelectedIds} />
            </div>

            {showAdd && (
                <AddModal groups={groups} onSave={addTarget} onClose={() => setShowAdd(false)} />
            )}
            {showImport && (
                <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); fetchTargets(); }} />
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


            {offlineTargets.length > 0 && showFloatAlert && (
                <div className="fixed top-4 right-6 z-50 pointer-events-none">
                    <div className="anim-slide-down pointer-events-auto">
                    <div className="bg-error/15 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl shadow-error/20 min-w-[260px] overflow-hidden">

                        <div className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedFloat(!expandedFloat)}>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                            </span>
                            <span className="text-xs font-bold tabular-nums text-error flex-1">{t('dashboard.nOffline', { n: offlineTargets.length })}</span>
                            <button onClick={e => { e.stopPropagation(); pingOffline(); }}
                                disabled={pingAllLoading}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50">
                                <i className={`fas ${pingAllLoading ? 'fa-spinner fa-spin' : 'fa-play'} text-[8px]`}></i>
                                {t('dashboard.check')}
                            </button>
                        </div>


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
