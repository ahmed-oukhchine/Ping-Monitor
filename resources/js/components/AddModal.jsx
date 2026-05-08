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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <i className="fas fa-plus text-primary text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Add Target</h3>
                            <p className="text-xs text-base-content/40 mt-0.5">Monitor a new device</p>
                        </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors" onClick={onClose}>
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-base-content/60 mb-1.5">Target Name</label>
                        <input
                            type="text"
                            className="input input-bordered w-full text-sm"
                            placeholder="e.g. Core Switch"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-base-content/60 mb-1.5">IP Address or Hostname</label>
                        <input
                            type="text"
                            className="input input-bordered w-full text-sm font-mono"
                            placeholder="e.g. 192.168.1.1"
                            value={ip}
                            onChange={e => setIp(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2.5">
                            <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={loading}>
                            {loading
                                ? <><span className="loading loading-spinner loading-xs"></span>Adding…</>
                                : <><i className="fas fa-plus text-xs"></i>Add Target</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
