import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

export default function ChartModal({ target, onClose }) {
    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/api/targets/${target.id}/chart-data`)
            .then(res => {
                setData(res.data.map((d, i) => ({
                    i: i + 1,
                    time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    latency: d.is_success && d.response_time != null ? +d.response_time : null,
                    success: d.is_success,
                })));
            })
            .finally(() => setLoading(false));
    }, [target.id]);

    const latencies   = data.filter(d => d.latency != null).map(d => d.latency);
    const avgLatency  = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : null;
    const minLatency  = latencies.length ? Math.min(...latencies).toFixed(1) : null;
    const maxLatency  = latencies.length ? Math.max(...latencies).toFixed(1) : null;
    const onlineCount = data.filter(d => d.success).length;
    const uptime      = data.length ? Math.round(onlineCount / data.length * 100) : null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        return (
            <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{d.time}</div>
                {d.latency != null
                    ? <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{d.latency} ms</div>
                    : <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Offline</div>}
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <h3 className="modal-title">
                            <i className="fas fa-chart-line" style={{ color: 'var(--warning)', marginRight: 8 }}></i>
                            {target.name}
                        </h3>
                        <code className="ip-code" style={{ marginTop: 4, display: 'inline-block' }}>{target.ip_address}</code>
                    </div>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>

                {/* Mini stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                    {[
                        { label: 'Uptime',   value: uptime != null ? `${uptime}%` : '—',           color: uptime >= 99 ? 'var(--success)' : uptime >= 90 ? 'var(--warning)' : 'var(--danger)' },
                        { label: 'Avg',      value: avgLatency ? `${avgLatency} ms` : '—',          color: 'var(--accent)' },
                        { label: 'Min',      value: minLatency ? `${minLatency} ms` : '—',          color: 'var(--success)' },
                        { label: 'Max',      value: maxLatency ? `${maxLatency} ms` : '—',          color: 'var(--warning)' },
                    ].map(s => (
                        <div key={s.label} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ color: s.color, fontWeight: 700, fontSize: 15 }}>{s.value}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: 22 }}></i>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                        No ping history yet for this target.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="time" tick={{ fill: 'var(--muted)', fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} unit=" ms" />
                            {avgLatency && (
                                <ReferenceLine y={parseFloat(avgLatency)} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: 'avg', fill: 'var(--muted)', fontSize: 10 }} />
                            )}
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="latency"
                                stroke="var(--accent)"
                                strokeWidth={2}
                                dot={(props) => {
                                    const d = props.payload;
                                    if (d.latency == null) return (
                                        <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="var(--danger)" stroke="none" />
                                    );
                                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="var(--accent)" stroke="none" />;
                                }}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                <div style={{ textAlign: 'right', marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
                    Last {data.length} checks — red dots = offline
                </div>
            </div>
        </div>
    );
}
