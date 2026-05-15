import React, { useState } from 'react';

const PRESET_COLORS = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
    '#a855f7', '#ec4899', '#f97316', '#06b6d4',
    '#6b7280', '#84cc16',
];

const INPUT_SM = "bg-base-100 border border-base-300 rounded-lg px-3 py-1.5 text-sm text-base-content outline-none focus:border-primary/60 transition-colors";

export default function GroupManagerModal({ groups, onSave, onDelete, onClose }) {
    const [newName, setNewName]     = useState('');
    const [newColor, setNewColor]   = useState(PRESET_COLORS[0]);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName]   = useState('');
    const [editColor, setEditColor] = useState('');
    const [loading, setLoading]     = useState(false);

    const startEdit = (g) => {
        setEditingId(g.id);
        setEditName(g.name);
        setEditColor(g.color);
    };

    const submitNew = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setLoading(true);
        try {
            await onSave({ name: newName.trim(), color: newColor });
            setNewName('');
            setNewColor(PRESET_COLORS[0]);
        } finally {
            setLoading(false);
        }
    };

    const submitEdit = async (id) => {
        if (!editName.trim()) return;
        setLoading(true);
        try {
            await onSave({ id, name: editName.trim(), color: editColor });
            setEditingId(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="modal-enter bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <i className="fas fa-tags text-primary text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Manage Groups</h3>
                            <p className="text-xs text-base-content/40 mt-0.5">Organize devices by category</p>
                        </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors" onClick={onClose}>
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <div className="px-6 py-4 max-h-64 overflow-y-auto">
                    {groups.length === 0 ? (
                        <div className="text-center py-8">
                            <i className="fas fa-tags text-3xl text-base-content/10 block mb-3"></i>
                            <p className="text-sm text-base-content/30">No groups yet — add one below</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {groups.map(g => (
                                <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-base-300/30 border border-base-300/50">
                                    {editingId === g.id ? (
                                        <>
                                            <input
                                                className={`${INPUT_SM} flex-1 min-w-0`}
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && submitEdit(g.id)}
                                            />
                                            <div className="flex gap-1 flex-shrink-0">
                                                {PRESET_COLORS.map(c => (
                                                    <button key={c} type="button"
                                                        onClick={() => setEditColor(c)}
                                                        className={`w-4 h-4 rounded-full border-2 transition-all ${editColor === c ? 'border-base-content scale-110' : 'border-transparent'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                            <button onClick={() => submitEdit(g.id)} disabled={loading}
                                                className="px-2.5 py-1 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0">
                                                Save
                                            </button>
                                            <button onClick={() => setEditingId(null)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/35 hover:text-base-content hover:bg-base-300 transition-all flex-shrink-0">
                                                <i className="fas fa-times text-[10px]"></i>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }}></span>
                                            <span className="text-sm font-medium text-base-content flex-1">{g.name}</span>
                                            <button onClick={() => startEdit(g)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-base-content hover:bg-base-300 transition-all">
                                                <i className="fas fa-pen text-[10px]"></i>
                                            </button>
                                            <button onClick={() => onDelete(g.id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-error hover:bg-error/10 transition-all">
                                                <i className="fas fa-trash text-[10px]"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={submitNew} className="px-6 py-4 border-t border-base-300">
                    <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-0.5 h-3.5 rounded-full bg-primary/50 flex-shrink-0"></div>
                        <p className="text-xs font-semibold text-base-content/50">Add New Group</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            className={`${INPUT_SM} flex-1 min-w-0`}
                            placeholder="Group name…"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            required
                        />
                        <div className="flex gap-1 flex-shrink-0">
                            {PRESET_COLORS.map(c => (
                                <button key={c} type="button"
                                    onClick={() => setNewColor(c)}
                                    className={`w-4 h-4 rounded-full border-2 transition-all ${newColor === c ? 'border-base-content scale-110' : 'border-transparent hover:border-base-content/40'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <button type="submit" disabled={loading || !newName.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)] flex-shrink-0">
                            {loading
                                ? <span className="loading loading-spinner loading-xs"></span>
                                : <i className="fas fa-plus text-[10px]"></i>}
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
