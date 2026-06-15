import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TerminalModal from '../components/TerminalModal';
import ConfirmModal from '../components/ConfirmModal';

export default function SwitchConfigs() {
    const { t } = useLang();
    const { toast } = useToast();
    const { user } = useAuth();
    const canManage = user?.role === 'admin' || user?.role === 'config_manager';
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
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [showTerminal, setShowTerminal] = useState(null); // null=closed, 'blank'=Tools, 'config'=detail
    const [showTools, setShowTools] = useState(false);

    const [form, setForm] = useState({ hostname: '', vendor: '', model: '', os_version: '', serial_number: '', ports_count: '', target_id: '', config_text: '', ssh_host: '', ssh_port: '22', ssh_username: '', ssh_password: '', ssh_protocol: 'ssh' });
    const [showSsh, setShowSsh] = useState(false);
    const [targetSearch, setTargetSearch] = useState('');
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);
    const targetFiltered = targets.filter(tg =>
        (!tg.type || tg.type === 'switch') &&
        (tg.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
         tg.ip_address.toLowerCase().includes(targetSearch.toLowerCase()))
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
        setForm({ hostname: '', vendor: '', model: '', os_version: '', serial_number: '', ports_count: '', target_id: '', config_text: '', ssh_host: '', ssh_port: '22', ssh_username: '', ssh_password: '', ssh_protocol: 'ssh' });
        setTargetSearch('');
        setEditing(null);
        setShowForm(false);
        setShowSsh(false);
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
            ssh_host: selected.ssh_host || '',
            ssh_port: selected.ssh_port || '22',
            ssh_username: selected.ssh_username || '',
            ssh_password: '',
            ssh_protocol: selected.ssh_protocol || 'ssh',
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
                ssh_host: form.ssh_host || null,
                ssh_port: form.ssh_port ? parseInt(form.ssh_port, 10) : null,
                ssh_username: form.ssh_username || null,
                ssh_password: form.ssh_password || null,
                ssh_protocol: form.ssh_protocol || 'ssh',
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
            const msg = err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat()[0]
                : err.response?.data?.message || err.message || t('configs.saveFailed');
            toast(msg, 'error');
        } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(deleteTarget.id);
        try {
            await axios.delete(`/api/switch-configs/${deleteTarget.id}`, {
                data: { admin_password: adminPassword },
            });
            toast(t('configs.deleted'), 'success');
            if (selected?.id === deleteTarget.id) { setSelected(null); setVersions([]); }
            await fetchConfigs();
            setDeleteTarget(null);
            setAdminPassword('');
        } catch (err) {
            const msg = err.response?.data?.errors?.admin_password?.[0] || t('configs.deleteFailed');
            toast(msg, 'error');
        } finally { setDeleting(null); }
    };

    const loadVersion = (v) => {
        setSelected(prev => prev ? { ...prev, ...v } : v);
        setTab('config');
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-6xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                            <i className="fas fa-network-wired text-primary text-sm"></i>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-base-content">{t('configs.title')}</h1>
                            <p className="text-xs text-base-content/40">{t('configs.subtitle')}</p>
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
                                        <button onClick={() => { setShowTools(false); setShowTerminal('blank'); }}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-base-content/70 hover:text-base-content hover:bg-base-300/50 transition-all text-left">
                                            <i className="fas fa-terminal text-[10px]"></i>
                                            Terminal
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        {canManage && !showForm && (
                            <button onClick={() => { resetForm(); setShowForm(true); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 transition-all shadow-sm">
                                <i className="fas fa-plus text-[10px]"></i>
                                {t('configs.newConfig')}
                            </button>
                        )}
                    </div>
                </div>

                {canManage && showForm && (
                    <div className="bg-base-200 border border-base-300 rounded-2xl p-5 mb-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                                    <i className={`fas ${editing ? 'fa-pen' : 'fa-plus'} text-primary text-xs`}></i>
                                </div>
                                <h2 className="text-sm font-bold text-base-content">
                                    {editing ? t('configs.editConfig') : t('configs.newConfig')}
                                </h2>
                            </div>
                            <button onClick={resetForm} className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.hostname')}</label>
                                    <input type="text" value={form.hostname} onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))} required
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.vendor')}</label>
                                    <input type="text" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                                        placeholder="e.g. Cisco, Juniper"
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.model')}</label>
                                    <input type="text" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                                        placeholder="e.g. Catalyst 9300"
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.osVersion')}</label>
                                    <input type="text" value={form.os_version} onChange={e => setForm(f => ({ ...f, os_version: e.target.value }))}
                                        placeholder="e.g. 17.9.1"
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.serialNumber')}</label>
                                    <input type="text" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                                        placeholder="e.g. FOC1234ABCD"
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.portsCount')}</label>
                                    <input type="number" min="0" max="65535" value={form.ports_count} onChange={e => setForm(f => ({ ...f, ports_count: e.target.value }))}
                                        placeholder="e.g. 48"
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.target')}</label>
                                <input type="text" value={targetSearch}
                                    onChange={e => { setTargetSearch(e.target.value); setShowTargetDropdown(true); }}
                                    onFocus={() => setShowTargetDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowTargetDropdown(false), 200)}
                                    placeholder={t('configs.targetPlaceholder') || 'Search by name or IP...'}
                                    className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                {showTargetDropdown && targetSearch && (
                                    <div className="absolute z-10 mt-1 w-full bg-base-100 border border-base-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {targetFiltered.length === 0 ? (
                                            <div className="px-4 py-2.5 text-xs text-base-content/40">No targets found</div>
                                        ) : targetFiltered.map(tg => (
                                            <div key={tg.id} onMouseDown={() => { setForm(f => ({ ...f, target_id: tg.id })); setTargetSearch(`${tg.name} (${tg.ip_address})`); setShowTargetDropdown(false); }}
                                                className={`px-4 py-2.5 text-xs cursor-pointer transition-colors hover:bg-primary/10 ${form.target_id === tg.id ? 'bg-primary/5 text-primary font-semibold' : 'text-base-content'}`}>
                                                {tg.name} <span className="text-base-content/40">({tg.ip_address})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-base-300 pt-4">
                                <button type="button" onClick={() => setShowSsh(!showSsh)}
                                    className="flex items-center gap-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors">
                                    <i className={`fas fa-terminal text-[10px]`}></i>
                                    SSH Credentials
                                    <i className={`fas fa-chevron-down text-[8px] transition-transform ${showSsh ? 'rotate-180' : ''}`}></i>
                                </button>
                            </div>
                            {showSsh && (
                                <div className="grid grid-cols-5 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Protocol</label>
                                        <div className="flex bg-base-100 border border-base-300 rounded-xl overflow-hidden">
                                            <button type="button" onClick={() => setForm(f => ({ ...f, ssh_protocol: 'ssh', ssh_port: f.ssh_port === '23' ? '22' : f.ssh_port }))}
                                                className={`flex-1 px-2 py-2 text-[10px] font-bold transition-all ${form.ssh_protocol === 'ssh' ? 'bg-primary/20 text-primary' : 'text-base-content/40 hover:text-base-content/60'}`}>
                                                SSH
                                            </button>
                                            <button type="button" onClick={() => setForm(f => ({ ...f, ssh_protocol: 'telnet', ssh_port: f.ssh_port === '22' ? '23' : f.ssh_port }))}
                                                className={`flex-1 px-2 py-2 text-[10px] font-bold transition-all ${form.ssh_protocol === 'telnet' ? 'bg-primary/20 text-primary' : 'text-base-content/40 hover:text-base-content/60'}`}>
                                                Telnet
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.sshHost') || 'Host'}</label>
                                        <input type="text" value={form.ssh_host} onChange={e => setForm(f => ({ ...f, ssh_host: e.target.value }))}
                                            placeholder="e.g. 192.168.1.1"
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.sshPort') || 'Port'}</label>
                                        <input type="number" min="1" max="65535" value={form.ssh_port} onChange={e => setForm(f => ({ ...f, ssh_port: e.target.value }))}
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.sshUsername') || 'Username'}</label>
                                        <input type="text" value={form.ssh_username} onChange={e => setForm(f => ({ ...f, ssh_username: e.target.value }))}
                                            placeholder="e.g. admin"
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.sshPassword') || 'Password'}</label>
                                        <input type="password" value={form.ssh_password} onChange={e => setForm(f => ({ ...f, ssh_password: e.target.value }))}
                                            placeholder="●●●●●●●●"
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('configs.configText')}</label>
                                <textarea value={form.config_text} onChange={e => setForm(f => ({ ...f, config_text: e.target.value }))}
                                    rows={12} spellCheck={false}
                                    className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm font-mono text-base-content outline-none focus:border-primary/50 transition-all resize-y"
                                    placeholder="Paste device configuration here..." />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
                                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                    {saving ? t('configs.saving') : t('configs.save')}
                                </button>
                                <button type="button" onClick={resetForm}
                                    className="px-4 py-2.5 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors rounded-xl hover:bg-base-300/50">
                                    {t('configs.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr' }}>
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-base-content/30">
                                <span className="loading loading-spinner loading-md"></span>
                            </div>
                        ) : configs.length === 0 ? (
                            <div className="bg-base-200 border border-base-300 border-dashed rounded-2xl flex items-center justify-center py-20 text-base-content/30">
                                <div className="text-center">
                                    <i className="fas fa-server text-4xl block mb-3 opacity-20"></i>
                                    <p className="text-sm font-medium">{t('configs.noConfigs')}</p>
                                    <p className="text-xs mt-1 opacity-70">{t('configs.noConfigsHint')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {configs.map(c => {
                                    const isSel = selected?.id === c.id;
                                    return (
                                        <div key={c.id} onClick={() => openDetail(c)}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                                                isSel
                                                    ? 'bg-primary/10 border-primary/30 shadow-sm'
                                                    : 'bg-base-200 border-base-300 hover:border-primary/20 hover:bg-base-200/80'
                                            }`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    isSel ? 'bg-primary/20' : 'bg-base-300'
                                                }`}>
                                                    <i className={`fas fa-network-wired text-xs ${isSel ? 'text-primary' : 'text-base-content/30'}`}></i>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-base-content truncate">{c.hostname}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300 text-base-content/50 font-semibold flex-shrink-0">v{c.version}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-base-content/40 mt-0.5">
                                                        {c.vendor && <span>{c.vendor}</span>}
                                                        {c.vendor && c.model && <span>·</span>}
                                                        {c.model && <span>{c.model}</span>}
                                                        {c.target?.name && <><span>·</span><span>{c.target.name}</span></>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <span className="text-[10px] text-base-content/30 hidden sm:block mr-1">
                                                    {new Date(c.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                                {canManage && (
                                                    <button onClick={e => { e.stopPropagation(); setDeleteTarget(c); setAdminPassword(''); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-error hover:bg-error/10 transition-all">
                                                        <i className="fas fa-trash text-[10px]"></i>
                                                    </button>
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
                                        <i className="fas fa-network-wired text-sm text-primary"></i>
                                        <span className="text-base font-bold text-base-content">{selected.hostname}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setShowTerminal('config')}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all"
                                            title={t('configs.terminal') || 'Terminal'}>
                                            <i className="fas fa-terminal text-xs"></i>
                                        </button>
                                        <a href={`/api/switch-configs/${selected.id}/export-pdf`} target="_blank" rel="noopener noreferrer"
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all"
                                            title={t('configs.exportPdf')}>
                                            <i className="fas fa-file-pdf text-xs"></i>
                                        </a>
                                        {canManage && (
                                            <>
                                                <button onClick={openEdit}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-primary hover:bg-primary/10 transition-all">
                                                    <i className="fas fa-pen text-xs"></i>
                                                </button>
                                                <button onClick={() => { setDeleteTarget(selected); setAdminPassword(''); }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-error hover:bg-error/10 transition-all">
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => { setSelected(null); setVersions([]); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all ml-auto"
                                            title="Close">
                                            <i className="fas fa-times text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-5 px-5 pb-2">
                                    <button onClick={() => setTab('config')}
                                        className={`text-xs font-medium pb-2 border-b-2 transition-colors ${
                                            tab === 'config' ? 'text-primary border-primary' : 'text-base-content/40 border-transparent hover:text-base-content/60'
                                        }`}>
                                        <i className="fas fa-file-code text-[10px] mr-1.5"></i>
                                        Config
                                    </button>
                                    <button onClick={() => setTab('history')}
                                        className={`text-xs font-medium pb-2 border-b-2 transition-colors ${
                                            tab === 'history' ? 'text-primary border-primary' : 'text-base-content/40 border-transparent hover:text-base-content/60'
                                        }`}>
                                        <i className="fas fa-history text-[10px] mr-1.5"></i>
                                        History ({versions.length})
                                    </button>
                                </div>
                            </div>

                            {tab === 'config' ? (
                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Vendor', value: selected.vendor, icon: 'fa-building' },
                                            { label: 'Model', value: selected.model, icon: 'fa-microchip' },
                                            { label: 'OS Version', value: selected.os_version, icon: 'fa-code-branch' },
                                            { label: 'Serial', value: selected.serial_number, icon: 'fa-barcode' },
                                            { label: 'Ports', value: selected.ports_count, icon: 'fa-plug' },
                                            { label: 'Version', value: `v${selected.version}`, icon: 'fa-tag' },
                                            { label: 'Target', value: selected.target?.name, icon: 'fa-crosshairs' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-base-100 rounded-xl px-4 py-3 border border-base-300/50">
                                                <div className="flex items-center gap-1.5 text-[10px] text-base-content/40 mb-1">
                                                    <i className={`fas ${s.icon}`}></i>
                                                    <span>{s.label}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-base-content">{s.value || '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-medium text-base-content/50 flex items-center gap-1.5">
                                                <i className="fas fa-file-code text-[10px]"></i>
                                                Configuration
                                            </span>
                                            <span className="text-[10px] text-base-content/30">{t('configs.createdBy')} {selected.created_by || '—'}</span>
                                        </div>
                                        <pre className="bg-base-100 border border-base-300 rounded-xl p-4 text-xs font-mono text-base-content/80 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
                                            {selected.config_text || t('configs.noConfigText')}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5">
                                    {versions.length === 0 ? (
                                        <div className="text-center py-10 text-base-content/30 text-xs">No version history</div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {versions.map(v => (
                                                <div key={v.id} onClick={() => loadVersion(v)}
                                                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                                                        selected.id === v.id ? 'bg-primary/10 border-primary/30' : 'bg-base-100 border-base-300 hover:border-primary/20'
                                                    }`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                            selected.id === v.id ? 'bg-primary/20' : 'bg-base-300'
                                                        }`}>
                                                            <i className={`fas fa-code-branch text-[10px] ${selected.id === v.id ? 'text-primary' : 'text-base-content/30'}`}></i>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-semibold text-base-content">v{v.version}</span>
                                                            <span className="text-[10px] text-base-content/40 ml-2">{v.created_by || '—'}</span>
                                                        </div>
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

            {deleteTarget && (
                <ConfirmModal
                    title={`Delete "${deleteTarget.hostname}"?`}
                    message="This action requires your password to confirm."
                    confirmText="Delete"
                    confirmIcon="fa-trash"
                    confirmClass="bg-error text-white"
                    onConfirm={confirmDelete}
                    onClose={() => { setDeleteTarget(null); setAdminPassword(''); }}>
                    <div className="mb-4">
                        <label className="block text-[11px] font-semibold text-base-content/50 mb-1.5">
                            <i className="fas fa-lock text-[9px] mr-1"></i>
                            Enter your password to confirm
                        </label>
                        <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                            className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/50 transition-all"
                            placeholder="Your password"
                            autoFocus />
                    </div>
                </ConfirmModal>
            )}

            {showTerminal === 'config' && (
                <TerminalModal target={selected?.target || null}
                    sshConfig={selected?.ssh_host ? {
                        host: selected.ssh_host,
                        port: selected.ssh_port || (selected.ssh_protocol === 'telnet' ? 23 : 22),
                        username: selected.ssh_username || '',
                        password: selected.ssh_password || '',
                        protocol: selected.ssh_protocol || 'ssh',
                    } : null}
                    onClose={() => setShowTerminal(null)} />
            )}
            {showTerminal === 'blank' && (
                <TerminalModal target={null} sshConfig={null} onClose={() => setShowTerminal(null)} />
            )}
        </div>
    );
}
