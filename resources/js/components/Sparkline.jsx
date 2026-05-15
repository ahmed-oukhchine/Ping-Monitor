import React from 'react';

export default function Sparkline({ data = [], width = 48, height = 20, color = 'var(--color-primary)' }) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const px = (i) => (i / (data.length - 1)) * width;
    const py = (v) => height - ((v - min) / range) * (height - 2) - 1;
    const points = data.map((v, i) => `${px(i)},${py(v)}`).join(' ');
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline flex-shrink-0">
            <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                points={points}
                style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
        </svg>
    );
}
