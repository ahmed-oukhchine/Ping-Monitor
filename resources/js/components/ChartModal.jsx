import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
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
                    offlineMark: !d.is_success ? 0 : null,
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
    const uptimeColor = uptime == null ? 'text-base-content/30' : uptime >= 99 ? 'text-success' : uptime >= 90 ? 'text-warning' : 'text-error';

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0]?.payload;
        return (
            <div className="bg-base-300 border border-base-content/10 rounded-xl px-3 py-2.5 text-xs shadow-xl">
                <div className="text-base-content/40 mb-1.5 font-medium">{d.time}</div>
                {d.latency != null
                    ? <div className="text-primary font-bold tabular-nums">{d.latency} ms</div>
                    : <div className="text-error font-bold">Offline</div>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                            <i className="fas fa-chart-line text-warning text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">{target.name}</h3>
                            <code className="ip-code text-[10px] mt-0.5 inline-block">{target.ip_address}</code>
                        </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors" onClick={onClose}>
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="px-6 py-5">
                    <div className="grid grid-cols-4 gap-3 mb-5">
                        {[
                            { label: 'Uptime', value: uptime != null ? `${uptime}%` : '—', cls: uptimeColor },
                            { label: 'Avg',    value: avgLatency ? `${avgLatency} ms` : '—', cls: 'text-primary' },
                            { label: 'Min',    value: minLatency ? `${minLatency} ms` : '—', cls: 'text-success' },
                            { label: 'Max',    value: maxLatency ? `${maxLatency} ms` : '—', cls: 'text-warning' },
                        ].map(s => (
                            <div key={s.label} className="bg-base-300/60 border border-base-content/8 rounded-xl p-3 text-center">
                                <div className={`text-lg font-bold tabular-nums mono ${s.cls}`}>{s.value}</div>
                                <div className="text-[10px] text-base-content/40 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-base-content/30">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-10 text-base-content/30 text-sm">No ping history yet for this target.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.03} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="0" stroke="oklch(var(--bc)/0.12)" />
                                <XAxis dataKey="time" tick={{ fill: 'oklch(var(--bc))', fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fill: 'oklch(var(--bc))', fontSize: 10 }} unit=" ms" domain={[0, 'auto']} />
                                {avgLatency && (
                                    <ReferenceLine y={parseFloat(avgLatency)} stroke="oklch(var(--bc)/0.25)" strokeDasharray="4 4"
                                        label={{ value: 'avg', fill: 'oklch(var(--bc)/0.35)', fontSize: 10 }} />
                                )}
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="latency"
                                    stroke="var(--color-primary)" strokeWidth={2.5}
                                    fill="url(#latencyGradient)"
                                    dot={{ r: 3, fill: 'var(--color-primary)', stroke: 'none' }}
                                    activeDot={{ r: 5, fill: 'var(--color-primary)' }}
                                    connectNulls={false} />
                                <Line type="monotone" dataKey="offlineMark" stroke="none" strokeWidth={0}
                                    dot={(props) => {
                                        if (props.payload.offlineMark == null) return null;
                                        return (
                                            <g key={props.key}>
                                                <circle cx={props.cx} cy={props.cy} r={7} fill="var(--color-error)" opacity={0.2} />
                                                <circle cx={props.cx} cy={props.cy} r={4} fill="var(--color-error)" />
                                            </g>
                                        );
                                    }}
                                    activeDot={false} isAnimationActive={false} legendType="none" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                    <div className="text-right mt-2 text-[11px] text-base-content/30">
                        Last {data.length} checks — red dots = offline
                    </div>
                </div>
            </div>
        </div>
    );
}
