import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
    const { user } = useAuth();

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
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
                setError(err.response?.data?.message || 'Failed to update password.');
            }
        } finally { setSaving(false); }
    };

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-lg mx-auto px-6 py-6">

                {/* Header */}
                <div className="anim-fade-up flex items-center gap-3 mb-6">
                    <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
                    <div>
                        <h1 className="text-base font-bold text-base-content leading-tight">Settings</h1>
                        <p className="text-xs text-base-content/40 mt-0.5">Manage your account</p>
                    </div>
                </div>

                {/* Account info */}
                <div className="anim-fade-up anim-delay-1 bg-base-200 border border-base-300 rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                        <h2 className="text-sm font-semibold text-base-content">Account</h2>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b border-base-300/60">
                            <span className="text-xs text-base-content/50">Name</span>
                            <span className="text-sm font-medium text-base-content">{user?.name}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-base-300/60">
                            <span className="text-xs text-base-content/50">Email</span>
                            <span className="text-sm font-medium text-base-content">{user?.email}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-base-content/50">Role</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                                user?.role === 'admin'
                                    ? 'bg-primary/15 text-primary border-primary/25'
                                    : 'bg-base-300/60 text-base-content/50 border-base-300'
                            }`}>{user?.role}</span>
                        </div>
                    </div>
                </div>

                {/* Change password */}
                <div className="anim-fade-up anim-delay-2 bg-base-200 border border-base-300 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                        <h2 className="text-sm font-semibold text-base-content">Change Password</h2>
                    </div>

                    {success && (
                        <div className="msg-enter flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success/10 border border-success/25 text-xs text-success mb-4">
                            <i className="fas fa-check-circle text-[10px]"></i>
                            Password updated successfully.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Current password */}
                        <div>
                            <label className="block text-xs font-medium text-base-content/60 mb-1">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPw}
                                    onChange={e => setCurrentPw(e.target.value)}
                                    placeholder="Enter current password"
                                    required
                                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 pr-9 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                />
                                <button type="button" onClick={() => setShowCurrent(p => !p)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors">
                                    <i className={`fas ${showCurrent ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                </button>
                            </div>
                        </div>

                        {/* New password */}
                        <div>
                            <label className="block text-xs font-medium text-base-content/60 mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={e => setNewPw(e.target.value)}
                                    placeholder="Min. 6 characters"
                                    required
                                    minLength={6}
                                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 pr-9 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                />
                                <button type="button" onClick={() => setShowNew(p => !p)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors">
                                    <i className={`fas ${showNew ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                </button>
                            </div>
                        </div>

                        {/* Confirm new password */}
                        <div>
                            <label className="block text-xs font-medium text-base-content/60 mb-1">
                                Confirm New Password
                                {confirmPw && (
                                    newPw === confirmPw
                                        ? <i className="fas fa-check text-success text-[9px] ml-1.5"></i>
                                        : <i className="fas fa-times text-error  text-[9px] ml-1.5"></i>
                                )}
                            </label>
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat new password"
                                required
                                className={`w-full bg-base-100 border rounded-lg px-3 py-2 text-sm text-base-content outline-none transition-colors ${
                                    confirmPw
                                        ? newPw === confirmPw ? 'border-success/50 focus:border-success/70' : 'border-error/50 focus:border-error/70'
                                        : 'border-base-300 focus:border-primary/60'
                                }`}
                            />
                        </div>

                        {error && (
                            <div className="msg-enter flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/25 text-xs text-error">
                                <i className="fas fa-exclamation-circle text-[10px]"></i>
                                {error}
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]"
                            >
                                <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-lock'} text-xs`}></i>
                                {saving ? 'Saving…' : 'Update Password'}
                            </button>
                            <button type="button" onClick={reset}
                                className="px-4 py-2 text-sm font-medium text-base-content/50 hover:text-base-content transition-colors">
                                Clear
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}
