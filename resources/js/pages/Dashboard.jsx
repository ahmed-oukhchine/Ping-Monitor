import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import StatsBar from '../components/StatsBar';
import TargetTable from '../components/TargetTable';
import AddModal from '../components/AddModal';
import EditModal from '../components/EditModal';
import ChartModal from '../components/ChartModal';

const LS_AUTO     = 'argusnet_auto';
const LS_INTERVAL = 'argusnet_interval';
const LS_NEXT     = 'argusnet_next_ping'; // absolute timestamp of next scheduled ping

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

    const timerRef      = useRef(null);
    const cdownRef      = useRef(null);
    const inProgressRef = useRef(false);

    useEffect(() => { fetchTargets(); }, []);

    // ── Auto-refresh ────────────────────────────────────────────────────────
    useEffect(() => {
        clearInterval(timerRef.current);
        clearInterval(cdownRef.current);

        if (!autoRefresh) { setCountdown(0); return; }

        // Restore remaining time if page was refreshed mid-countdown
        const storedNext = readLS(LS_NEXT, 0);
        const remaining  = Math.ceil((storedNext - Date.now()) / 1000);
        const initial    = remaining > 0 && remaining <= interval_ ? remaining : interval_;

        setCountdown(initial);

        // Countdown tick
        cdownRef.current = setInterval(() => {
            setCountdown(c => (c <= 1 ? interval_ : c - 1));
        }, 1000);

        // First fire: after remaining time, then every interval_
        const scheduleNext = () => {
            const next = Date.now() + interval_ * 1000;
            localStorage.setItem(LS_NEXT, JSON.stringify(next));
            pingAll(true);
        };

        const firstDelay = initial < interval_ ? initial * 1000 : interval_ * 1000;
        const firstTimer = setTimeout(() => {
            scheduleNext();
            timerRef.current = setInterval(scheduleNext, interval_ * 1000);
        }, firstDelay);

        return () => {
            clearTimeout(firstTimer);
            clearInterval(timerRef.current);
            clearInterval(cdownRef.current);
        };
    }, [autoRefresh, interval_]);

    // ── Persistence helpers ─────────────────────────────────────────────────
    const toggleAutoRefresh = () => {
        setAutoRefresh(prev => {
            const next = !prev;
            localStorage.setItem(LS_AUTO, JSON.stringify(next));
            if (next) {
                localStorage.setItem(LS_NEXT, JSON.stringify(Date.now() + interval_ * 1000));
            } else {
                localStorage.removeItem(LS_NEXT);
            }
            return next;
        });
    };

    const changeInterval = (val) => {
        setInterval_(val);
        localStorage.setItem(LS_INTERVAL, JSON.stringify(val));
        if (autoRefresh) {
            localStorage.setItem(LS_NEXT, JSON.stringify(Date.now() + val * 1000));
        }
    };

    // ── Data ────────────────────────────────────────────────────────────────
    const fetchTargets = async () => {
        try {
            const { data } = await axios.get('/api/targets');
            setTargets(data);
        } finally {
            setLoading(false);
        }
    };

    const pingTarget = async (target) => {
        setPinging(p => ({ ...p, [target.id]: true }));
        try {
            const { data } = await axios.post(`/targets/${target.id}/ping`);
            setTargets(ts => ts.map(t => {
                if (t.id !== target.id) return t;
                const total  = t.total_pings + 1;
                const failed = t.failed_pings + (data.success ? 0 : 1);
                return { ...t, last_status: data.success, last_response_time: data.response_time ?? null,
                    last_ping_at: new Date().toISOString(), total_pings: total, failed_pings: failed,
                    uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10 };
            }));
        } finally {
            setPinging(p => ({ ...p, [target.id]: false }));
        }
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
                const r = map[t.id];
                if (!r) return t;
                const total  = t.total_pings + 1;
                const failed = t.failed_pings + (r.success ? 0 : 1);
                return { ...t, last_status: r.success, last_response_time: r.response_time ?? null,
                    last_ping_at: new Date().toISOString(), total_pings: total, failed_pings: failed,
                    uptime_percent: Math.round((total - failed) / total * 100 * 10) / 10 };
            }));
        } finally {
            inProgressRef.current = false;
            if (!auto) setPingAllLoading(false);
        }
    };

    const addTarget = async (name, ip_address) => {
        await axios.post('/targets', { name, ip_address });
        setShowAdd(false);
        fetchTargets();
    };

    const updateTarget = async (id, name, ip_address) => {
        await axios.put(`/targets/${id}`, { name, ip_address });
        setEditTarget(null);
        fetchTargets();
    };

    const deleteTarget = async (target) => {
        if (!window.confirm(`Delete "${target.name}"?`)) return;
        await axios.delete(`/targets/${target.id}`);
        setTargets(ts => ts.filter(t => t.id !== target.id));
    };

    const stats = {
        total:      targets.length,
        online:     targets.filter(t => t.last_status === true).length,
        offline:    targets.filter(t => t.last_status === false).length,
        avgLatency: (() => {
            const w = targets.filter(t => t.avg_response_time != null);
            if (!w.length) return null;
            return (w.reduce((s, t) => s + t.avg_response_time, 0) / w.length).toFixed(1);
        })(),
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

                <StatsBar stats={stats} />

                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                        <i className="fas fa-plus"></i> Add Target
                    </button>
                    <button className="btn btn-success" onClick={() => pingAll()} disabled={pingAllLoading}>
                        <i className={`fas fa-${pingAllLoading ? 'spinner fa-spin' : 'broadcast-tower'}`}></i>
                        {pingAllLoading ? 'Checking…' : 'Check All'}
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {autoRefresh && countdown > 0 && (
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                                <i className="fas fa-clock" style={{ marginRight: 4 }}></i>
                                Next in {countdown}s
                            </span>
                        )}
                        <select value={interval_} onChange={e => changeInterval(Number(e.target.value))}>
                            <option value={30}>30 sec</option>
                            <option value={60}>1 min</option>
                            <option value={300}>5 min</option>
                            <option value={600}>10 min</option>
                        </select>
                        <button className="btn" onClick={toggleAutoRefresh} style={{
                            background: autoRefresh ? 'rgba(63,185,80,.2)' : 'var(--bg-card2)',
                            border: `1px solid ${autoRefresh ? 'var(--success)' : 'var(--border)'}`,
                            color: autoRefresh ? 'var(--success)' : 'var(--muted)',
                        }}>
                            <i className={`fas fa-${autoRefresh ? 'pause' : 'play'}`}></i>
                            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
                        </button>
                    </div>
                </div>

                <TargetTable
                    targets={targets}
                    loading={loading}
                    pinging={pinging}
                    onPing={pingTarget}
                    onEdit={setEditTarget}
                    onDelete={deleteTarget}
                    onChart={setChartTarget}
                />
            </div>

            {showAdd     && <AddModal   onSave={addTarget}    onClose={() => setShowAdd(false)} />}
            {editTarget  && <EditModal  target={editTarget}   onSave={updateTarget} onClose={() => setEditTarget(null)} />}
            {chartTarget && <ChartModal target={chartTarget}  onClose={() => setChartTarget(null)} />}
        </div>
    );
}
