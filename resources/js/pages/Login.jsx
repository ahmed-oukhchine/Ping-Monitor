import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const { setUser }             = useAuth();
    const navigate                = useNavigate();
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
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center px-4 relative overflow-hidden">

            {/* Dot-grid background */}
            <div className="absolute inset-0 login-grid pointer-events-none"></div>

            {/* Soft primary glow behind card — breathing animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="glow-breathe w-[480px] h-[480px] rounded-full bg-primary/6 blur-3xl"></div>
            </div>

            <div className="w-full max-w-sm relative z-10">
                <div className="modal-enter bg-base-200 border border-base-300 rounded-2xl p-8 shadow-2xl">

                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_color-mix(in_oklch,var(--color-primary)_28%,transparent)]">
                            <i className="fas fa-satellite-dish text-primary"></i>
                        </div>
                        <div className="leading-none">
                            <div className="font-bold text-base-content tracking-wide">ArgusNet</div>
                            <div className="text-xs text-base-content/40 mt-0.5">Network Monitor</div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-1 h-6 rounded-full bg-primary flex-shrink-0"></div>
                        <h2 className="text-lg font-bold text-base-content">Sign in</h2>
                    </div>
                    <p className="text-xs text-base-content/40 mb-6 pl-3.5">Enter your credentials to continue</p>

                    {/* Error */}
                    {error && (
                        <div className="msg-enter mb-4 flex items-center gap-2 px-3 py-2.5 bg-error/10 border border-error/25 rounded-xl text-error text-xs">
                            <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                            {error}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-base-content/55 block mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required autoFocus
                                placeholder="you@example.com"
                                className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2.5 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-base-content/55 block mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
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
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_18px_color-mix(in_oklch,var(--color-primary)_35%,transparent)] mt-2"
                        >
                            {loading
                                ? <><span className="loading loading-spinner loading-xs"></span>Signing in…</>
                                : <><i className="fas fa-sign-in-alt text-xs"></i>Sign in</>
                            }
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-base-content/20 mt-7">
                        ArgusNet · Network Monitoring Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
