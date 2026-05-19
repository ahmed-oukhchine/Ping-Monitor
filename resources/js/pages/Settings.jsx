import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

const sections = (t) => [
    { id: 'account',        label: t('settings.account'),        icon: 'fa-user-circle' },
    { id: 'password',       label: t('settings.changePassword'), icon: 'fa-lock' },
    { id: 'language',       label: t('settings.language'),       icon: 'fa-language' },
];

export default function Settings() {
    const { user, setUser } = useAuth();
    const { lang, setLang, t } = useLang();
    const [active, setActive] = useState('account');

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState('');

    const [currentPw, setCurrentPw]   = useState('');
    const [newPw, setNewPw]           = useState('');
    const [confirmPw, setConfirmPw]   = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew]         = useState(false);
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState('');
    const [success, setSuccess]         = useState(false);

    const reset = () => {
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setError(''); setSuccess(false);
    };

    const saveProfile = async () => {
        if (!name.trim() || !email.trim()) { setProfileError(t('settings.nameEmailRequired')); return; }
        setProfileSaving(true); setProfileError(''); setProfileSuccess(false);
        try {
            const { data } = await axios.put('/api/profile', { name, email });
            setUser(data.user);
            setProfileSuccess(true);
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
            await axios.put('/api/profile/password', {
                current_password: currentPw,
                password: newPw,
            });
            setSuccess(true);
            reset();
        } catch (err) {
            const errs = err.response?.data?.errors;
            if (errs?.current_password) {
                setError(errs.current_password[0]);
            } else {
                setError(err.response?.data?.message || t('settings.failedToUpdatePassword'));
            }
        } finally { setSaving(false); }
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-4xl mx-auto px-6 py-6">

                <div className="anim-fade-up flex items-center gap-3 mb-6">
                    <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                    <div>
                        <h1 className="text-base font-bold text-base-content leading-tight">{t('settings.title')}</h1>
                        <p className="text-xs text-base-content/40 mt-0.5">{t('settings.subtitle')}</p>
                    </div>
                </div>

                <div className="flex gap-6">

                    <div className="anim-fade-up anim-delay-1 w-56 flex-shrink-0 space-y-0.5">
                        {sections(t).map(s => {
                            const act = active === s.id;
                            return (
                                <button key={s.id} onClick={() => { setActive(s.id); reset(); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                                        act
                                            ? 'bg-primary/15 text-primary shadow-sm'
                                            : 'text-base-content/55 hover:bg-base-300/50 hover:text-base-content'
                                    }`}>
                                    <i className={`fas ${s.icon} text-xs w-4 text-center flex-shrink-0 ${act ? 'text-primary' : 'text-base-content/35'}`}></i>
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 min-w-0">

                        {active === 'account' && (
                            <div className="anim-fade-up bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-sm font-semibold text-base-content">{t('settings.account')}</h2>
                                </div>

                                {profileSuccess && (
                                    <div className="msg-enter flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success/10 border border-success/25 text-xs text-success mb-4">
                                        <i className="fas fa-check-circle text-[10px]"></i>
                                        {t('settings.profileUpdated')}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">{t('settings.name')}</label>
                                        <input type="text" value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">{t('settings.email')}</label>
                                        <input type="email" value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-xs text-base-content/50">{t('settings.role')}</span>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                                            user?.role === 'admin'
                                                ? 'bg-primary/15 text-primary border-primary/25'
                                                : 'bg-base-300/60 text-base-content/50 border-base-300'
                                        }`}>{user?.role}</span>
                                    </div>
                                    {profileError && (
                                        <div className="msg-enter flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/25 text-xs text-error">
                                            <i className="fas fa-exclamation-circle text-[10px]"></i>
                                            {profileError}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-1">
                                        <button onClick={saveProfile} disabled={profileSaving}
                                            className="btn-prime flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                                            <i className={`fas ${profileSaving ? 'fa-spinner fa-spin' : 'fa-save'} text-xs`}></i>
                                            {profileSaving ? t('settings.saving') : t('settings.save')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {active === 'language' && (
                            <div className="anim-fade-up bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-sm font-semibold text-base-content">Language / Langue</h2>
                                </div>
                                <p className="text-xs text-base-content/50 mb-4">Choose your preferred language for the interface.</p>
                                <div className="flex items-center gap-3 bg-base-100 border border-base-300 rounded-xl p-1 w-fit">
                                    {[
                                        { code: 'en', label: 'English', flag: '🇬🇧' },
                                        { code: 'fr', label: 'Français', flag: '🇫🇷' },
                                    ].map(opt => {
                                        const active = lang === opt.code;
                                        return (
                                            <button key={opt.code} onClick={() => setLang(opt.code)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                                    active
                                                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                                                        : 'text-base-content/55 hover:text-base-content hover:bg-base-300/50'
                                                }`}>
                                                <span className="text-base">{opt.flag}</span>
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-base-content/30 mt-3">
                                    {lang === 'en'
                                        ? 'Some pages may still show English content until fully translated.'
                                        : 'Certaines pages peuvent encore afficher du contenu en anglais jusqu\'à la traduction complète.'}
                                </p>
                            </div>
                        )}

                        {active === 'password' && (
                            <div className="anim-fade-up bg-base-200 border border-base-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                    <h2 className="text-sm font-semibold text-base-content">{t('settings.changePassword')}</h2>
                                </div>

                                {success && (
                                    <div className="msg-enter flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success/10 border border-success/25 text-xs text-success mb-4">
                                        <i className="fas fa-check-circle text-[10px]"></i>
                                        {t('settings.passwordUpdated')}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">{t('settings.currentPassword')}</label>
                                        <div className="relative">
                                            <input type={showCurrent ? 'text' : 'password'} value={currentPw}
                                                onChange={e => setCurrentPw(e.target.value)}
                                                placeholder={t('settings.enterCurrentPassword')} required
                                                className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 pr-9 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                            <button type="button" onClick={() => setShowCurrent(p => !p)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors">
                                                <i className={`fas ${showCurrent ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">{t('settings.newPassword')}</label>
                                        <div className="relative">
                                            <input type={showNew ? 'text' : 'password'} value={newPw}
                                                onChange={e => setNewPw(e.target.value)}
                                                placeholder={t('settings.minChars')} required minLength={6}
                                                className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 pr-9 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                                            <button type="button" onClick={() => setShowNew(p => !p)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors">
                                                <i className={`fas ${showNew ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-base-content/60 mb-1">
                                            {t('settings.confirmPassword')}
                                            {confirmPw && (
                                                newPw === confirmPw
                                                    ? <i className="fas fa-check text-success text-[9px] ml-1.5"></i>
                                                    : <i className="fas fa-times text-error  text-[9px] ml-1.5"></i>
                                            )}
                                        </label>
                                        <input type={showNew ? 'text' : 'password'} value={confirmPw}
                                            onChange={e => setConfirmPw(e.target.value)}
                                            placeholder={t('settings.repeatPassword')} required
                                            className={`w-full bg-base-100 border rounded-lg px-3 py-2 text-sm text-base-content outline-none transition-colors ${
                                                confirmPw
                                                    ? newPw === confirmPw ? 'border-success/50 focus:border-success/70' : 'border-error/50 focus:border-error/70'
                                                    : 'border-base-300 focus:border-primary/60'
                                            }`} />
                                    </div>
                                    {error && (
                                        <div className="msg-enter flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/25 text-xs text-error">
                                            <i className="fas fa-exclamation-circle text-[10px]"></i>
                                            {error}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-1">
                                        <button type="submit" disabled={saving}
                                            className="btn-prime flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                                            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-lock'} text-xs`}></i>
                                            {saving ? t('settings.saving') : t('settings.updatePassword')}
                                        </button>
                                        <button type="button" onClick={reset}
                                            className="px-4 py-2 text-sm font-medium text-base-content/50 hover:text-base-content transition-colors">
                                            {t('settings.clear')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}
