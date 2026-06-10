import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TerminalModal from '../components/TerminalModal';

export default function SwitchConfigs() {
    const { t } = useLang();
    const { toast } = useToast();
    const { user } = useAuth();
    const canManage = user?.role === 'config_manager';
    const [configs, setConfigs] = useState([]);
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [versions, setVersions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [tab, setTab] = useState('config');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [showTerminal, setShowTerminal] = useState(false);
    const [showTools, setShowTools] = useState(false);

    const [form, setForm] = useState({ hostname: '', vendor: '', model: '', os_version: '', serial_number: '', ports_count: '', target_id: '', config_text: '' });
    const [targetSearch, setTargetSearch] = useState('');
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);
    const targetFiltered = targets.filter(tg =>
        tg.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
        tg.ip_address.toLowerCase().includes(targetSearch.toLowerCase())
    ).slice(0, 20);

    const fetchConfigs = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/switch-configs');
            setConfigs(data);
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    useEffect(() => {
        axios.get('/api/targets').then(({ data }) => setTargets(data)).catch(() => {});
    }, []);

    const openDetail = async (c) => {
        setSelected(c);
        setTab('config');
        try {
            const { data } = await axios.get(`/api/switch-configs/${c.id}/versions`);
            setVersions(data);
        } catch { setVersions([]); }
    };

    const resetForm = () => {
        setForm({ hostname: '', vendor: '', model: '', os_version: '', serial_number: '', ports_count: '', target_id: '', config_text: '' });
        setTargetSearch('');
        setEditing(null);
        setShowForm(false);
    };

    const openEdit = () => {
        if (!selected) return;
        setEditing(selected);
        setTargetSearch(selected.target ? `${selected.target.name} (${selected.target.ip_address})` : '');
        setForm({
            hostname: selected.hostname,
            vendor: selected.vendor || '',
            model: selected.model || '',
            os_version: selected.os_version || '',
            serial_number: selected.serial_number || '',
            ports_count: selected.ports_count || '',
            target_id: selected.target?.id || '',
            config_text: selected.config_text || '',
        });
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                hostname: form.hostname,
                vendor: form.vendor || null,
                model: form.model || null,
                os_version: form.os_version || null,
                serial_number: form.serial_number || null,
                ports_count: form.ports_count ? parseInt(form.ports_count, 10) : null,
                target_id: form.target_id || null,
                config_text: form.config_text || null,
            };
            if (editing) {
                const { data } = await axios.post(`/api/switch-configs/${editing.id}/versions`, payload);
                toast(t('configs.updated'), 'success');
                await fetchConfigs();
                await openDetail(data);
            } else {
                const { data } = await axios.post('/api/switch-configs', payload);
                toast(t('configs.created'), 'success');
                setSelected(data);
                await fetchConfigs();
            }
            resetForm();
        } catch (err) {
            if (err.response?.data?.errors) {
                const first = Object.values(err.response.data.errors).flat()[0];
                toast(first || t('configs.saveFailed'), 'error');
            } else {
                toast(err.response?.data?.message || err.message || t('configs.saveFailed'), 'error');
            }
        } finally { setSaving(false); }
    };

    const handleDelete = async (c) => {
        if (!confirm(t('configs.confirmDelete'))) return;
        setDeleting(c.id);
        try {
            await axios.delete(`/api/switch-configs/${c.id}`);
            toast(t('configs.deleted'), 'success');
            if (selected?.id === c.id) { setSelected(null); setVersions([]); }
            await fetchConfigs();
        } catch {
            toast(t('configs.deleteFailed'), 'error');
        } finally { setDeleting(null); }
    };

    const loadVersion = (v) => {
        setSelected(prev => prev ? { ...prev, ...v } : v);
        setTab('config');
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-5xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-sm font-bold text-base-content">{t('configs.title')}</h1>
                        <p className="text-xs text-base-content/40 mt-0.5">{t('configs.subtitle')}</p>
                    </div>
                    {canManage && !showForm && (
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button onClick={() => setShowTools(!showTools)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-base-content/50 border border-base-300 rounded-lg hover:text-base-content hover:bg-base-300/50 transition-all">
                                    <i className="fas fa-wrench text-[8px]"></i>
                                    Tools
                                    <i className={`fas fa-chevron-down text-[6px] transition-transform ${showTools ? 'rotate-180' : ''}`}></i>
                                </button>
                                {showTools && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowTools(false)}></div>
                                        <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-base-200 border border-base-300 rounded-xl shadow-xl overflow-hidden">
                                            {selected && (
                                                <button onClick={() => { setShowTools(false); setShowTerminal(true); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-base-content/70 hover:text-base-content hover:bg-base-300/50 transition-all text-left">
                                                    <i className="fas fa-terminal text-[9px]"></i>
                                                    Terminal
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <button onClick={() => { resetForm(); setShowForm(true); }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold border border-primary/40 text-primary rounded-lg hover:bg-primary/10 transition-colors">
                                <i className="fas fa-plus text-[8px]"></i>
                                {t('configs.newConfig')}
                            </button>
                        </div>
                    )}
                </div>

                {canManage && showForm && (
                    <div className="form-enter modal-glass border border-base-300 rounded-xl p-5 mb-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-sm font-semibold text-base-content">
                                    {editing ? t('configs.editConfig') : t('configs.newConfig')}
                                </h2>
                            </div>
                            <button onClick={resetForm} className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.hostname')}</label>
                                    <input type="text" value={form.hostname} onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))} required
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.vendor')}</label>
                                    <input type="text" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                                        placeholder="e.g. Cisco, Juniper"
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.model')}</label>
                                    <input type="text" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                                        placeholder="e.g. Catalyst 9300"
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.osVersion')}</label>
                                    <input type="text" value={form.os_version} onChange={e => setForm(f => ({ ...f, os_version: e.target.value }))}
                                        placeholder="e.g. 17.9.1"
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.serialNumber')}</label>
                                    <input type="text" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                                        placeholder="e.g. FOC1234ABCD"
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.portsCount')}</label>
                                    <input type="number" min="0" max="65535" value={form.ports_count} onChange={e => setForm(f => ({ ...f, ports_count: e.target.value }))}
                                        placeholder="e.g. 48"
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.target')}</label>
                                <input type="text" value={targetSearch}
                                        onChange={e => { setTargetSearch(e.target.value); setShowTargetDropdown(true); }}
                                        onFocus={() => setShowTargetDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowTargetDropdown(false), 200)}
                                        placeholder={t('configs.targetPlaceholder') || 'Search by name or IP...'}
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                    {showTargetDropdown && targetSearch && (
                                        <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {targetFiltered.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-base-content/40">{t('configs.noTargets') || 'No targets found'}</div>
                                            ) : targetFiltered.map(tg => (
                                                <div key={tg.id} onMouseDown={() => { setForm(f => ({ ...f, target_id: tg.id })); setTargetSearch(`${tg.name} (${tg.ip_address})`); setShowTargetDropdown(false); }}
                                                    className={`px-3 py-2 text-xs cursor-pointer transition-colors hover:bg-primary/10 ${form.target_id === tg.id ? 'bg-primary/5 text-primary font-semibold' : 'text-base-content'}`}>
                                                    {tg.name} <span className="text-base-content/40">({tg.ip_address})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                            <div>
                                <label className="block text-xs font-medium text-base-content/60 mb-1">{t('configs.configText')}</label>
                                <textarea value={form.config_text} onChange={e => setForm(f => ({ ...f, config_text: e.target.value }))}
                                    rows={12} spellCheck={false}
                                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm font-mono text-base-content outline-none focus:border-primary/60 transition-colors resize-y"
                                    placeholder="Paste device configuration here..." />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                    {saving ? t('configs.saving') : t('configs.save')}
                                </button>
                                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-base-content/50 hover:text-base-content transition-colors">
                                    {t('configs.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: selected ? '1fr 1fr' : '1fr' }}>
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-base-content/30">
                                <span className="loading loading-spinner loading-md"></span>
                            </div>
                        ) : configs.length === 0 ? (
                            <div className="bg-base-200 border border-base-300 border-dashed rounded-xl flex items-center justify-center py-16 text-base-content/30">
                                <div className="text-center">
                                    <i className="fas fa-server text-3xl block mb-3 opacity-30"></i>
                                    <p className="text-sm">{t('configs.noConfigs')}</p>
                                    <p className="text-xs mt-1 opacity-70">{t('configs.noConfigsHint')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-base-300 text-base-content/40 font-medium">
                                            <th className="text-start px-4 py-2.5">{t('configs.hostname')}</th>
                                            <th className="text-start px-4 py-2.5">{t('configs.vendor')}</th>
                                            <th className="text-start px-4 py-2.5 hidden sm:table-cell">{t('configs.model')}</th>
                                            <th className="text-center px-4 py-2.5">#</th>
                                            <th className="text-end px-4 py-2.5 hidden md:table-cell">{t('configs.lastUpdated')}</th>
                                            {canManage && <th className="text-end px-4 py-2.5">{t('configs.actions')}</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {configs.map(c => (
                                            <tr key={c.id}
                                                onClick={() => openDetail(c)}
                                                className={`border-b border-base-300/60 cursor-pointer transition-colors hover:bg-base-300/20 ${
                                                    selected?.id === c.id ? 'bg-primary/5' : ''
                                                }`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fas fa-network-wired text-[10px] text-base-content/30"></i>
                                                        <span className="font-semibold text-base-content">{c.hostname}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-base-content/60">{c.vendor || '—'}</td>
                                                <td className="px-4 py-3 text-base-content/60 hidden sm:table-cell">{c.model || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300 text-base-content/50 font-semibold">
                                                        v{c.version}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-base-content/40 hidden md:table-cell text-end">
                                                    {new Date(c.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                {canManage && (
                                                <td className="px-4 py-3 text-end">
                                                    <button onClick={e => { e.stopPropagation(); handleDelete(c); }} disabled={deleting === c.id}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-error hover:bg-error/10 transition-all disabled:opacity-40">
                                                        {deleting === c.id
                                                            ? <span className="loading loading-spinner loading-xs"></span>
                                                            : <i className="fas fa-trash text-[10px]"></i>}
                                                    </button>
                                                </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {selected && (
                        <div className="bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                            <div className="border-b border-base-300">
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-network-wired text-xs text-primary"></i>
                                        <span className="text-sm font-bold text-base-content">{selected.hostname}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setShowTerminal(true)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all"
                                            title={t('configs.terminal') || 'Terminal'}>
                                            <i className="fas fa-terminal text-[10px]"></i>
                                        </button>
                                        <a href={`/api/switch-configs/${selected.id}/export-pdf`} target="_blank" rel="noopener noreferrer"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all"
                                            title={t('configs.exportPdf')}>
                                            <i className="fas fa-file-pdf text-[10px]"></i>
                                        </a>
                                        {canManage && (
                                            <>
                                                <button onClick={openEdit}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all">
                                                    <i className="fas fa-pen text-[10px]"></i>
                                                </button>
                                                <button onClick={() => handleDelete(selected)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-error hover:bg-error/10 transition-all">
                                                    <i className="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4 px-4 pb-2">
                                    <button onClick={() => setTab('config')}
                                        className={`text-xs font-medium pb-1.5 border-b-2 transition-colors ${
                                            tab === 'config' ? 'text-primary border-primary' : 'text-base-content/40 border-transparent hover:text-base-content/60'
                                        }`}>
                                        {t('configs.configText')}
                                    </button>
                                    <button onClick={() => setTab('history')}
                                        className={`text-xs font-medium pb-1.5 border-b-2 transition-colors ${
                                            tab === 'history' ? 'text-primary border-primary' : 'text-base-content/40 border-transparent hover:text-base-content/60'
                                        }`}>
                                        {t('configs.history')} ({versions.length})
                                    </button>
                                </div>
                            </div>

                            {tab === 'config' ? (
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.vendor')}</span>
                                            <p className="font-medium text-base-content">{selected.vendor || '—'}</p>
                                        </div>
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.model')}</span>
                                            <p className="font-medium text-base-content">{selected.model || '—'}</p>
                                        </div>
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.osVersion')}</span>
                                            <p className="font-medium text-base-content">{selected.os_version || '—'}</p>
                                        </div>
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.serialNumber')}</span>
                                            <p className="font-medium text-base-content">{selected.serial_number || '—'}</p>
                                        </div>
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.portsCount')}</span>
                                            <p className="font-medium text-base-content">{selected.ports_count ?? '—'}</p>
                                        </div>
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.version')}</span>
                                            <p className="font-medium text-base-content">v{selected.version}</p>
                                        </div>
                                        <div className="bg-base-100 rounded-lg px-3 py-2">
                                            <span className="text-base-content/40">{t('configs.target')}</span>
                                            <p className="font-medium text-base-content">{selected.target?.name || '—'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-medium text-base-content/60">{t('configs.configText')}</span>
                                            <span className="text-[10px] text-base-content/30">{t('configs.createdBy')} {selected.created_by || '—'}</span>
                                        </div>
                                        <pre className="bg-base-100 border border-base-300 rounded-lg p-3 text-xs font-mono text-base-content/80 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                                            {selected.config_text || t('configs.noConfigText')}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4">
                                    {versions.length === 0 ? (
                                        <div className="text-center py-8 text-base-content/30 text-xs">{t('configs.noVersions')}</div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {versions.map(v => (
                                                <div key={v.id}
                                                    onClick={() => loadVersion(v)}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                                        selected.id === v.id ? 'bg-primary/10' : 'bg-base-100 hover:bg-base-300/30'
                                                    }`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300 text-base-content/50 font-semibold">v{v.version}</span>
                                                        <span className="text-xs text-base-content/50">{v.created_by || '—'}</span>
                                                    </div>
                                                    <span className="text-[10px] text-base-content/30">
                                                        {v.created_at ? new Date(v.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showTerminal && selected?.target && (
                <TerminalModal target={selected.target} onClose={() => setShowTerminal(false)} />
            )}
        </div>
    );
}
