import React, { createContext, useCallback, useContext, useState, useRef } from 'react';

const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250);
    }, []);

    const addToast = useCallback((message, type = 'success', duration = 4000, action = null) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type, exiting: false, action }]);
        const timer = setTimeout(() => removeToast(id), duration);
        timersRef.current[id] = timer;
        return id;
    }, [removeToast]);

    const toast = useCallback((message, type, duration, action) =>
        addToast(message, type, duration, action), [addToast]);

    const dismissToast = useCallback((id) => {
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
            delete timersRef.current[id];
        }
        removeToast(id);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toast, dismissToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id}
                        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-sm font-medium min-w-[280px] max-w-[420px] ${
                            t.exiting ? 'toast-exit' : 'toast-enter'
                        } ${
                            t.type === 'success'
                                ? 'bg-success/12 border-success/25 text-success shadow-success/10'
                                : t.type === 'error'
                                ? 'bg-error/12 border-error/25 text-error shadow-error/10'
                                : t.type === 'warning'
                                ? 'bg-warning/12 border-warning/25 text-warning shadow-warning/10'
                                : 'bg-base-200 border-base-300 text-base-content shadow-base-300/20'
                        }`}>
                        <i className={`fas ${
                            t.type === 'success' ? 'fa-check-circle' :
                            t.type === 'error' ? 'fa-exclamation-circle' :
                            t.type === 'warning' ? 'fa-exclamation-triangle' :
                            'fa-info-circle'
                        } text-sm flex-shrink-0`}></i>
                        <span className="flex-1 text-xs">{t.message}</span>
                        {t.action && (
                            <button onClick={() => { t.action.onClick(); dismissToast(t.id); }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all flex-shrink-0 whitespace-nowrap">
                                {t.action.label}
                            </button>
                        )}
                        <button onClick={() => dismissToast(t.id)}
                            className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0">
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
