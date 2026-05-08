import React, { useState } from 'react';

export default function EditModal({ target, onSave, onClose }) {
    const [name, setName]       = useState(target.name);
    const [ip, setIp]           = useState(target.ip_address);
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(target.id, name.trim(), ip.trim());
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 className="modal-title">
                        <i className="fas fa-pen" style={{ color: 'var(--warning)', marginRight: 8 }}></i>
                        Edit Target
                    </h3>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>
                <form onSubmit={submit}>
                    <div className="form-group">
                        <label className="form-label">Target Name</label>
                        <input className="input" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">IP Address or Hostname</label>
                        <input className="input" value={ip} onChange={e => setIp(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
