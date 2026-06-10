import React from 'react';

export default function Gauge({ value = 0, label = '', size = 120 }) {
    const v = Math.min(100, Math.max(0, value));
    const sw = size * 0.09;
    const r = (size - sw * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (v / 100) * circ;
    const cx = size / 2;
    const cy = size / 2;

    const color = v >= 90 ? '#ef4444' : v >= 70 ? '#eab308' : '#22c55e';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor"
            style={{ overflow: 'visible' }}>
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="hsl(var(--b3))" strokeWidth={sw} />
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke={color} strokeWidth={sw}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x={cx} y={cy + size * 0.04} textAnchor="middle"
                className="text-base-content font-bold tabular-nums"
                fontSize={size * 0.1}>{Math.round(v)}%</text>
            {label && (
                <text x={cx} y={size - size * 0.06} textAnchor="middle"
                    className="text-base-content/50"
                    fontSize={size * 0.065}>{label}</text>
            )}
        </svg>
    );
}
