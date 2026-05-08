import React, { useState } from 'react';

export default function DeleteModal({ target, onConfirm, onClose }) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try { await onConfirm(target); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                            <i className="fas fa-trash text-error text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Delete Target</h3>
                            <p className="text-xs text-base-content/40 mt-0.5">This cannot be undone</p>
                        </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors" onClick={onClose}>
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="px-6 py-5">
                    <p className="text-sm text-base-content/70 mb-3">You are about to permanently delete:</p>
                    <div className="bg-base-300/40 border border-base-300 rounded-xl px-4 py-3 mb-4">
                        <div className="font-semibold text-base-content text-sm">{target.name}</div>
                        <code className="ip-code text-xs mt-1 inline-block">{target.ip_address}</code>
                    </div>
                    <p className="text-xs text-base-content/40">All ping history for this target will also be deleted.</p>
                </div>

                <div className="flex justify-end gap-2 px-6 pb-5">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
                    <button type="button" className="btn btn-error btn-sm gap-2" onClick={handleConfirm} disabled={loading}>
                        {loading
                            ? <><span className="loading loading-spinner loading-xs"></span>Deleting…</>
                            : <><i className="fas fa-trash text-xs"></i>Delete</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
