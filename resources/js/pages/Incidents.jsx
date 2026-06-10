import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';

function fmtDuration(sec) {
    if (sec == null) return '—';
    sec = Math.floor(sec);
    if (sec < 60)   return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
}

export default function Incidents() {
    const { t } = useLang();
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [targetId, setTargetId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');
    const [page, setPage]         = useState(1);
    const [showExport, setShowExport] = useState(false);
    const exportRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        axios.get('/api/incidents', {
            params: {
                target_id: targetId || undefined,
                date_from: dateFrom || undefined,
                date_to:   dateTo   || undefined,
                page,
            },
        })
            .then(res => setData(res.data))
            .finally(() => setLoading(false));
    }, [targetId, dateFrom, dateTo, page]);

    useEffect(() => {
        const handleClick = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const resetPage  = () => setPage(1);
    const clearFilters = () => { setTargetId(''); setDateFrom(''); setDateTo(''); setPage(1); };
    const activeCount  = [targetId, dateFrom, dateTo].filter(Boolean).length;

    const exportUrl = (path) => {
        const params = new URLSearchParams();
        if (targetId)  params.set('target_id', targetId);
        if (dateFrom)  params.set('date_from', dateFrom);
        if (dateTo)    params.set('date_to', dateTo);
        window.location.href = `${path}?${params.toString()}`;
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-screen-lg mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-bold text-base-content">{t('incidents.title')}</h1>
                        {data && (
                            <div className="flex items-center gap-2 text-[11px] text-base-content/40 ml-2 pl-2 border-l border-base-300">
                                <span>{data.meta.total} incident{data.meta.total !== 1 ? 's' : ''}</span>
                                {data.meta.ongoing > 0 && (
                                    <span className="flex items-center gap-1 text-error font-semibold">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-error"></span>
                                        </span>
                                        {data.meta.ongoing} ongoing
                                    </span>
                                )}
                                {data.meta.ongoing === 0 && data.meta.total > 0 && (
                                    <span className="text-success font-semibold">{t('incidents.allResolved')}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={exportRef}>
                            <button onClick={() => setShowExport(o => !o)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border border-base-300 text-base-content/70 hover:text-base-content hover:bg-base-200 transition-all">
                                <i className="fas fa-download text-[8px]"></i>
                                {t('incidents.export')}
                                <i className="fas fa-chevron-down text-[6px] ml-0.5"></i>
                            </button>
                            {showExport && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-base-200 border border-base-300 rounded-xl shadow-lg z-50 overflow-hidden anim-fade-up">
                                    <button onClick={() => { exportUrl('/api/incidents/export'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-csv text-primary text-[10px] w-4 text-center"></i>
                                        CSV
                                    </button>
                                    <button onClick={() => { exportUrl('/api/incidents/export-xls'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-excel text-[#21a366] text-[10px] w-4 text-center"></i>
                                        Excel
                                    </button>
                                    <button onClick={() => { exportUrl('/api/incidents/export-pdf'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-pdf text-error text-[10px] w-4 text-center"></i>
                                        PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        {activeCount > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-base-content/50 hover:text-error hover:bg-error/10 transition-all">
                                <i className="fas fa-times text-[8px]"></i>
                                {t('history.clear')}
                                <span className="min-w-[14px] h-3.5 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center px-1">{activeCount}</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl px-4 py-3 mb-4 flex items-center flex-wrap gap-x-4 gap-y-2.5">

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('incidents.target')}</span>
                        <select
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                            value={targetId}
                            onChange={e => { setTargetId(e.target.value); resetPage(); }}>
                            <option value="">{t('incidents.all')}</option>
                            {data?.targets?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('incidents.from')}</span>
                        <input type="date" value={dateFrom} max={dateTo || undefined}
                            onChange={e => { setDateFrom(e.target.value); resetPage(); }}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('incidents.to')}</span>
                        <input type="date" value={dateTo} min={dateFrom || undefined}
                            onChange={e => { setDateTo(e.target.value); resetPage(); }}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {activeCount > 0 && (
                        <button onClick={clearFilters}
                            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-base-content/50 hover:text-error hover:bg-error/10 transition-all">
                            <i className="fas fa-times text-[10px]"></i>
                            {t('incidents.clear')}
                            <span className="min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1">
                                {activeCount}
                            </span>
                        </button>
                    )}
                </div>

                <div className="anim-fade-up anim-delay-2 bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-base-content/30">
                            <span className="loading loading-spinner loading-md"></span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table-anim w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-base-300 bg-base-300/40">
                                            {[t('incidents.status'), t('incidents.target'), t('incidents.started'), t('incidents.ended'), t('incidents.duration'), t('incidents.failedPings')].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-base-content/50 uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-base-300/50">
                                        {data?.data?.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-14">
                                                    <i className="fas fa-shield-alt text-3xl block mb-3 text-base-content/10"></i>
                                                    <p className="text-sm text-base-content/30">{t('incidents.noIncidents')}</p>
                                                    {activeCount > 0 ? (
                                                        <button onClick={clearFilters} className="mt-3 text-xs text-primary hover:underline">{t('incidents.clearAllFilters')}</button>
                                                    ) : (
                                                        <p className="text-xs text-base-content/20 mt-1">{t('incidents.allOnline')}</p>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : data?.data?.map((inc, idx) => {
                                            const liveSec = inc.ongoing
                                                ? Math.floor((Date.now() - new Date(inc.started_at)) / 1000)
                                                : null;
                                            const isLong = inc.duration_sec > 300 || (liveSec != null && liveSec > 300);
                                            const isMed  = !isLong && (inc.duration_sec > 60 || (liveSec != null && liveSec > 60));

                                            return (
                                                <tr key={idx} className="hover:bg-base-300/20 transition-colors duration-100">
                                                    <td className="px-4 py-3">
                                                        {inc.ongoing ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="relative flex h-2 w-2 flex-shrink-0">
                                                                    <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-60"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                                                                </span>
                                                                 <span className="text-error text-xs font-semibold">{t('incidents.ongoing')}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="inline-flex rounded-full h-2 w-2 bg-success flex-shrink-0"></span>
                                                                <span className="text-success text-xs font-semibold">{t('incidents.resolved')}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-sm text-base-content leading-tight">{inc.target_name}</div>
                                                        <code className="ip-code text-[10px] mt-0.5 inline-block">{inc.target_ip}</code>
                                                    </td>
                                                    <td className="px-4 py-3 mono text-xs text-base-content/40 tabular-nums whitespace-nowrap">
                                                        {new Date(inc.started_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 mono text-xs tabular-nums whitespace-nowrap">
                                                        {inc.ended_at
                                                            ? <span className="text-base-content/40">{new Date(inc.ended_at).toLocaleString()}</span>
                                                            : <span className="text-error/60 font-medium italic text-[11px]">{t('incidents.notRecovered')}</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 mono text-xs font-semibold tabular-nums">
                                                        <span className={
                                                            isLong ? 'text-error' :
                                                            isMed  ? 'text-warning' :
                                                                     'text-base-content/55'
                                                        }>
                                                            {inc.ongoing ? fmtDuration(liveSec) : fmtDuration(inc.duration_sec)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error/10 text-error text-xs font-semibold">
                                                            <i className="fas fa-times-circle text-[10px]"></i>
                                                            {inc.ping_count}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {data?.meta?.last_page > 1 && (
                                <div className="flex justify-between items-center px-4 py-3 border-t border-base-300">
                                    <span className="text-xs text-base-content/40">
                                        {((page - 1) * data.meta.per_page + 1)}–{Math.min(page * data.meta.per_page, data.meta.total)} of {data.meta.total}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                        <button disabled={page <= 1} onClick={() => setPage(1)}
                                            className="px-2 py-1 rounded-md text-xs text-base-content/50 hover:bg-base-300 disabled:opacity-30 transition-colors">
                                            <i className="fas fa-angle-double-left"></i>
                                        </button>
                                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                            className="px-2 py-1 rounded-md text-xs text-base-content/50 hover:bg-base-300 disabled:opacity-30 transition-colors">
                                            <i className="fas fa-chevron-left"></i>
                                        </button>
                                        <span className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg border border-primary/25">{page} / {data.meta.last_page}</span>
                                        <button disabled={page >= data.meta.last_page} onClick={() => setPage(p => p + 1)}
                                            className="px-2 py-1 rounded-md text-xs text-base-content/50 hover:bg-base-300 disabled:opacity-30 transition-colors">
                                            <i className="fas fa-chevron-right"></i>
                                        </button>
                                        <button disabled={page >= data.meta.last_page} onClick={() => setPage(data.meta.last_page)}
                                            className="px-2 py-1 rounded-md text-xs text-base-content/50 hover:bg-base-300 disabled:opacity-30 transition-colors">
                                            <i className="fas fa-angle-double-right"></i>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
