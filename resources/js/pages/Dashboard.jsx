import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import StatsBar from '../components/StatsBar';
import TargetTable from '../components/TargetTable';
import AddModal from '../components/AddModal';
import EditModal from '../components/EditModal';
import ChartModal from '../components/ChartModal';
import DeleteModal from '../components/DeleteModal';

const LS_AUTO     = 'argusnet_auto';
const LS_INTERVAL = 'argusnet_interval';
const LS_NEXT     = 'argusnet_next_ping';

function readLS(key, fallback) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
}

export default function Dashboard() {
    const [targets, setTargets]               = useState([]);
    const [loading, setLoading]               = useState(true);
    const [pinging, setPinging]               = useState({});
    const [pingAllLoading, setPingAllLoading] = useState(false);
    const [autoRefresh, setAutoRefresh]       = useState(() => readLS(LS_AUTO, false));
    const [interval_, setInterval_]           = useState(() => readLS(LS_INTERVAL, 60));
    const [countdown, setCountdown]           = useState(0);
    const [showAdd, setShowAdd]               = useState(false);
    const [editTarget, setEditTarget]         = useState(null);
    const [chartTarget, setChartTarget]       = useState(null);
    const [deleteTarget, setDeleteTarget]     = useState(null);

    const timerRef      = useRef(null);
    const cdownRef      = useRef(null);
    const inProgressRef = useRef(false);

    useEffect(() => { fetchTargets(); }, []);

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

    const fetchTargets = async () => {
        try { const { data } = await axios.get('/api/targets'); setTargets(data); }
        finally { setLoading(false); }
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
                    uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10 };
            }));
        } finally { setPinging(p => ({ ...p, [target.id]: false })); }
    };

    const pingAll = async (auto = false) => {
        if (inProgressRef.current) return;
        inProgressRef.current = true;
        if (!auto) setPingAllLoading(true);
        try {
            const { data } = await axios.post('/ping-all');
            const map = {};
            data.results.forEach(r => { map[r.target_id] = r; });
            setTargets(ts => ts.map(t => {
                const r = map[t.id]; if (!r) return t;
                const total = t.total_pings + 1, failed = t.failed_pings + (r.success ? 0 : 1);
                return { ...t, last_status: r.success, last_response_time: r.response_time ?? null,
                    last_ping_at: new Date().toISOString(), total_pings: total, failed_pings: failed,
                    uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10 };
            }));
        } finally { inProgressRef.current = false; if (!auto) setPingAllLoading(false); }
    };

    const addTarget    = async (name, ip_address) => { await axios.post('/targets', { name, ip_address }); setShowAdd(false); fetchTargets(); };
    const updateTarget = async (id, name, ip_address) => { await axios.put(`/targets/${id}`, { name, ip_address }); setEditTarget(null); fetchTargets(); };
    const confirmDelete = async (target) => { await axios.delete(`/targets/${target.id}`); setTargets(ts => ts.filter(t => t.id !== target.id)); setDeleteTarget(null); };

    const stats = {
        total:   targets.length,
        online:  targets.filter(t => t.last_status === true).length,
        offline: targets.filter(t => t.last_status === false).length,
        avgLatency: (() => {
            const w = targets.filter(t => t.avg_response_time != null);
            return w.length ? (w.reduce((s, t) => s + t.avg_response_time, 0) / w.length).toFixed(1) : null;
        })(),
    };

    return (
        <div className="min-h-screen bg-base-100">
            <Navbar />
            <div className="max-w-screen-xl mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-base font-bold text-base-content">Monitoring Dashboard</h1>
                        <p className="text-xs text-base-content/40 mt-0.5">{targets.length} device{targets.length !== 1 ? 's' : ''} monitored</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowAdd(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
                            <i className="fas fa-plus text-xs"></i> Add Target
                        </button>
                        <button onClick={() => pingAll()} disabled={pingAllLoading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-success text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                            <i className={`fas ${pingAllLoading ? 'fa-spinner fa-spin' : 'fa-broadcast-tower'} text-xs`}></i>
                            {pingAllLoading ? 'Checking…' : 'Check All'}
                        </button>
                    </div>
                </div>

                <StatsBar stats={stats} />

                {/* Auto-refresh */}
                <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-base-200 border border-base-300 rounded-xl">
                    <i className="fas fa-clock text-base-content/30 text-xs"></i>
                    <span className="text-xs text-base-content/50">Auto-refresh</span>
                    <select
                        className="bg-base-100 border border-base-300 rounded-md px-2 py-1 text-xs text-base-content outline-none"
                        value={interval_} onChange={e => changeInterval(Number(e.target.value))}>
                        <option value={30}>30 sec</option>
                        <option value={60}>1 min</option>
                        <option value={300}>5 min</option>
                        <option value={600}>10 min</option>
                    </select>
                    <button onClick={toggleAutoRefresh}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            autoRefresh ? 'bg-success text-white' : 'bg-base-300 text-base-content/60 hover:bg-base-300'
                        }`}>
                        <i className={`fas ${autoRefresh ? 'fa-pause' : 'fa-play'} mr-1 text-[9px]`}></i>
                        {autoRefresh ? 'ON' : 'OFF'}
                    </button>
                    {autoRefresh && countdown > 0 && (
                        <span className="ml-auto text-xs text-base-content/40 tabular-nums">
                            Next in <strong className="text-base-content/60">{countdown}s</strong>
                        </span>
                    )}
                </div>

                <TargetTable targets={targets} loading={loading} pinging={pinging}
                    onPing={pingTarget} onEdit={setEditTarget} onDelete={setDeleteTarget} onChart={setChartTarget} />
            </div>

            {showAdd      && <AddModal    onSave={addTarget}    onClose={() => setShowAdd(false)} />}
            {editTarget   && <EditModal   target={editTarget}   onSave={updateTarget} onClose={() => setEditTarget(null)} />}
            {chartTarget  && <ChartModal  target={chartTarget}  onClose={() => setChartTarget(null)} />}
            {deleteTarget && <DeleteModal target={deleteTarget} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)} />}
        </div>
    );
}
