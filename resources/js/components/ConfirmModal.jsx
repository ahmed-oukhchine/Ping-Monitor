import React, { useState } from 'react';

export default function ConfirmModal({
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Delete',
  confirmIcon = 'fa-trash',
  confirmClass = 'bg-error text-white',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  children,
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="modal-glass border border-base-300 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-0.5 h-4 rounded-full bg-error/50 flex-shrink-0"></div>
          <h2 className="text-sm font-semibold text-base-content">{title}</h2>
        </div>
        {message && <p className="text-xs text-base-content/50 mb-5">{message}</p>}
        {children}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors disabled:opacity-40">
            {cancelText}
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg hover:brightness-110 transition-all disabled:opacity-40 ${confirmClass}`}>
            {loading
              ? <><span className="loading loading-spinner loading-xs"></span> Deleting…</>
              : <><i className={`fas ${confirmIcon} text-xs`}></i> {confirmText}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
