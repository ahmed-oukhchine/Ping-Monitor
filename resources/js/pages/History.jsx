import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [showExport, setShowExport] = useState(false);
    const exportRef = useRef(null);

    const fetchData = useCallback(() => {
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

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(fetchData, 15000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchData]);

    useEffect(() => {
        const handleClick = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

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

    const stats = useMemo(() => {
        if (!data?.data?.length) return null;
        const records = data.data;
        const valid = records.filter(r => r.response_time != null);
        const times = valid.map(r => r.response_time);
        const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : null;
        const min = times.length ? Math.min(...times).toFixed(1) : null;
        const max = times.length ? Math.max(...times).toFixed(1) : null;
        const success = records.filter(r => r.is_success).length;
        return { total: records.length, success, failed: records.length - success, avg, min, max, rate: records.length ? ((success / records.length) * 100).toFixed(1) : null };
    }, [data]);

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
                        <button onClick={() => setAutoRefresh(o => !o)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                                autoRefresh ? 'bg-primary/10 border-primary/30 text-primary' : 'border-base-300 text-base-content/50 hover:text-base-content'
                            }`}>
                            <i className={`fas ${autoRefresh ? 'fa-sync fa-spin' : 'fa-sync'} text-[8px]`}></i>
                            Auto
                        </button>
                        <div className="relative" ref={exportRef}>
                            <button onClick={() => setShowExport(o => !o)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border border-base-300 text-base-content/70 hover:text-base-content hover:bg-base-200 transition-all">
                                <i className="fas fa-download text-[8px]"></i>
                                {t('history.export')}
                                <i className="fas fa-chevron-down text-[6px] ml-0.5"></i>
                            </button>
                            {showExport && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-base-200 border border-base-300 rounded-xl shadow-lg z-50 overflow-hidden anim-fade-up">
                                    <button onClick={() => { exportUrl('/api/history/export'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-csv text-primary text-[10px] w-4 text-center"></i>
                                        CSV
                                    </button>
                                    <button onClick={() => { exportUrl('/api/history/export-xls'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-excel text-[#21a366] text-[10px] w-4 text-center"></i>
                                        Excel
                                    </button>
                                    <button onClick={() => { exportUrl('/api/history/export-pdf'); setShowExport(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-base-content hover:bg-base-300 transition-colors">
                                        <i className="fas fa-file-pdf text-error text-[10px] w-4 text-center"></i>
                                        PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {stats && (
                    <div className="anim-fade-up bg-base-200 border border-base-300 rounded-xl p-4 mb-3 flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-base-content tabular-nums">{stats.total} records</span>
                            <span className="text-[10px] text-success font-semibold tabular-nums">{stats.success} ok</span>
                            <span className="text-[10px] text-error font-semibold tabular-nums">{stats.failed} failed</span>
                            <span className="text-[10px] font-semibold tabular-nums" style={{ color: parseFloat(stats.rate) >= 99 ? '#22c55e' : parseFloat(stats.rate) >= 90 ? '#f59e0b' : '#ef4444' }}>{stats.rate}%</span>
                        </div>
                        <div className="w-px h-5 bg-base-300"></div>
                        <div className="flex items-center gap-3 text-[10px] text-base-content/50">
                            <span>Avg: <strong className="text-base-content/80">{stats.avg ?? '—'}ms</strong></span>
                            <span>Min: <strong className="text-success">{stats.min ?? '—'}ms</strong></span>
                            <span>Max: <strong className="text-error">{stats.max ?? '—'}ms</strong></span>
                        </div>
                    </div>
                )}

                {stats && stats.total > 1 && (
                    <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl p-4 mb-3">
                        <div className="flex items-end gap-px h-12">
                            {data.data.slice(0, 80).map((r, i) => {
                                const max = Math.max(...data.data.filter(x => x.response_time != null).map(x => x.response_time), 1);
                                const h = r.response_time != null ? Math.min(100, (r.response_time / max) * 100) : 0;
                                return (
                                    <div key={r.id} title={`${r.target?.name}: ${r.response_time ?? '—'}ms`}
                                        onClick={() => setDetailRecord(r)}
                                        className={`flex-1 rounded-t transition-all hover:opacity-80 cursor-pointer ${r.is_success ? 'bg-primary/40' : 'bg-error/50'}`}
                                        style={{ height: `${h}%`, minHeight: r.is_success ? 2 : 4 }}>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="anim-fade-up anim-delay-2 bg-base-200 border border-base-300 rounded-xl px-4 py-3 mb-4 flex items-center flex-wrap gap-x-4 gap-y-2.5">

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

                <div className="anim-fade-up anim-delay-3 bg-base-200 border border-base-300 rounded-xl overflow-hidden">
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
                                            <tr key={h.id}
                                                className="hover:bg-base-300/20 transition-colors duration-100 cursor-pointer"
                                                onClick={() => setDetailRecord(h)}>
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

            {detailRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
                    onClick={() => setDetailRecord(null)}>
                    <div className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden anim-scale-in"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                                    <i className="fas fa-info-circle text-primary text-xs"></i>
                                </div>
                                <h2 className="text-sm font-bold text-base-content">Ping Detail</h2>
                            </div>
                            <button onClick={() => setDetailRecord(null)}
                                className="text-base-content/30 hover:text-base-content/60 transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-semibold mb-1">Target</div>
                                    <div className="text-sm font-semibold">{detailRecord.target?.name || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-semibold mb-1">IP Address</div>
                                    <div className="text-sm font-mono">{detailRecord.target?.ip_address || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-semibold mb-1">Time</div>
                                    <div className="text-xs text-base-content/70">{new Date(detailRecord.created_at).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-semibold mb-1">Status</div>
                                    <div className="flex items-center gap-1.5">
                                        {detailRecord.is_success ? (
                                            <><span className="w-2 h-2 rounded-full bg-success"></span><span className="text-xs font-semibold text-success">Online</span></>
                                        ) : (
                                            <><span className="w-2 h-2 rounded-full bg-error"></span><span className="text-xs font-semibold text-error">Offline</span></>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-semibold mb-1">Response Time</div>
                                    <div className="text-sm font-bold tabular-nums" style={{ color: detailRecord.response_time == null ? '#6b7280' : detailRecord.response_time < 50 ? '#22c55e' : detailRecord.response_time < 150 ? '#f59e0b' : '#ef4444' }}>
                                        {detailRecord.response_time != null ? `${detailRecord.response_time} ms` : '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-semibold mb-1">Error</div>
                                    <div className="text-xs text-error/80">{detailRecord.error_message || '—'}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end px-5 py-3 border-t border-base-300">
                            <button onClick={() => setDetailRecord(null)}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
