import React, { useState } from 'react';

export default function AddModal({ onSave, onClose }) {
    const [name, setName]       = useState('');
    const [ip, setIp]           = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await onSave(name.trim(), ip.trim());
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add target.');
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 className="modal-title">
                        <i className="fas fa-plus-circle" style={{ color: 'var(--accent)', marginRight: 8 }}></i>
                        Add Target
                    </h3>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>
                <form onSubmit={submit}>
                    <div className="form-group">
                        <label className="form-label">Target Name</label>
                        <input className="input" value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. Core Switch" required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">IP Address or Hostname</label>
                        <input className="input" value={ip} onChange={e => setIp(e.target.value)}
                            placeholder="e.g. 192.168.1.1" required />
                    </div>
                    {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <><i className="fas fa-spinner fa-spin"></i> Adding…</> : 'Add Target'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
