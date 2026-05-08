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

    const onTargetChange = (e) => {
        setTargetId(e.target.value);
        setPage(1);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                        <i className="fas fa-history" style={{ color: 'var(--accent)', marginRight: 8 }}></i>
                        Ping History
                        {data && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({data.meta.total} records)</span>}
                    </h2>
                    <select value={targetId} onChange={onTargetChange}>
                        <option value="">All Targets</option>
                        {data?.targets?.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="card" style={{ overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: 22 }}></i>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Target</th>
                                            <th>IP Address</th>
                                            <th>Status</th>
                                            <th>Latency</th>
                                            <th>Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.data?.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                                                    No history found
                                                </td>
                                            </tr>
                                        ) : data?.data?.map(h => (
                                            <tr key={h.id}>
                                                <td className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                                                    {new Date(h.created_at).toLocaleString()}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{h.target?.name ?? '—'}</td>
                                                <td><code className="ip-code">{h.target?.ip_address ?? '—'}</code></td>
                                                <td>
                                                    {h.is_success
                                                        ? <span className="badge badge-success"><i className="fas fa-circle" style={{ fontSize: 7 }}></i> Online</span>
                                                        : <span className="badge badge-danger"><i className="fas fa-circle" style={{ fontSize: 7 }}></i> Offline</span>}
                                                </td>
                                                <td className="mono" style={{ fontSize: 12 }}>
                                                    {h.response_time != null ? `${h.response_time} ms` : '—'}
                                                </td>
                                                <td style={{ fontSize: 11, color: 'var(--danger)' }}>
                                                    {h.error_message || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data?.meta?.last_page > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                                    <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                        <i className="fas fa-chevron-left"></i> Prev
                                    </button>
                                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                                        Page {data.meta.current_page} / {data.meta.last_page}
                                    </span>
                                    <button className="btn btn-ghost" disabled={page >= data.meta.last_page} onClick={() => setPage(p => p + 1)}>
                                        Next <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
