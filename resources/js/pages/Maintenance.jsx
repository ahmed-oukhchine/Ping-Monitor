import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';

const DAYS = [
    { val: null, labelKey: 'maintenance.daily' },
    { val: 0,    labelKey: 'maintenance.sunday' },
    { val: 1,    labelKey: 'maintenance.monday' },
    { val: 2,    labelKey: 'maintenance.tuesday' },
    { val: 3,    labelKey: 'maintenance.wednesday' },
    { val: 4,    labelKey: 'maintenance.thursday' },
    { val: 5,    labelKey: 'maintenance.friday' },
    { val: 6,    labelKey: 'maintenance.saturday' },
];

export default function Maintenance() {
    const { t } = useLang();
    const [schedules, setSchedules] = useState([]);
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', target_ids: [], day_of_week: null, start_time: '02:00', end_time: '04:00' });

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
        setForm({ name: '', target_ids: [], day_of_week: null, start_time: '02:00', end_time: '04:00' });
        setShowForm(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, target_ids: s.target_ids, day_of_week: s.day_of_week, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) });
        setShowForm(true);
    };

    const toggleTarget = (id) => {
        setForm(f => ({ ...f, target_ids: f.target_ids.includes(id) ? f.target_ids.filter(x => x !== id) : [...f.target_ids, id] }));
    };

    const save = async () => {
        if (!form.name || form.target_ids.length === 0 || !form.start_time || !form.end_time) return;
        try {
            if (editing) {
                await axios.put(`/api/maintenance-schedules/${editing.id}`, form);
            } else {
                await axios.post('/api/maintenance-schedules', form);
            }
            setShowForm(false);
            setEditing(null);
            fetchAll();
        } catch {}
    };

    const toggleActive = async (s) => {
        await axios.post(`/api/maintenance-schedules/${s.id}/toggle`);
        fetchAll();
    };

    const del = async (s) => {
        if (!window.confirm(t('maintenance.confirmDelete'))) return;
        await axios.delete(`/api/maintenance-schedules/${s.id}`);
        fetchAll();
    };

    const dayLabel = (dv) => {
        const d = DAYS.find(x => x.val === dv);
        return d ? t(d.labelKey) : '—';
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-4xl mx-auto px-6 py-6">

                <div className="anim-fade-up flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                        <div>
                            <h1 className="text-base font-bold text-base-content leading-tight">{t('maintenance.title')}</h1>
                            <p className="text-xs text-base-content/40 mt-0.5">{t('maintenance.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={openCreate}
                        className="btn-prime flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                        <i className="fas fa-plus text-[10px]"></i> {t('maintenance.newSchedule')}
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
                                            <span>{dayLabel(s.day_of_week)}</span>
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
                                    <select value={form.day_of_week ?? ''}
                                        onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value === '' ? null : Number(e.target.value) }))}
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors">
                                        {DAYS.map(d => (
                                            <option key={d.val ?? 'null'} value={d.val ?? ''}>{t(d.labelKey)}</option>
                                        ))}
                                    </select>
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
