import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

export default function History() {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [targetId, setTargetId] = useState('');
    const [page, setPage]         = useState(1);

    useEffect(() => {
        setLoading(true);
        axios.get('/api/history', { params: { target_id: targetId || undefined, page } })
            .then(res => setData(res.data))
            .finally(() => setLoading(false));
    }, [targetId, page]);

    const onTargetChange = (e) => { setTargetId(e.target.value); setPage(1); };

    return (
        <div className="min-h-screen bg-base-100">
            <Navbar />
            <div className="max-w-screen-lg mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-base font-bold text-base-content">Ping History</h1>
                        {data && <p className="text-xs text-base-content/40 mt-0.5">{data.meta.total.toLocaleString()} records</p>}
                    </div>
                    <select
                        className="bg-base-200 border border-base-300 rounded-lg px-3 py-1.5 text-sm text-base-content outline-none"
                        value={targetId} onChange={onTargetChange}>
                        <option value="">All Targets</option>
                        {data?.targets?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-base-content/30">
                            <span className="loading loading-spinner loading-md"></span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-base-300 bg-base-300/40">
                                            {['Time', 'Target', 'IP Address', 'Status', 'Latency', 'Error'].map(h => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-base-300/50">
                                        {data?.data?.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-12 text-base-content/30 text-sm">No history found</td></tr>
                                        ) : data?.data?.map(h => (
                                            <tr key={h.id} className="hover:bg-base-300/20 transition-colors duration-100">
                                                <td className="px-4 py-3 mono text-xs text-base-content/40 tabular-nums">{new Date(h.created_at).toLocaleString()}</td>
                                                <td className="px-4 py-3 font-medium text-sm">{h.target?.name ?? '—'}</td>
                                                <td className="px-4 py-3"><code className="ip-code">{h.target?.ip_address ?? '—'}</code></td>
                                                <td className="px-4 py-3">
                                                    {h.is_success ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-success opacity-60"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                                                            </span>
                                                            <span className="text-success text-xs font-semibold">Online</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-flex rounded-full h-2 w-2 bg-error"></span>
                                                            <span className="text-error text-xs font-semibold">Offline</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 mono text-xs tabular-nums text-base-content/55">
                                                    {h.response_time != null ? `${h.response_time} ms` : '—'}
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
                                    <span className="text-xs text-base-content/40">Page {data.meta.current_page} of {data.meta.last_page}</span>
                                    <div className="flex items-center gap-1">
                                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                            className="px-2 py-1 rounded-md text-xs text-base-content/50 hover:bg-base-300 disabled:opacity-30 transition-colors">
                                            <i className="fas fa-chevron-left"></i>
                                        </button>
                                        <button disabled={page >= data.meta.last_page} onClick={() => setPage(p => p + 1)}
                                            className="px-2 py-1 rounded-md text-xs text-base-content/50 hover:bg-base-300 disabled:opacity-30 transition-colors">
                                            <i className="fas fa-chevron-right"></i>
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
