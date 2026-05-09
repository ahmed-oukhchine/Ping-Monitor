import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

export default function ChartModal({ target, onClose }) {
    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDark, setIsDark]   = useState(
        () => (document.documentElement.getAttribute('data-theme') || 'dark') !== 'light'
    );

    // Stay in sync with the theme toggle while the modal is open
    useEffect(() => {
        const obs = new MutationObserver(() =>
            setIsDark((document.documentElement.getAttribute('data-theme') || 'dark') !== 'light')
        );
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

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

    // All chart colors in one object — no CSS variables in SVG attributes (they don't work there)
    const C = isDark ? {
        tickLabel:  '#c9cdd6',          // bright enough to read clearly
        tickFaint:  'rgba(255,255,255,0.18)',
        axisLine:   'rgba(255,255,255,0.12)',
        grid:       'rgba(255,255,255,0.06)',
        refStroke:  'rgba(255,255,255,0.20)',
        refLabel:   'rgba(255,255,255,0.50)',
        cursor:     'rgba(255,255,255,0.10)',
    } : {
        tickLabel:  '#374151',
        tickFaint:  'rgba(0,0,0,0.20)',
        axisLine:   'rgba(0,0,0,0.15)',
        grid:       'rgba(0,0,0,0.07)',
        refStroke:  'rgba(0,0,0,0.20)',
        refLabel:   'rgba(0,0,0,0.45)',
        cursor:     'rgba(0,0,0,0.06)',
    };

    const CustomTooltip = ({ active, payload }) => {
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
    };

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="modal-enter bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>

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
                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-3 mb-5">
                        {[
                            { label: 'Uptime', value: uptime != null ? `${uptime}%`         : '—', cls: uptimeColor },
                            { label: 'Avg',    value: avgLatency    ? `${avgLatency} ms`    : '—', cls: 'text-primary' },
                            { label: 'Min',    value: minLatency    ? `${minLatency} ms`    : '—', cls: 'text-success' },
                            { label: 'Max',    value: maxLatency    ? `${maxLatency} ms`    : '—', cls: 'text-warning' },
                        ].map(s => (
                            <div key={s.label} className="bg-base-300/60 border border-base-content/8 rounded-xl p-3 text-center">
                                <div className={`text-lg font-bold tabular-nums mono ${s.cls}`}>{s.value}</div>
                                <div className="text-[10px] text-base-content/40 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-base-content/30">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-12 text-base-content/30 text-sm">No ping history yet for this target.</div>
                    ) : (
                        <div className="rounded-xl border border-base-300/60 overflow-hidden py-4 px-2" style={{ background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.02)' }}>
                            <ResponsiveContainer width="100%" height={220}>
                                <ComposedChart data={data} margin={{ top: 6, right: 20, bottom: 2, left: 8 }}>
                                    <defs>
                                        <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.40} />
                                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 8"
                                        stroke={C.grid}
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="time"
                                        tick={{ fill: C.tickLabel, fontSize: 11, fontWeight: 500 }}
                                        tickLine={{ stroke: C.tickFaint }}
                                        axisLine={{ stroke: C.axisLine }}
                                        interval="preserveStartEnd"
                                        dy={6}
                                    />

                                    <YAxis
                                        tick={{ fill: C.tickLabel, fontSize: 11, fontWeight: 500 }}
                                        tickLine={{ stroke: C.tickFaint }}
                                        axisLine={{ stroke: C.axisLine }}
                                        unit=" ms"
                                        domain={[0, 'auto']}
                                        width={58}
                                        dx={-2}
                                    />

                                    {avgLatency && (
                                        <ReferenceLine
                                            y={parseFloat(avgLatency)}
                                            stroke={C.refStroke}
                                            strokeDasharray="5 4"
                                            strokeWidth={1.5}
                                            label={{
                                                value: `avg ${avgLatency} ms`,
                                                fill: C.refLabel,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                position: 'insideTopRight',
                                            }}
                                        />
                                    )}

                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ stroke: C.cursor, strokeWidth: 24 }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="latency"
                                        stroke="var(--color-primary)"
                                        strokeWidth={2}
                                        fill="url(#latencyGradient)"
                                        dot={false}
                                        activeDot={{
                                            r: 5,
                                            fill: 'var(--color-primary)',
                                            stroke: isDark ? '#1e2028' : '#ffffff',
                                            strokeWidth: 2,
                                        }}
                                        connectNulls={false}
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="offlineMark"
                                        stroke="none"
                                        strokeWidth={0}
                                        dot={(props) => {
                                            if (props.payload.offlineMark == null) return null;
                                            return (
                                                <g key={props.key}>
                                                    <circle cx={props.cx} cy={props.cy} r={7}   fill="var(--color-error)" opacity={0.15} />
                                                    <circle cx={props.cx} cy={props.cy} r={3.5} fill="var(--color-error)" />
                                                </g>
                                            );
                                        }}
                                        activeDot={false}
                                        isAnimationActive={false}
                                        legendType="none"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 mt-3">
                        <span className="flex items-center gap-1.5 text-[11px] text-base-content/35">
                            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-error)', opacity: 0.8 }}></span>
                            Offline
                        </span>
                        <span className="text-[11px] text-base-content/30 tabular-nums">
                            {data.length} checks
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
