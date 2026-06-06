import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

export default function Login() {
    const { t } = useLang();
    const { setUser }             = useAuth();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw]     = useState(false);
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post('/login', { email, password });
            setUser(data);
            window.location.href = '/';
        } catch (err) {
            setError(err.response?.data?.message || t('login.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center px-4 relative overflow-hidden">

            <div className="absolute inset-0 bg-gradient-animated pointer-events-none"></div>

            <div className="absolute inset-0 login-grid pointer-events-none"></div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-primary/8 blur-3xl pointer-events-none glow-breathe"></div>

            <div className="w-full max-w-sm relative z-10">
                <div className="modal-enter modal-glass border border-base-300 rounded-2xl p-8 shadow-2xl">

                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_color-mix(in_oklch,var(--color-primary)_28%,transparent)]">
                            <img src="/logo.svg" alt="SIREN" className="w-6 h-6" />
                        </div>
                        <div className="leading-none">
                            <div className="font-bold text-base-content tracking-wide">SIREN</div>
                            <div className="text-xs text-base-content/40 mt-0.5">Network Monitor</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-1 h-6 rounded-full bg-primary flex-shrink-0"></div>
                        <h2 className="text-lg font-bold text-base-content">{t('login.signIn')}</h2>
                    </div>
                    <p className="text-xs text-base-content/40 mb-6 pl-3.5">{t('login.enterCredentials')}</p>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-error/10 border border-error/25 rounded-xl text-error text-xs">
                            <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                            {error}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-base-content/55 block mb-1.5">{t('login.email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required autoFocus
                                placeholder={t('login.emailPlaceholder')}
                                className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2.5 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-base-content/55 block mb-1.5">{t('login.password')}</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder={t('login.passwordPlaceholder')}
                                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(p => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors"
                                >
                                    <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-prime w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_18px_color-mix(in_oklch,var(--color-primary)_35%,transparent)] mt-2"
                        >
                            {loading
                                ? <><span className="loading loading-spinner loading-xs"></span>{t('login.signingIn')}</>
                                : <><i className="fas fa-sign-in-alt text-xs"></i>{t('login.signIn')}</>
                            }
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-base-content/20 mt-7">
                        SIREN · Network Monitoring Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
