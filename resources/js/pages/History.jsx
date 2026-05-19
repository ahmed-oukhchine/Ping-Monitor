import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';

export default function History() {
    const { t } = useLang();
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [targetId, setTargetId] = useState('');
    const [status, setStatus]     = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');
    const [latency, setLatency]   = useState('');
    const [page, setPage]         = useState(1);

    useEffect(() => {
        setLoading(true);
        axios.get('/api/history', {
            params: {
                target_id: targetId || undefined,
                status:    status   || undefined,
                date_from: dateFrom || undefined,
                date_to:   dateTo   || undefined,
                latency:   latency  || undefined,
                page,
            },
        })
            .then(res => setData(res.data))
            .finally(() => setLoading(false));
    }, [targetId, status, dateFrom, dateTo, latency, page]);

    const resetPage = () => setPage(1);

    const clearFilters = () => {
        setTargetId(''); setStatus(''); setDateFrom('');
        setDateTo(''); setLatency(''); setPage(1);
    };

    const activeCount = [targetId, status, dateFrom, dateTo, latency].filter(Boolean).length;

    const exportUrl = (path) => {
        const params = new URLSearchParams();
        if (targetId) params.set('target_id', targetId);
        if (status)   params.set('status', status);
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo)   params.set('date_to', dateTo);
        if (latency)  params.set('latency', latency);
        window.location.href = `${path}?${params.toString()}`;
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-screen-lg mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-bold text-base-content">{t('history.title')}</h1>
                        {data && (
                            <div className="flex items-center gap-2 text-[11px] text-base-content/40 ml-2 pl-2 border-l border-base-300">
                                <span>{data.meta.total.toLocaleString()} records</span>
                                {data.meta.total > 0 && (
                                    <>
                                        <span className="text-success font-semibold">{data.meta.success_count} ok</span>
                                        <span className="text-error font-semibold">{data.meta.fail_count} failed</span>
                                        <span>{((data.meta.success_count / data.meta.total) * 100).toFixed(1)}%</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {activeCount > 0 && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-base-content/50 hover:text-error hover:bg-error/10 transition-all">
                                <i className="fas fa-times text-[8px]"></i>
                                {t('history.clear')}
                                <span className="min-w-[14px] h-3.5 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center px-1">{activeCount}</span>
                            </button>
                        )}
                        <button onClick={() => exportUrl('/api/history/export')} title={t('history.exportCsv')}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                            <i className="fas fa-file-csv text-[8px]"></i>
                            CSV
                        </button>
                        <button onClick={() => exportUrl('/api/history/export-pdf')} title={t('history.exportPdf')}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-error/30 text-error hover:bg-error/10 transition-all">
                            <i className="fas fa-file-pdf text-[8px]"></i>
                            PDF
                        </button>
                    </div>
                </div>

                <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl px-4 py-3 mb-4 flex items-center flex-wrap gap-x-4 gap-y-2.5">

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('history.target')}</span>
                        <select
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                            value={targetId}
                            onChange={e => { setTargetId(e.target.value); resetPage(); }}>
                            <option value="">{t('history.all')}</option>
                            {data?.targets?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('history.status')}</span>
                        <div className="flex items-center bg-base-100 border border-base-300 rounded-lg p-0.5 gap-0.5">
                            {[
                                { value: '',        label: t('history.all')     },
                                { value: 'online',  label: t('history.online')  },
                                { value: 'offline', label: t('history.offline') },
                            ].map(opt => (
                                <button key={opt.value} type="button"
                                    onClick={() => { setStatus(opt.value); resetPage(); }}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                                        status === opt.value
                                            ? opt.value === 'online'  ? 'bg-success text-white shadow-sm'
                                            : opt.value === 'offline' ? 'bg-error   text-white shadow-sm'
                                            :                           'bg-base-200 text-base-content shadow-sm'
                                            : 'text-base-content/45 hover:text-base-content'
                                    }`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('history.latency')}</span>
                        <select
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                            value={latency}
                            onChange={e => { setLatency(e.target.value); resetPage(); }}>
                            <option value="">{t('history.any')}</option>
                            <option value="fast">{t('history.fast')}</option>
                            <option value="medium">{t('history.medium')}</option>
                            <option value="slow">{t('history.slow')}</option>
                        </select>
                    </div>

                    <div className="w-px h-5 bg-base-300 flex-shrink-0 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('history.from')}</span>
                        <input type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={e => { setDateFrom(e.target.value); resetPage(); }}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                        <span className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider whitespace-nowrap">{t('history.to')}</span>
                        <input type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={e => { setDateTo(e.target.value); resetPage(); }}
                            className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1.5 text-xs text-base-content outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    {activeCount > 0 && (
                        <button onClick={clearFilters}
                            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-base-content/50 hover:text-error hover:bg-error/10 transition-all">
                            <i className="fas fa-times text-[10px]"></i>
                            {t('history.clear')}
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
                                            {[t('history.time'), t('history.target'), t('history.ipAddress'), t('history.status'), t('history.latency'), t('history.error')].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-base-300/50">
                                        {data?.data?.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-14 text-base-content/30">
                                                    <i className="fas fa-filter text-3xl block mb-3 opacity-20"></i>
                                                    <p className="text-sm">{t('history.noRecordsMatch')}</p>
                                                    {activeCount > 0 && (
                                                        <button onClick={clearFilters}
                                                            className="mt-3 text-xs text-primary hover:underline">
                                                            {t('history.clearAllFilters')}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : data?.data?.map(h => (
                                            <tr key={h.id} className="hover:bg-base-300/20 transition-colors duration-100">
                                                <td className="px-4 py-3 mono text-xs text-base-content/40 tabular-nums whitespace-nowrap">
                                                    {new Date(h.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-sm">{h.target?.name ?? '—'}</td>
                                                <td className="px-4 py-3"><code className="ip-code">{h.target?.ip_address ?? '—'}</code></td>
                                                <td className="px-4 py-3">
                                                    {h.is_success ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                                                            </span>
                                                            <span className="text-success text-xs font-semibold">{t('history.online')}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-flex rounded-full h-2 w-2 bg-error"></span>
                                                            <span className="text-error text-xs font-semibold">{t('history.offline')}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 mono text-xs tabular-nums">
                                                    {h.response_time != null ? (
                                                        <span className={
                                                            h.response_time < 50  ? 'text-success font-semibold' :
                                                            h.response_time < 150 ? 'text-warning font-semibold' :
                                                                                    'text-error   font-semibold'
                                                        }>{h.response_time} ms</span>
                                                    ) : <span className="text-base-content/25">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-error/70">
                                                    {h.error_message || <span className="text-base-content/20">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {data?.meta?.last_page > 1 && (
                                <div className="flex justify-between items-center px-4 py-3 border-t border-base-300">
                                    <span className="text-xs text-base-content/40">
                                        {t('history.pagination', { from: ((page - 1) * data.meta.per_page + 1).toLocaleString(), to: Math.min(page * data.meta.per_page, data.meta.total).toLocaleString(), total: data.meta.total.toLocaleString() })}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                        <button disabled={page <= 1} onClick={() => setPage(1)} title={t('history.firstPage')}
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
                                        <button disabled={page >= data.meta.last_page} onClick={() => setPage(data.meta.last_page)} title={t('history.lastPage')}
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
