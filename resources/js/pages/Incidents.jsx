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
    const [selected, setSelected] = useState(null);
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
            <div className="max-w-screen-xl mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-error/15 flex items-center justify-center">
                            <i className="fas fa-exclamation-circle text-error text-sm"></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-base-content">{t('incidents.title')}</h1>
                            {data && (
                                <p className="text-xs text-base-content/40">
                                    {data.meta.total} incident{data.meta.total !== 1 ? 's' : ''}
                                    {data.meta.ongoing > 0 && (
                                        <span className="ml-2 text-error font-semibold">
                                            · {data.meta.ongoing} ongoing
                                        </span>
                                    )}
                                    {data.meta.ongoing === 0 && data.meta.total > 0 && (
                                        <span className="ml-2 text-success font-semibold">{t('incidents.allResolved')}</span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={exportRef}>
                            <button onClick={() => setShowExport(o => !o)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-base-300 text-base-content/70 hover:text-base-content hover:bg-base-300/50 rounded-xl transition-all">
                                <i className="fas fa-download text-[10px]"></i>
                                {t('incidents.export')}
                                <i className="fas fa-chevron-down text-[8px] ml-0.5"></i>
                            </button>
                            {showExport && (
                                <div className="absolute right-0 top-full mt-1.5 w-36 bg-base-200 border border-base-300 rounded-xl shadow-lg z-50 overflow-hidden anim-fade-up">
                                    <button onClick={() => { exportUrl('/api/incidents/export'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-csv text-primary text-[10px] w-4 text-center"></i>
                                        CSV
                                    </button>
                                    <button onClick={() => { exportUrl('/api/incidents/export-xls'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-excel text-[#21a366] text-[10px] w-4 text-center"></i>
                                        Excel
                                    </button>
                                    <button onClick={() => { exportUrl('/api/incidents/export-pdf'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-pdf text-error text-[10px] w-4 text-center"></i>
                                        PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        {activeCount > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-base-content/50 hover:text-error hover:bg-error/10 rounded-xl transition-all">
                                <i className="fas fa-times text-[10px]"></i>
                                Clear <span className="min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1">{activeCount}</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="anim-fade-up flex items-center flex-wrap gap-3 mb-5 p-3 bg-base-200 border border-base-300 rounded-xl">
                    <i className="fas fa-filter text-xs text-base-content/30"></i>
                    <select className="bg-base-100 border border-base-300 rounded-lg px-3 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        value={targetId} onChange={e => { setTargetId(e.target.value); resetPage(); }}>
                        <option value="">{t('incidents.all')}</option>
                        {data?.targets?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input type="date" value={dateFrom} max={dateTo || undefined}
                        onChange={e => { setDateFrom(e.target.value); resetPage(); }}
                        className="bg-base-100 border border-base-300 rounded-lg px-3 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors [color-scheme:dark]" />
                    <span className="text-[10px] text-base-content/30">—</span>
                    <input type="date" value={dateTo} min={dateFrom || undefined}
                        onChange={e => { setDateTo(e.target.value); resetPage(); }}
                        className="bg-base-100 border border-base-300 rounded-lg px-3 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors [color-scheme:dark]" />
                </div>

                <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: selected ? '1fr 1fr' : '1fr' }}>
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-base-content/30">
                                <span className="loading loading-spinner loading-md"></span>
                            </div>
                        ) : data?.data?.length === 0 ? (
                            <div className="bg-base-200 border border-base-300 border-dashed rounded-2xl flex items-center justify-center py-20 text-base-content/30">
                                <div className="text-center">
                                    <i className="fas fa-shield-alt text-4xl block mb-3 opacity-20"></i>
                                    <p className="text-sm font-medium">{t('incidents.noIncidents')}</p>
                                    <p className="text-xs mt-1 opacity-70">{t('incidents.allOnline')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {data?.data?.map((inc, idx) => {
                                    const liveSec = inc.ongoing
                                        ? Math.floor((Date.now() - new Date(inc.started_at)) / 1000)
                                        : null;
                                    const isLong = inc.duration_sec > 300 || (liveSec != null && liveSec > 300);
                                    const isMed  = !isLong && (inc.duration_sec > 60 || (liveSec != null && liveSec > 60));
                                    const isSel  = selected?.started_at === inc.started_at && selected?.target_id === inc.target_id;

                                    return (
                                        <div key={idx} onClick={() => setSelected(inc)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                                                isSel
                                                    ? 'bg-error/8 border-error/30 shadow-sm'
                                                    : 'bg-base-200 border-base-300 hover:border-error/20 hover:bg-base-200/80'
                                            }`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    inc.ongoing ? 'bg-error/15' : isSel ? 'bg-error/20' : 'bg-base-300'
                                                }`}>
                                                    {inc.ongoing ? (
                                                        <span className="relative flex h-3 w-3">
                                                            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-60"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
                                                        </span>
                                                    ) : (
                                                        <i className={`fas fa-check-circle text-xs ${isSel ? 'text-success' : 'text-base-content/30'}`}></i>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-base-content truncate">{inc.target_name}</span>
                                                        {inc.ongoing && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-error/15 text-error font-semibold flex-shrink-0">Ongoing</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-base-content/40 mt-0.5">
                                                        <span>{new Date(inc.started_at).toLocaleString()}</span>
                                                        <span className={`font-semibold tabular-nums ${
                                                            isLong ? 'text-error' : isMed ? 'text-warning' : 'text-base-content/40'
                                                        }`}>
                                                            {inc.ongoing ? fmtDuration(liveSec) : fmtDuration(inc.duration_sec)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error/10 text-error text-xs font-semibold">
                                                    <i className="fas fa-times-circle text-[9px]"></i>
                                                    {inc.ping_count}
                                                </span>
                                                <i className="fas fa-chevron-right text-[9px] text-base-content/20"></i>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {data?.meta?.last_page > 1 && (
                            <div className="flex items-center justify-between mt-4 px-4 py-3 bg-base-200 border border-base-300 rounded-xl">
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
                                    <span className="px-3 py-1 text-xs font-semibold bg-error/10 text-error rounded-lg border border-error/25">{page} / {data.meta.last_page}</span>
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
                    </div>

                    {selected && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl overflow-hidden">
                            <div className="border-b border-base-300">
                                <div className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        {selected.ongoing ? (
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-60"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                                        )}
                                        <span className="text-base font-bold text-base-content">{selected.target_name}</span>
                                    </div>
                                    <button onClick={() => setSelected(null)}
                                        className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                        <i className="fas fa-times text-xs"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Target', value: selected.target_name, icon: 'fa-crosshairs' },
                                        { label: 'IP Address', value: selected.target_ip, icon: 'fa-network-wired' },
                                        { label: 'Started', value: new Date(selected.started_at).toLocaleString(), icon: 'fa-clock' },
                                        { label: 'Ended', value: selected.ended_at ? new Date(selected.ended_at).toLocaleString() : '—', icon: 'fa-check-circle' },
                                        { label: 'Duration', value: fmtDuration(selected.ongoing ? Math.floor((Date.now() - new Date(selected.started_at)) / 1000) : selected.duration_sec), icon: 'fa-hourglass-half' },
                                        { label: 'Failed Pings', value: selected.ping_count, icon: 'fa-times-circle' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-base-100 rounded-xl px-4 py-3 border border-base-300/50">
                                            <div className="flex items-center gap-1.5 text-[10px] text-base-content/40 mb-1">
                                                <i className={`fas ${s.icon}`}></i>
                                                <span>{s.label}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-base-content">{s.value || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                                {selected.ongoing && (
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/8 border border-error/25 text-xs text-error/90">
                                        <span className="relative flex h-2 w-2 flex-shrink-0">
                                            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-error opacity-60"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                                        </span>
                                        This incident is still ongoing — device has not recovered yet
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
