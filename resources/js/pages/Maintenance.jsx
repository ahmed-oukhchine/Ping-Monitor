import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const DAY_LABELS = ['maintenance.sunday', 'maintenance.monday', 'maintenance.tuesday', 'maintenance.wednesday', 'maintenance.thursday', 'maintenance.friday', 'maintenance.saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Maintenance() {
    const { t } = useLang();
    const { toast } = useToast();
    const [schedules, setSchedules] = useState([]);
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', target_ids: [], days_of_week: [], start_time: '02:00', end_time: '04:00' });

    const fetchAll = () => {
        setLoading(true);
        Promise.all([
            axios.get('/api/maintenance-schedules').then(r => setSchedules(r.data)),
            axios.get('/api/maintenance-targets').then(r => setTargets(r.data)),
        ]).finally(() => setLoading(false));
    };

    useEffect(() => { fetchAll(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', target_ids: [], days_of_week: [], start_time: '02:00', end_time: '04:00' });
        setShowForm(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, target_ids: s.target_ids, days_of_week: s.days_of_week ?? [], start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) });
        setShowForm(true);
    };

    const toggleTarget = (id) => {
        setForm(f => ({ ...f, target_ids: f.target_ids.includes(id) ? f.target_ids.filter(x => x !== id) : [...f.target_ids, id] }));
    };

    const save = async () => {
        if (!form.name || form.target_ids.length === 0 || !form.start_time || !form.end_time) return;
        try {
            const payload = { ...form, days_of_week: form.days_of_week.length > 0 ? form.days_of_week : null };
            if (editing) {
                await axios.put(`/api/maintenance-schedules/${editing.id}`, payload);
                toast(t('maintenance.updated'));
            } else {
                await axios.post('/api/maintenance-schedules', payload);
                toast(t('maintenance.created'));
            }
            setShowForm(false);
            setEditing(null);
            fetchAll();
        } catch {
            toast(t('maintenance.saveError'), 'error');
        }
    };

    const toggleActive = async (s) => {
        try {
            await axios.post(`/api/maintenance-schedules/${s.id}/toggle`);
            toast(s.is_active ? t('maintenance.disabled') : t('maintenance.enabled'));
            fetchAll();
        } catch {
            toast(t('maintenance.toggleError'), 'error');
        }
    };

    const del = async (s) => {
        if (!window.confirm(t('maintenance.confirmDelete'))) return;
        try {
            await axios.delete(`/api/maintenance-schedules/${s.id}`);
            toast(t('maintenance.deleted'));
            fetchAll();
        } catch {
            toast(t('maintenance.deleteError'), 'error');
        }
    };

    const dayLabel = (days) => {
        if (!days || days.length === 0) return t('maintenance.daily');
        return days.sort().map(d => DAY_SHORT[d] || '—').join(', ');
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-4xl mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-sm font-bold text-base-content">{t('maintenance.title')}</h1>
                    <button onClick={openCreate}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">
                        <i className="fas fa-plus text-[8px]"></i> {t('maintenance.newSchedule')}
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 text-base-content/30">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : schedules.length === 0 && !showForm ? (
                    <div className="text-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-clock text-xl text-base-content/20"></i>
                        </div>
                        <p className="text-sm font-medium text-base-content/40 mb-1">{t('maintenance.noSchedules')}</p>
                        <p className="text-xs text-base-content/30">{t('maintenance.noSchedulesHint')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {schedules.map(s => {
                            const active = s.is_active && s.last_applied_at;
                            const names = s.target_names || [];
                            return (
                                <div key={s.id} className={`anim-fade-up bg-base-200 border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${active ? 'border-primary/30 bg-primary/5' : 'border-base-300'}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary/15 text-primary' : 'bg-base-300/60 text-base-content/40'}`}>
                                        <i className={`fas ${active ? 'fa-check-circle' : 'fa-clock'} text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-base-content">{s.name}</span>
                                            {active && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-success/15 text-success border border-success/30">{t('maintenance.active')}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-base-content/45 mt-0.5">
                                            <span>{dayLabel(s.days_of_week ?? (s.day_of_week != null ? [s.day_of_week] : []))}</span>
                                            <span className="text-base-content/20">·</span>
                                            <span>{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</span>
                                            <span className="text-base-content/20">·</span>
                                            <span>{names.length} {t('maintenance.devices')}</span>
                                        </div>
                                        {names.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {names.map(n => (
                                                    <span key={n} className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300/50 text-base-content/50 border border-base-300">{n}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button onClick={() => toggleActive(s)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all ${s.is_active ? 'text-success hover:bg-success/12' : 'text-base-content/30 hover:bg-base-300'}`}
                                            title={s.is_active ? t('maintenance.disable') : t('maintenance.enable')}>
                                            <i className={`fas ${s.is_active ? 'fa-toggle-on' : 'fa-toggle-off'} text-sm`}></i>
                                        </button>
                                        <button onClick={() => openEdit(s)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-base-content/35 hover:bg-base-300 hover:text-base-content transition-all"
                                            title={t('maintenance.edit')}>
                                            <i className="fas fa-pen text-[11px]"></i>
                                        </button>
                                        <button onClick={() => del(s)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-base-content/35 hover:bg-error/12 hover:text-error transition-all"
                                            title={t('maintenance.delete')}>
                                            <i className="fas fa-trash text-[11px]"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)}>
                        <div className="bg-base-200 border border-base-300 rounded-xl p-5 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-sm font-semibold text-base-content">{editing ? t('maintenance.editSchedule') : t('maintenance.newSchedule')}</h2>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('maintenance.name')}</label>
                                    <input type="text" value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder={t('maintenance.namePlaceholder')}
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('maintenance.dayOfWeek')}</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DAY_LABELS.map((key, i) => {
                                            const selected = form.days_of_week.includes(i);
                                            return (
                                                <button key={i} type="button" onClick={() => setForm(f => ({
                                                    ...f, days_of_week: selected ? f.days_of_week.filter(x => x !== i) : [...f.days_of_week, i].sort()
                                                }))}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                                        selected ? 'bg-primary/15 text-primary border-primary/30' : 'text-base-content/50 border-base-300 hover:bg-base-300/50'
                                                    }`}>
                                                    {t(key).slice(0, 3)}
                                                </button>
                                            );
                                        })}
                                        {form.days_of_week.length === 0 && (
                                            <span className="text-[10px] text-base-content/30 self-center ml-1">Daily (all days)</span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">{t('maintenance.startTime')}</label>
                                        <input type="time" value={form.start_time}
                                            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                                            className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">{t('maintenance.endTime')}</label>
                                        <input type="time" value={form.end_time}
                                            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                                            className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-2">{t('maintenance.targets')}</label>
                                    <div className="max-h-40 overflow-y-auto space-y-1 bg-base-100 border border-base-300 rounded-lg p-2">
                                        {targets.map(tgt => (
                                            <label key={tgt.id}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${form.target_ids.includes(tgt.id) ? 'bg-primary/10 text-primary' : 'hover:bg-base-300/50'}`}>
                                                <input type="checkbox" checked={form.target_ids.includes(tgt.id)}
                                                    onChange={() => toggleTarget(tgt.id)}
                                                    className="checkbox checkbox-xs rounded border-base-content/30 checked:border-primary checked:bg-primary" />
                                                <span className="text-sm">{tgt.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setShowForm(false); setEditing(null); }}
                                    className="px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors">
                                    {t('maintenance.cancel')}
                                </button>
                                <button onClick={save}
                                    className="btn-prime flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                                    <i className="fas fa-save text-xs"></i>
                                    {editing ? t('maintenance.update') : t('maintenance.create')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
