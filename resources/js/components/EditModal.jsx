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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                            <i className="fas fa-pen text-warning text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Edit Target</h3>
                            <p className="text-xs text-base-content/40 mt-0.5">{target.ip_address}</p>
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
                            value={ip}
                            onChange={e => setIp(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={loading}>
                            {loading
                                ? <><span className="loading loading-spinner loading-xs"></span>Saving…</>
                                : <><i className="fas fa-save text-xs"></i>Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
