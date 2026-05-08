import React from 'react';

export default function TargetTable({ targets, loading, pinging, onPing, onEdit, onDelete, onChart }) {
    if (loading) {
        return (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
                <div style={{ marginTop: 10 }}>Loading targets…</div>
            </div>
        );
    }

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>IP Address</th>
                            <th>Status</th>
                            <th>Latency</th>
                            <th>Avg Latency</th>
                            <th>Uptime %</th>
                            <th>Loss %</th>
                            <th>Last Check</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {targets.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                                    <i className="fas fa-inbox" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
                                    No targets yet — add one above
                                </td>
                            </tr>
                        ) : (
                            targets.map(t => (
                                <TargetRow
                                    key={t.id}
                                    target={t}
                                    isPinging={!!pinging[t.id]}
                                    onPing={() => onPing(t)}
                                    onEdit={() => onEdit(t)}
                                    onDelete={() => onDelete(t)}
                                    onChart={() => onChart(t)}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TargetRow({ target: t, isPinging, onPing, onEdit, onDelete, onChart }) {
    const loss = t.total_pings > 0 ? Math.round(t.failed_pings / t.total_pings * 100) : null;

    return (
        <tr>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="fas fa-server" style={{ color: '#8ab4f8', fontSize: 12 }}></i>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                </div>
            </td>
            <td><code className="ip-code">{t.ip_address}</code></td>
            <td><StatusBadge status={t.last_status} /></td>
            <td className="mono" style={{ fontSize: 12 }}>
                {t.last_response_time != null ? `${t.last_response_time} ms` : '—'}
            </td>
            <td className="mono" style={{ fontSize: 12 }}>
                {t.avg_response_time != null ? `${t.avg_response_time} ms` : '—'}
            </td>
            <td>
                {t.uptime_percent != null
                    ? <UptimePct pct={t.uptime_percent} />
                    : <span style={{ color: 'var(--muted)' }}>—</span>}
            </td>
            <td className="mono" style={{ fontSize: 12 }}>
                {loss != null
                    ? <span style={{ color: loss === 0 ? 'var(--success)' : loss <= 25 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>{loss}%</span>
                    : <span style={{ color: 'var(--muted)' }}>—</span>}
            </td>
            <td className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {t.last_ping_at ? new Date(t.last_ping_at).toLocaleTimeString() : 'Never'}
            </td>
            <td>
                <div style={{ display: 'flex', gap: 5 }}>
                    <ActionBtn onClick={onPing} disabled={isPinging} title="Ping now"
                        color="var(--accent)" icon={isPinging ? 'fa-spinner fa-spin' : 'fa-satellite-dish'} />
                    <ActionBtn onClick={onChart} title="Response chart"
                        color="var(--warning)" icon="fa-chart-line" />
                    <ActionBtn onClick={onEdit} title="Edit"
                        color="var(--muted)" icon="fa-pen" />
                    <ActionBtn onClick={onDelete} title="Delete"
                        color="var(--danger)" icon="fa-trash" />
                </div>
            </td>
        </tr>
    );
}

function StatusBadge({ status }) {
    if (status === true)  return <span className="badge badge-success"><i className="fas fa-circle" style={{ fontSize: 7 }}></i> Online</span>;
    if (status === false) return <span className="badge badge-danger"><i className="fas fa-circle" style={{ fontSize: 7 }}></i> Offline</span>;
    return <span className="badge badge-secondary"><i className="fas fa-circle" style={{ fontSize: 7 }}></i> Unknown</span>;
}

function UptimePct({ pct }) {
    const color = pct >= 99 ? 'var(--success)' : pct >= 90 ? 'var(--warning)' : 'var(--danger)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--bg-card2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width .3s' }}></div>
            </div>
            <span className="mono" style={{ fontSize: 11, color, minWidth: 34, textAlign: 'right', fontWeight: 600 }}>{pct}%</span>
        </div>
    );
}

function ActionBtn({ onClick, disabled, title, color, icon }) {
    return (
        <button
            className="action-btn"
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                background: `${color}18`,
                borderColor: `${color}45`,
                color,
            }}
        >
            <i className={`fas ${icon}`}></i>
        </button>
    );
}
