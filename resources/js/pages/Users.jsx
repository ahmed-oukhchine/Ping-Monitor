import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useLang } from '../contexts/LanguageContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Users() {
    const { user: me } = useAuth();
    const { toast } = useToast();
    const { t } = useLang();
    const [users, setUsers]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting]       = useState(null);
    const [exitingId, setExitingId]     = useState(null);
    const [newestId, setNewestId]       = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

    const [name, setName]         = useState('');
    const [email, setEmail]       = useState('');
    const [password, setPassword]           = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole]                   = useState('user');
    const [showPw, setShowPw]               = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [saving, setSaving]               = useState(false);
    const [formError, setFormError]         = useState('');

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get('/api/users');
            setUsers(data);
        } catch {}
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const resetForm = () => {
        setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setRole('user');
        setShowPw(false); setShowConfirmPw(false); setFormError(''); setShowForm(false);
    };

    const createUser = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setFormError(t('users.passwordsDoNotMatch'));
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            const { data } = await axios.post('/api/users', { name, email, password, role });
            setUsers(u => [...u, data]);
            setNewestId(data.id);
            setTimeout(() => setNewestId(null), 1800);
            resetForm();
        } catch (err) {
            setFormError(err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(' ')
                : err.response?.data?.message || t('users.failedToCreate'));
        } finally { setSaving(false); }
    };

    const deleteUser = async (user) => {
        setDeleting(user.id);
        setDeleteError('');
        try {
            await axios.delete(`/api/users/${user.id}`);
            setExitingId(user.id);
            setTimeout(() => {
                setUsers(u => u.filter(x => x.id !== user.id));
                setExitingId(null);
            }, 300);
        } catch (err) {
            setDeleteError(err.response?.data?.message || t('users.couldNotDelete'));
        } finally { setDeleting(null); }
    };

    const confirmDeleteUser = async () => {
        await deleteUser(pendingDeleteUser);
        setPendingDeleteUser(null);
    };
    const admins  = users.filter(u => u.role === 'admin' || u.role === 'config_manager');

    const usersList = users.filter(u => u.role === 'user');

    return (
        <div className="min-h-screen bg-base-100">
            <div className="max-w-3xl mx-auto px-6 py-6">

                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-sm font-bold text-base-content">{t('users.title')}</h1>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold border border-primary/40 text-primary rounded-lg hover:bg-primary/10 transition-colors"
                        >
                            <i className="fas fa-plus text-[8px]"></i>
                            {t('users.newUser')}
                        </button>
                    )}
                </div>

                {showForm && (
                    <div className="form-enter modal-glass border border-base-300 rounded-xl p-5 mb-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
                                <h2 className="text-sm font-semibold text-base-content">{t('users.createUserAccount')}</h2>
                            </div>
                            <button onClick={resetForm} className="w-7 h-7 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/40 hover:text-base-content transition-colors">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>

                        <form onSubmit={createUser} className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('users.fullName')}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Jane Smith"
                                        required
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('users.email')}</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="jane@company.com"
                                        required
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('users.role')}</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        required
                                        className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                    >
                                        <option value="user">{t('users.user')}</option>
                                        <option value="config_manager">{t('users.configManager')}</option>
                                        <option value="admin">{t('users.administrator')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">{t('users.password')}</label>
                                    <div className="relative">
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder={t('users.minChars')}
                                            required
                                            minLength={6}
                                            className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 pr-9 text-sm text-base-content outline-none focus:border-primary/60 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(p => !p)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors"
                                        >
                                            <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-base-content/60 mb-1">
                                        {t('users.confirmPassword')}
                                        {confirmPassword && (
                                            password === confirmPassword
                                                ? <i className="fas fa-check text-success text-[9px] ml-1.5"></i>
                                                : <i className="fas fa-times text-error  text-[9px] ml-1.5"></i>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPw ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder={t('users.repeatPassword')}
                                            required
                                            className={`w-full bg-base-100 border rounded-lg px-3 py-2 pr-9 text-sm text-base-content outline-none transition-colors ${
                                                confirmPassword
                                                    ? password === confirmPassword
                                                        ? 'border-success/50 focus:border-success/70'
                                                        : 'border-error/50 focus:border-error/70'
                                                    : 'border-base-300 focus:border-primary/60'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPw(p => !p)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60 transition-colors"
                                        >
                                            <i className={`fas ${showConfirmPw ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/25 text-xs text-error">
                                    <i className="fas fa-exclamation-circle text-[10px]"></i>
                                    {formError}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]"
                                >
                                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-user-plus'} text-xs`}></i>
                                    {saving ? t('users.creating') : t('users.createUser')}
                                </button>
                                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-base-content/50 hover:text-base-content transition-colors">
                                    {t('users.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {deleteError && (
                    <div className="msg-enter flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error mb-5">
                        <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                        <span className="flex-1">{deleteError}</span>
                        <button onClick={() => setDeleteError('')} className="text-error/50 hover:text-error font-bold text-sm leading-none">×</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-base-content/30">
                        <span className="loading loading-spinner loading-md"></span>
                    </div>
                ) : (
                    <div className="space-y-5">

                        {admins.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <div className="w-0.5 h-3 rounded-full bg-primary/40 flex-shrink-0"></div>
                                    <p className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider">{t('users.administrators')}</p>
                                </div>
                                <div className="users-list bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                                    {admins.map((u, i) => (
                                        <UserRow
                                            key={u.id}
                                            user={u}
                                            isMe={u.id === me?.id}
                                            isLast={i === admins.length - 1}
                                            deleting={deleting === u.id}
                                            isExiting={exitingId === u.id}
                                            isNew={newestId === u.id}
                                            onDelete={() => deleteUser(u)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <div className="w-0.5 h-3 rounded-full bg-primary/40 flex-shrink-0"></div>
                                <p className="text-[10px] font-semibold text-base-content/35 uppercase tracking-wider">
                                    {t('users.users')}
                                    <span className="ml-2 text-base-content/25 normal-case tracking-normal font-normal">{t('users.memberDesc')}</span>
                                </p>
                            </div>
                            {usersList.length === 0 ? (
                                <div className="bg-base-200 border border-base-300 border-dashed rounded-xl flex items-center justify-center py-12 text-base-content/30">
                                    <div className="text-center">
                                        <i className="fas fa-user-plus text-2xl block mb-2 opacity-30"></i>
                                        <p className="text-sm">{t('users.noUsersHint')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="users-list bg-base-200 border border-base-300 rounded-xl overflow-hidden">
                                    {usersList.map((u, i) => (
                                        <UserRow
                                            key={u.id}
                                            user={u}
                                            isMe={u.id === me?.id}
                                            isLast={i === usersList.length - 1}
                                            deleting={deleting === u.id}
                                            isExiting={exitingId === u.id}
                                            isNew={newestId === u.id}
                                            onDelete={() => setPendingDeleteUser(u)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {pendingDeleteUser && (
                <ConfirmModal
                    title={t('users.deleteUser')}
                    message={t('users.deleteConfirmMsg', { name: pendingDeleteUser.name, email: pendingDeleteUser.email })}
                    onConfirm={confirmDeleteUser}
                    onClose={() => setPendingDeleteUser(null)}
                />
            )}
        </div>
    );
}

const AVATAR_PALETTE = [
    { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
    { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
    { bg: 'rgba(168,85,247,0.15)',  color: '#a855f7' },
    { bg: 'rgba(236,72,153,0.15)',  color: '#ec4899' },
    { bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
    { bg: 'rgba(249,115,22,0.15)',  color: '#f97316' },
    { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    { bg: 'rgba(20,184,166,0.15)',  color: '#14b8a6' },
    { bg: 'rgba(99,102,241,0.15)',  color: '#6366f1' },
];
function avatarStyle(name) {
    const hash = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function UserRow({ user: u, isMe, isLast, deleting, isExiting, isNew, onDelete }) {
    const { t } = useLang();
    const av = avatarStyle(u.name);
    return (
        <div className={`user-row group flex items-center gap-4 px-4 py-3 transition-colors duration-100 hover:bg-base-300/20 ${isExiting ? 'user-row-exit' : ''} ${isNew ? 'user-row-new' : ''} ${!isLast ? 'border-b border-base-300/60' : ''}`}>
            <div className="user-avatar w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: av.bg }}>
                <span className="text-xs font-bold uppercase" style={{ color: av.color }}>{u.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-base-content">{u.name}</span>
                    {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-base-300 text-base-content/50 font-medium">{t('users.you')}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${
                        u.role === 'admin'
                            ? 'bg-primary/15 text-primary border-primary/25'
                            : u.role === 'config_manager'
                            ? 'bg-warning/15 text-warning border-warning/25'
                            : 'bg-base-300/60 text-base-content/50 border-base-300'
                    }`}>{u.role === 'admin' ? t('users.administrator') : u.role === 'config_manager' ? t('users.configManager') : t('users.user')}</span>
                </div>
                <div className="text-xs text-base-content/40 mt-0.5">{u.email}</div>
            </div>
            <div className="text-right flex-shrink-0">
                <div className="text-[11px] text-base-content/35 tabular-nums">
                    {new Date(u.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
            </div>
            {u.role !== 'admin' && u.role !== 'config_manager' && !isMe && (
                <button
                    onClick={onDelete}
                    disabled={deleting}
                                                    title={t('users.deleteUser')}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/30 hover:text-error hover:bg-error/10 transition-all disabled:opacity-40 opacity-0 group-hover:opacity-100"
                >
                    {deleting
                        ? <span className="loading loading-spinner loading-xs"></span>
                        : <i className="fas fa-trash text-[10px]"></i>}
                </button>
            )}
            {(u.role === 'admin' || isMe) && <div className="w-7 flex-shrink-0" />}
        </div>
    );
}
