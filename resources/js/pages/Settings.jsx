import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

const NumberInput = ({ value, onChange, min, max, field, className }) => {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handler = e => {
            const step = e.deltaY < 0 ? 1 : -1;
            const cur = Number(el.value) || 0;
            const next = Math.max(min, Math.min(max, cur + step));
            onChange(next);
            e.preventDefault();
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [min, max, onChange]);
    return <input ref={ref} type="number" value={value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        min={min} max={max} className={className} />;
};

const tabs = [
    { id: 'profile',    icon: 'fa-user',        label: 'Profile' },
    { id: 'password',   icon: 'fa-lock',         label: 'Password' },
    { id: 'appearance', icon: 'fa-palette',      label: 'Appearance' },
    { id: 'alerts',     icon: 'fa-bell',         label: 'Alerts' },
    { id: 'snmp',       icon: 'fa-network-wired',label: 'SNMP' },
    { id: 'system',     icon: 'fa-sliders-h',    label: 'System' },
];

export default function Settings({ themePref, onCycleTheme }) {
    const { user, setUser } = useAuth();
    const { lang, setLang, t } = useLang();
    const [active, setActive] = useState('profile');

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState('');

    const [alertDefaults, setAlertDefaults] = useState(null);
    const [alertSaving, setAlertSaving] = useState(false);

    useEffect(() => {
        axios.get('/api/settings').then(({ data }) => setAlertDefaults(data)).catch(() => {});
    }, []);

    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const resetPassword = () => {
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setError(''); setSuccess(false);
    };

    const saveProfile = async () => {
        if (!name.trim() || !email.trim()) { setProfileError(t('settings.nameEmailRequired')); return; }
        setProfileSaving(true); setProfileError('');
        try {
            const { data } = await axios.put('/api/profile', { name, email });
            setUser(data.user);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errs = err.response?.data?.errors;
            if (errs?.email) setProfileError(errs.email[0]);
            else setProfileError(err.response?.data?.message || t('settings.failedToUpdateProfile'));
        } finally { setProfileSaving(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPw !== confirmPw) { setError(t('settings.passwordsDoNotMatch')); return; }
        setSaving(true); setError(''); setSuccess(false);
        try {
            await axios.put('/api/profile/password', { current_password: currentPw, password: newPw });
            setSuccess(true);
            resetPassword();
        } catch (err) {
            const errs = err.response?.data?.errors;
            if (errs?.current_password) setError(errs.current_password[0]);
            else setError(err.response?.data?.message || t('settings.failedToUpdatePassword'));
        } finally { setSaving(false); }
    };

    const saveSettings = async (payload) => {
        setAlertSaving(true);
        try { await axios.put('/api/settings', payload); setSuccess(true); setTimeout(() => setSuccess(false), 3000); } catch {}
        setAlertSaving(false);
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-4xl mx-auto px-6 py-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                        <i className="fas fa-cog text-primary text-sm"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-base-content">{t('settings.title')}</h1>
                        <p className="text-xs text-base-content/40">Configure your application preferences</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 mb-8 p-1 bg-base-200 border border-base-300 rounded-xl w-fit">
                    {tabs.map(tab => {
                        const act = active === tab.id;
                        return (
                            <button key={tab.id} onClick={() => { setActive(tab.id); resetPassword(); setSuccess(false); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                                    act
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-base-content/50 hover:text-base-content hover:bg-base-300/50'
                                }`}>
                                <i className={`fas ${tab.icon} text-[10px]`}></i>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-5">
                    {success && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/25 text-xs text-success">
                            <i className="fas fa-check-circle"></i>
                            Saved successfully
                        </div>
                    )}

                    {active === 'profile' && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                                    <i className="fas fa-user text-primary text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-base-content">Profile</h2>
                                    <p className="text-[11px] text-base-content/40">Update your account name and email address</p>
                                </div>
                            </div>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('settings.name')}</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('settings.email')}</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div className="flex items-center justify-between py-2 px-4 bg-base-100 rounded-xl border border-base-300">
                                    <span className="text-xs text-base-content/50">{t('settings.role')}</span>
                                    <span className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${
                                        user?.role === 'admin'
                                            ? 'bg-primary/15 text-primary border border-primary/25'
                                            : 'bg-base-300/60 text-base-content/50 border border-base-300'
                                    }`}>{user?.role}</span>
                                </div>
                                {profileError && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error/10 border border-error/25 text-xs text-error">
                                        <i className="fas fa-exclamation-circle text-[10px]"></i>
                                        {profileError}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 pt-2">
                                    <button onClick={saveProfile} disabled={profileSaving}
                                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
                                        <i className={`fas ${profileSaving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                        {profileSaving ? t('settings.saving') : t('settings.save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {active === 'password' && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                                    <i className="fas fa-lock text-amber-500 text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-base-content">Password</h2>
                                    <p className="text-[11px] text-base-content/40">Choose a strong password you haven't used before</p>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('settings.currentPassword')}</label>
                                    <div className="relative">
                                        <input type={showCurrent ? 'text' : 'password'} value={currentPw}
                                            onChange={e => setCurrentPw(e.target.value)} placeholder={t('settings.enterCurrentPassword')} required
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 pr-10 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                        <button type="button" onClick={() => setShowCurrent(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60">
                                            <i className={`fas ${showCurrent ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">{t('settings.newPassword')}</label>
                                    <div className="relative">
                                        <input type={showNew ? 'text' : 'password'} value={newPw}
                                            onChange={e => setNewPw(e.target.value)} placeholder={t('settings.minChars')} required minLength={6}
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 pr-10 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                        <button type="button" onClick={() => setShowNew(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60">
                                            <i className={`fas ${showNew ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">
                                        {t('settings.confirmPassword')}
                                        {confirmPw && (
                                            newPw === confirmPw
                                                ? <i className="fas fa-check text-success text-[9px] ml-1.5"></i>
                                                : <i className="fas fa-times text-error text-[9px] ml-1.5"></i>
                                        )}
                                    </label>
                                    <input type={showNew ? 'text' : 'password'} value={confirmPw}
                                        onChange={e => setConfirmPw(e.target.value)} placeholder={t('settings.repeatPassword')} required
                                        className={`w-full bg-base-100 border rounded-xl px-4 py-2.5 text-sm text-base-content outline-none transition-all ${
                                            confirmPw
                                                ? newPw === confirmPw ? 'border-success/50 focus:border-success/70' : 'border-error/50 focus:border-error/70'
                                                : 'border-base-300 focus:border-primary/50'
                                        }`} />
                                </div>
                                {error && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error/10 border border-error/25 text-xs text-error">
                                        <i className="fas fa-exclamation-circle text-[10px]"></i>
                                        {error}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 pt-2">
                                    <button type="submit" disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
                                        <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-lock'} text-xs`}></i>
                                        {saving ? t('settings.saving') : t('settings.updatePassword')}
                                    </button>
                                    <button type="button" onClick={resetPassword}
                                        className="px-4 py-2.5 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors rounded-xl hover:bg-base-300/50">
                                        {t('settings.clear')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {active === 'appearance' && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center">
                                    <i className="fas fa-palette text-violet-500 text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-base-content">Appearance</h2>
                                    <p className="text-[11px] text-base-content/40">{t('settings.appearanceDesc')}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-2.5 block">{t('settings.languageSection')}</label>
                                    <div className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-xl p-1 w-fit">
                                        {[
                                            { code: 'en', label: 'English', flag: '🇬🇧' },
                                            { code: 'fr', label: 'Français', flag: '🇫🇷' },
                                            { code: 'ar', label: 'العربية', flag: '🇸🇦' },
                                        ].map(opt => {
                                            const act = lang === opt.code;
                                            return (
                                                <button key={opt.code} onClick={() => setLang(opt.code)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                        act
                                                            ? 'bg-primary text-white shadow-sm'
                                                            : 'text-base-content/55 hover:text-base-content hover:bg-base-300/50'
                                                    }`}>
                                                    <span>{opt.flag}</span>
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <hr className="border-base-300" />
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-2.5 block">{t('settings.theme')}</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {['light', 'dark', 'forest', 'dracula', 'system'].map(theme => {
                                            const act = themePref === theme;
                                            return (
                                                <button key={theme} onClick={() => onCycleTheme(theme)}
                                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                                                        act
                                                            ? 'bg-primary text-white border-primary shadow-sm'
                                                            : 'border-base-300 bg-base-100 text-base-content/55 hover:border-primary/40 hover:text-base-content'
                                                    }`}>
                                                    {t('sidebar.' + theme)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {active === 'alerts' && alertDefaults && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center">
                                    <i className="fas fa-bell text-rose-500 text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-base-content">Alert Defaults</h2>
                                    <p className="text-[11px] text-base-content/40">Default thresholds applied to every new target</p>
                                </div>
                            </div>
                            <div className="space-y-4 max-w-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Warning threshold (ms)</label>
                                        <NumberInput value={alertDefaults.alert_default_warn_ms}
                                            onChange={v => setAlertDefaults(p => ({ ...p, alert_default_warn_ms: v }))}
                                            min={0} max={100000}
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Critical threshold (ms)</label>
                                        <NumberInput value={alertDefaults.alert_default_critical_ms}
                                            onChange={v => setAlertDefaults(p => ({ ...p, alert_default_critical_ms: v }))}
                                            min={0} max={100000}
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Default alert email</label>
                                    <input type="email" value={alertDefaults.alert_default_email}
                                        onChange={e => setAlertDefaults(p => ({ ...p, alert_default_email: e.target.value }))}
                                        placeholder="admin@example.com"
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Consecutive failures</label>
                                        <NumberInput value={alertDefaults.alert_default_consecutive}
                                            onChange={v => setAlertDefaults(p => ({ ...p, alert_default_consecutive: v }))}
                                            min={1} max={100}
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Cooldown (minutes)</label>
                                        <NumberInput value={alertDefaults.alert_default_cooldown}
                                            onChange={v => setAlertDefaults(p => ({ ...p, alert_default_cooldown: v }))}
                                            min={0} max={1440}
                                            className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    </div>
                                </div>
                                <hr className="border-base-300" />
                                <button onClick={() => saveSettings({
                                    alert_default_warn_ms: alertDefaults.alert_default_warn_ms,
                                    alert_default_critical_ms: alertDefaults.alert_default_critical_ms,
                                    alert_default_email: alertDefaults.alert_default_email,
                                    alert_default_consecutive: alertDefaults.alert_default_consecutive,
                                    alert_default_cooldown: alertDefaults.alert_default_cooldown,
                                })} disabled={alertSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
                                    <i className={`fas ${alertSaving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                    {alertSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}

                    {active === 'snmp' && alertDefaults && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/15 flex items-center justify-center">
                                    <i className="fas fa-network-wired text-cyan-500 text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-base-content">{t('settings.snmp')}</h2>
                                    <p className="text-[11px] text-base-content/40">Default SNMP credentials for new target discovery</p>
                                </div>
                            </div>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">SNMP Community</label>
                                    <input type="text" value={alertDefaults.snmp_default_community}
                                        onChange={e => setAlertDefaults(p => ({ ...p, snmp_default_community: e.target.value }))}
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">SNMP Version</label>
                                    <div className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-xl p-1 w-fit">
                                        {['v1', 'v2c', 'v3'].map(v => {
                                            const act = alertDefaults.snmp_default_version === v;
                                            return (
                                                <button key={v} onClick={() => setAlertDefaults(p => ({ ...p, snmp_default_version: v }))}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        act ? 'bg-primary text-white shadow-sm' : 'text-base-content/55 hover:text-base-content'
                                                    }`}>{v}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <hr className="border-base-300" />
                                <button onClick={() => saveSettings({
                                    snmp_default_community: alertDefaults.snmp_default_community,
                                    snmp_default_version: alertDefaults.snmp_default_version,
                                })} disabled={alertSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
                                    <i className={`fas ${alertSaving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                    {alertSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}

                    {active === 'system' && alertDefaults && (
                        <div className="bg-base-200 border border-base-300 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-neutral-500/15 flex items-center justify-center">
                                    <i className="fas fa-sliders-h text-neutral-500 text-sm"></i>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-base-content">{t('settings.system')}</h2>
                                    <p className="text-[11px] text-base-content/40">Data retention, cleanup, and advanced configuration</p>
                                </div>
                            </div>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-xs font-medium text-base-content/60 mb-1.5 block">Data retention (days)</label>
                                    <NumberInput value={alertDefaults.data_retention_days}
                                        onChange={v => setAlertDefaults(p => ({ ...p, data_retention_days: v }))}
                                        min={1} max={3650}
                                        className="w-full bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content outline-none focus:border-primary/50 transition-all" />
                                    <p className="text-[10px] text-base-content/30 mt-1.5">Ping history older than this will be automatically pruned</p>
                                </div>
                                <hr className="border-base-300" />
                                <button onClick={() => saveSettings({ data_retention_days: alertDefaults.data_retention_days })} disabled={alertSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-white rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
                                    <i className={`fas ${alertSaving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                    {alertSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
