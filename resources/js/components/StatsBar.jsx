import React, { useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';

function Trend({ value, trend }) {
    if (trend == null || trend === 0) return null;
    const up = trend > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ml-1 ${up ? 'text-error/60' : 'text-success/60'}`}>
            <i className={`fas ${up ? 'fa-arrow-up' : 'fa-arrow-down'} text-[7px]`}></i>
            {Math.abs(trend)}
        </span>
    );
}

function useMouseGlow() {
    const handleMouseMove = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
    }, []);
    return handleMouseMove;
}

export default function StatsBar({ stats, prevStats }) {
    const { t } = useLang();
    const uptimeSub = stats.fleetUptime != null ? t('stats.fleetUptime', { pct: stats.fleetUptime }) : null;
    const offlineAlert = stats.offline > 0;

    const diff = (key) => {
        if (!prevStats) return null;
        const cur = parseFloat(stats[key]);
        const prev = parseFloat(prevStats[key]);
        if (isNaN(cur) || isNaN(prev) || prev === 0) return null;
        return Math.round((cur - prev) * 10) / 10;
    };

    const handleMouse = useMouseGlow();

    const cards = [
        {
            label: t('stats.totalTargets'),
            value: stats.total ?? 0,
            valueCls: 'text-base-content',
            sub: stats.paused > 0 ? t('stats.inMaintenance', { n: stats.paused }) : t('stats.allMonitored'),
            subCls: stats.paused > 0 ? 'text-warning/70' : 'text-base-content/30',
            subIcon: stats.paused > 0 ? 'fa-pause' : null,
            icon: 'fa-server', iconBg: 'bg-primary/10', iconColor: 'text-primary', border: 'border-t-primary/60',
        },
        {
            label: t('stats.online'),
            value: stats.online ?? 0,
            valueCls: 'text-success',
            sub: uptimeSub,
            subCls: 'text-base-content/30',
            subIcon: null,
            icon: 'fa-check-circle', iconBg: 'bg-success/10', iconColor: 'text-success', border: 'border-t-success/60',
            trendVal: diff('online'),
            trendUp: false,
        },
        {
            label: t('stats.offline'),
            value: stats.offline ?? 0,
            valueCls: offlineAlert ? 'text-error' : 'text-base-content/40',
            sub: offlineAlert ? t('stats.requiresAttention') : t('stats.allClear'),
            subCls: offlineAlert ? 'text-error/60' : 'text-base-content/25',
            subIcon: offlineAlert ? 'fa-exclamation-circle' : null,
            icon: 'fa-times-circle',
            iconBg: offlineAlert ? 'bg-error/10' : 'bg-base-300/60',
            iconColor: offlineAlert ? 'text-error' : 'text-base-content/25',
            border: offlineAlert ? 'border-t-error/60' : 'border-t-base-300',
            trendVal: diff('offline'),
            trendUp: true,
        },
        {
            label: t('stats.avgLatency'),
            value: stats.avgLatency != null ? `${stats.avgLatency} ms` : '—',
            valueCls: stats.avgLatency == null ? 'text-base-content/30'
                : stats.avgLatency < 50  ? 'text-success'
                : stats.avgLatency < 150 ? 'text-warning'
                : 'text-error',
            sub: stats.avgLatency == null ? t('stats.noDataYet')
                : stats.avgLatency < 50  ? t('stats.fast')
                : stats.avgLatency < 150 ? t('stats.moderate')
                : t('stats.slow'),
            subCls: stats.avgLatency == null ? 'text-base-content/25'
                : stats.avgLatency < 50  ? 'text-success/60'
                : stats.avgLatency < 150 ? 'text-warning/60'
                : 'text-error/60',
            subIcon: null,
            icon: 'fa-tachometer-alt', iconBg: 'bg-warning/10', iconColor: 'text-warning', border: 'border-t-warning/60',
            trendVal: diff('avgLatency'),
            trendUp: true,
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-3 mb-4">
            {cards.map((c, i) => (
                <div key={c.label} onMouseMove={handleMouse} className={`stat-card anim-fade-up anim-delay-${i + 1} bg-base-200 border border-base-300 border-t-2 ${c.border} rounded-xl p-4 flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`fas ${c.icon} ${c.iconColor} text-lg`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`text-2xl font-bold tabular-nums mono leading-none ${c.valueCls}`}>
                            {c.value}
                            {c.trendVal != null && (
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ml-1.5 align-middle ${c.trendUp ? 'text-error/60' : 'text-success/60'}`}>
                                    <i className={`fas ${c.trendVal > 0 === c.trendUp ? 'fa-arrow-up' : 'fa-arrow-down'} text-[8px]`}></i>
                                    {Math.abs(c.trendVal)}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-base-content/45 mt-0.5 font-medium leading-tight">{c.label}</div>
                        {c.sub && (
                            <div className={`text-[10px] mt-0.5 font-medium flex items-center gap-1 leading-tight ${c.subCls}`}>
                                {c.subIcon && <i className={`fas ${c.subIcon} text-[8px]`}></i>}
                                {c.sub}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
