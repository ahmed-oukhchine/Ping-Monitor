import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TerminalModal from '../components/TerminalModal';

export default function Vlans() {
    const { t } = useLang();
    const { toast } = useToast();
    const { user } = useAuth();
    const canManage = user?.role === 'config_manager';
    const [vlans, setVlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ vlan_id: '', name: '', description: '', subnet: '', gateway: '', domain: '', notes: '' });
    const [showTerminal, setShowTerminal] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchVlans = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/vlans');
            setVlans(data);
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchVlans(); }, [fetchVlans]);

    const resetForm = () => {
        setForm({ vlan_id: '', name: '', description: '', subnet: '', gateway: '', domain: '', notes: '' });
        setEditing(null);
        setShowForm(false);
    };

    const openNew = () => {
        resetForm();
        setEditing('new');
        setShowForm(true);
    };

    const openEdit = (v) => {
        setEditing(v);
        setForm({
            vlan_id: String(v.vlan_id),
            name: v.name,
            description: v.description || '',
            subnet: v.subnet || '',
            gateway: v.gateway || '',
            domain: v.domain || '',
            notes: v.notes || '',
        });
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = { ...form, vlan_id: Number(form.vlan_id) };
        try {
            if (editing && editing !== 'new') {
                await axios.put(`/api/vlans/${editing.id}`, payload);
                toast(t('vlans.updated'), 'success');
            } else {
                await axios.post('/api/vlans', payload);
                toast(t('vlans.created'), 'success');
            }
            resetForm();
            await fetchVlans();
        } catch (err) {
            const msg = err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat()[0]
                : err.response?.data?.message || err.message || t('vlans.saveFailed');
            toast(msg, 'error');
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`/api/vlans/${deleteTarget.id}`);
            toast(t('vlans.deleted'), 'success');
            if (selected?.id === deleteTarget.id) setSelected(null);
            await fetchVlans();
            setDeleteTarget(null);
        } catch {
            toast(t('vlans.deleteFailed'), 'error');
            setDeleteTarget(null);
        }
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                            <i className="fas fa-sitemap text-primary text-sm"></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-base-content">{t('vlans.title')}</h1>
                            <p className="text-xs text-base-content/40">{t('vlans.subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setShowTools(!showTools)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-base-content/50 border border-base-300 rounded-xl hover:text-base-content hover:bg-base-300/50 transition-all">
                                <i className="fas fa-wrench text-[10px]"></i>
                                Tools
                                <i className={`fas fa-chevron-down text-[8px] transition-transform ${showTools ? 'rotate-180' : ''}`}></i>
                            </button>
                            {showTools && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowTools(false)}></div>
                                    <div className="absolute right-0 top-full mt-1.5 z-20 w-40 bg-base-200 border border-base-300 rounded-xl shadow-xl overflow-hidden">
                                        <button onClick={() => { setShowTools(false); setShowTerminal(true); }}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-base-content/70 hover:text-base-content hover:bg-base-300/50 transition-all text-left">
                                            <i className="fas fa-terminal text-[10px]"></i>
                                            Terminal
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        {canManage && !showForm && (
                            <button onClick={openNew}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 transition-all shadow-sm">
                                <i className="fas fa-plus text-[10px]"></i>
                                {t('vlans.addVlan')}
                            </button>
                        )}
                    </div>
                </div>

                {canManage && showForm && (
                    <div className="bg-base-200 border border-base-300 rounded-2xl p-5 mb-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                                    <i className={`fas ${editing === 'new' ? 'fa-plus' : 'fa-pen'} text-primary text-xs`}></i>
                                </div>
                                <h2 className="text-sm font-bold text-base-content">
                                    {editing === 'new' ? t('vlans.newVlan') : `${t('vlans.editVlan')} — VLAN ${editing.vlan_id}`}
                                </h2>
                            </div>
                            <button onClick={resetForm} className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <VlanForm form={form} setForm={setForm} onSave={handleSave} onCancel={resetForm} t={t} editing={editing !== 'new'} />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr' }}>
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-base-content/30">
                                <span className="loading loading-spinner loading-md"></span>
                            </div>
                        ) : vlans.length === 0 ? (
                            <div className="bg-base-200 border border-base-300 border-dashed rounded-2xl flex items-center justify-center py-20 text-base-content/30">
                                <div className="text-center">
                                    <i className="fas fa-sitemap text-4xl block mb-3 opacity-20"></i>
                                    <p className="text-sm font-medium">{t('vlans.noVlans')}</p>
                                    <p className="text-xs mt-1 opacity-70">{t('vlans.noVlansHint')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {vlans.map(v => {
                                    const isSel = selected?.id === v.id;
                                    return (
                                        <div key={v.id} onClick={() => setSelected(v)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                                                isSel
                                                    ? 'bg-primary/10 border-primary/30 shadow-sm'
                                                    : 'bg-base-200 border-base-300 hover:border-primary/20 hover:bg-base-200/80'
                                            }`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    isSel ? 'bg-primary/20' : 'bg-base-300'
                                                }`}>
                                                    <i className={`fas fa-sitemap text-xs ${isSel ? 'text-primary' : 'text-base-content/30'}`}></i>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-base-content truncate">{v.name}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300 text-base-content/50 font-semibold flex-shrink-0">VLAN {v.vlan_id}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-base-content/40 mt-0.5">
                                                        {v.subnet && <span className="font-mono">{v.subnet}</span>}
                                                        {v.subnet && v.domain && <span>·</span>}
                                                        {v.domain && <span>{v.domain}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {canManage && (
                                                    <>
                                                        <button onClick={e => { e.stopPropagation(); openEdit(v); }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-primary hover:bg-primary/10 transition-all">
                                                            <i className="fas fa-pen text-[10px]"></i>
                                                        </button>
                                            <button onClick={e => { e.stopPropagation(); setDeleteTarget(v); }}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-error hover:bg-error/10 transition-all">
                                                <i className="fas fa-trash text-[10px]"></i>
                                            </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selected && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl overflow-hidden">
                            <div className="border-b border-base-300">
                                <div className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-sitemap text-sm text-primary"></i>
                                        <span className="text-base font-bold text-base-content">{selected.name}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300 text-base-content/50 font-semibold">VLAN {selected.vlan_id}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {canManage && (
                                            <>
                                                <button onClick={() => openEdit(selected)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all">
                                                    <i className="fas fa-pen text-xs"></i>
                                                </button>
                                                <button onClick={() => setDeleteTarget(selected)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-error hover:bg-error/10 transition-all">
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: t('vlans.vlanId'), value: `VLAN ${selected.vlan_id}`, icon: 'fa-tag' },
                                        { label: t('vlans.name'), value: selected.name, icon: 'fa-tag' },
                                        { label: t('vlans.subnet'), value: selected.subnet, icon: 'fa-network-wired' },
                                        { label: t('vlans.gateway'), value: selected.gateway, icon: 'fa-route' },
                                        { label: t('vlans.domain'), value: selected.domain, icon: 'fa-globe' },
                                        { label: t('vlans.description'), value: selected.description, icon: 'fa-align-left' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-base-100 rounded-xl px-4 py-3 border border-base-300/50">
                                            <div className="flex items-center gap-1.5 text-[10px] text-base-content/40 mb-1">
                                                <i className={`fas ${s.icon}`}></i>
                                                <span>{s.label}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-base-content truncate">{s.value || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                                {selected.notes && (
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <i className="fas fa-sticky-note text-[10px] text-base-content/40"></i>
                                            <span className="text-[11px] font-medium text-base-content/50">{t('vlans.notes')}</span>
                                        </div>
                                        <div className="bg-base-100 border border-base-300 rounded-xl p-4 text-xs text-base-content/80 whitespace-pre-wrap">
                                            {selected.notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showTerminal && (
                <TerminalModal onClose={() => setShowTerminal(false)} />
            )}

            {deleteTarget && (
                <ConfirmModal
                    title={`Delete VLAN ${deleteTarget.vlan_id} — ${deleteTarget.name}?`}
                    message="This will permanently delete this VLAN record."
                    confirmText="Delete"
                    confirmIcon="fa-trash"
                    confirmClass="bg-error text-white"
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteTarget(null)} />
            )}
        </div>
    );
}

function VlanForm({ form, setForm, onSave, onCancel, t, editing }) {
    return (
        <form onSubmit={onSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.vlanId')}</label>
                    <input type="number" min="1" max="4094" value={form.vlan_id}
                        onChange={e => setForm(f => ({ ...f, vlan_id: e.target.value }))} required
                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.name')}</label>
                    <input type="text" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                        placeholder="e.g. Management"
                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.subnet')}</label>
                    <input type="text" value={form.subnet}
                        onChange={e => setForm(f => ({ ...f, subnet: e.target.value }))}
                        placeholder="e.g. 192.168.1.0/24"
                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.gateway')}</label>
                    <input type="text" value={form.gateway}
                        onChange={e => setForm(f => ({ ...f, gateway: e.target.value }))}
                        placeholder="e.g. 192.168.1.1"
                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.domain')}</label>
                    <input type="text" value={form.domain}
                        onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                        placeholder="e.g. corp.local"
                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.description')}</label>
                    <input type="text" value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="e.g. Corporate network users"
                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                </div>
            </div>
            <div>
                <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('vlans.notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all resize-y"
                    placeholder={t('vlans.notesPlaceholder')} />
            </div>
            <div className="flex items-center gap-2 pt-1">
                <button type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 transition-all shadow-sm">
                    <i className="fas fa-save text-xs"></i>
                    {editing ? t('vlans.update') : t('vlans.save')}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-4 py-2.5 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors rounded-xl hover:bg-base-300/50">
                    {t('vlans.cancel')}
                </button>
            </div>
        </form>
    );
}
