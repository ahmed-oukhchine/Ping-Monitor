import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function Vlans() {
    const { t } = useLang();
    const { toast } = useToast();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [vlans, setVlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ vlan_id: '', name: '', description: '', subnet: '', gateway: '', domain: '', notes: '' });

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
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = { ...form, vlan_id: Number(form.vlan_id) };
        try {
            if (editing) {
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

    const handleDelete = async (v) => {
        if (!confirm(t('vlans.confirmDelete', { id: v.vlan_id, name: v.name }))) return;
        try {
            await axios.delete(`/api/vlans/${v.id}`);
            toast(t('vlans.deleted'), 'success');
            await fetchVlans();
        } catch {
            toast(t('vlans.deleteFailed'), 'error');
        }
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-5xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-sm font-bold text-base-content">{t('vlans.title')}</h1>
                        <p className="text-xs text-base-content/40 mt-0.5">{t('vlans.subtitle')}</p>
                    </div>
                    {isAdmin && !editing && (
                        <button onClick={() => { resetForm(); setEditing('new'); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold border border-primary/40 text-primary rounded-lg hover:bg-primary/10 transition-colors">
                            <i className="fas fa-plus text-[8px]"></i>
                            {t('vlans.addVlan')}
                        </button>
                    )}
                </div>

                {isAdmin && editing === 'new' && (
                    <div className="form-enter modal-glass border border-base-300 rounded-xl p-5 mb-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-sm font-semibold text-base-content">{t('vlans.newVlan')}</h2>
                            </div>
                            <button onClick={resetForm} className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <VlanForm form={form} setForm={setForm} onSave={handleSave} onCancel={resetForm} t={t} />
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-base-content/30">
                        <span className="loading loading-spinner loading-md"></span>
                    </div>
                ) : vlans.length === 0 ? (
                    <div className="bg-base-200 border border-base-300 border-dashed rounded-xl flex items-center justify-center py-16 text-base-content/30">
                        <div className="text-center">
                            <i className="fas fa-sitemap text-3xl block mb-3 opacity-30"></i>
                            <p className="text-sm">{t('vlans.noVlans')}</p>
                            <p className="text-xs mt-1 opacity-70">{t('vlans.noVlansHint')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-base-300 text-base-content/40 font-medium">
                                    <th className="text-start px-4 py-2.5">{t('vlans.vlanId')}</th>
                                    <th className="text-start px-4 py-2.5">{t('vlans.name')}</th>
                                    <th className="text-start px-4 py-2.5 hidden sm:table-cell">{t('vlans.subnet')}</th>
                                    <th className="text-start px-4 py-2.5 hidden md:table-cell">{t('vlans.description')}</th>
                                    {isAdmin && <th className="text-end px-4 py-2.5">{t('vlans.actions')}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {vlans.map(v => (
                                    <tr key={v.id}
                                        className={`border-b border-base-300/60 transition-colors hover:bg-base-300/20 ${
                                            editing?.id === v.id ? 'bg-primary/5' : ''
                                        }`}>
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-base-content">VLAN {v.vlan_id}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-base-content">{v.name}</div>
                                            {v.domain && <div className="text-[10px] text-base-content/30 mt-0.5">{v.domain}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-base-content/60 hidden sm:table-cell font-mono">{v.subnet || '—'}</td>
                                        <td className="px-4 py-3 text-base-content/60 hidden md:table-cell">{v.description || '—'}</td>
                                        {isAdmin && (
                                        <td className="px-4 py-3 text-end">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(v)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-primary hover:bg-primary/10 transition-all">
                                                    <i className="fas fa-pen text-[10px]"></i>
                                                </button>
                                                <button onClick={() => handleDelete(v)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-error hover:bg-error/10 transition-all">
                                                    <i className="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </div>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {isAdmin && editing && editing !== 'new' && (
                    <div className="form-enter modal-glass border border-base-300 rounded-xl p-5 mt-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-sm font-semibold text-base-content">
                                    {t('vlans.editVlan')} — VLAN {editing.vlan_id}
                                </h2>
                            </div>
                            <button onClick={resetForm} className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <VlanForm form={form} setForm={setForm} onSave={handleSave} onCancel={resetForm} t={t} editing />
                    </div>
                )}
            </div>
        </div>
    );
}

function VlanForm({ form, setForm, onSave, onCancel, t, editing }) {
    return (
        <form onSubmit={onSave} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.vlanId')}</label>
                    <input type="number" min="1" max="4094" value={form.vlan_id}
                        onChange={e => setForm(f => ({ ...f, vlan_id: e.target.value }))} required
                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.name')}</label>
                    <input type="text" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                        placeholder="e.g. Management"
                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.subnet')}</label>
                    <input type="text" value={form.subnet}
                        onChange={e => setForm(f => ({ ...f, subnet: e.target.value }))}
                        placeholder="e.g. 192.168.1.0/24"
                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.gateway')}</label>
                    <input type="text" value={form.gateway}
                        onChange={e => setForm(f => ({ ...f, gateway: e.target.value }))}
                        placeholder="e.g. 192.168.1.1"
                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.domain')}</label>
                    <input type="text" value={form.domain}
                        onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                        placeholder="e.g. corp.local"
                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div></div>
            </div>
            <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.description')}</label>
                <input type="text" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Corporate network users"
                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
            </div>
            <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1">{t('vlans.notes')}</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors resize-y"
                    placeholder={t('vlans.notesPlaceholder')} />
            </div>
            <div className="flex items-center gap-2 pt-1">
                <button type="submit"
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                    <i className="fas fa-save text-xs"></i>
                    {editing ? t('vlans.update') : t('vlans.save')}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-base-content/50 hover:text-base-content transition-colors">
                    {t('vlans.cancel')}
                </button>
            </div>
        </form>
    );
}
