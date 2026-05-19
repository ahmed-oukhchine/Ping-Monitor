import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

const themeIcons = { light: 'fa-sun', dark: 'fa-moon', system: 'fa-desktop' };

export default function Sidebar({ open, onToggle, onLogout, onCycleTheme, themePref, offlineCount = 0 }) {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const { t } = useLang();
    const isAdmin = user?.role === 'admin';

    const navItems = [
        { to: '/',           label: t('sidebar.dashboard'),  icon: 'fa-chart-pie',          show: true,  badge: null },
        { to: '/monitoring', label: t('sidebar.monitoring'), icon: 'fa-tachometer-alt',     show: true,  badge: offlineCount > 0 ? offlineCount : null },
        { to: '/history',    label: t('sidebar.history'),    icon: 'fa-history',            show: true,  badge: null },
        { to: '/incidents',  label: t('sidebar.incidents'),  icon: 'fa-exclamation-circle', show: true,  badge: null },
        { to: '/reports',    label: t('sidebar.reports'),    icon: 'fa-file-alt',           show: true,  badge: null },
        { to: '/users',      label: t('sidebar.users'),      icon: 'fa-users',              show: isAdmin, badge: null },
        { to: '/audit-log',  label: t('sidebar.auditLog'),   icon: 'fa-clipboard-list',     show: isAdmin, badge: null },
        { to: '/settings',   label: t('sidebar.settings'),   icon: 'fa-cog',                show: true,  badge: null },
    ];

    const linkClass = (active) =>
        `flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
            active
                ? 'nav-active bg-primary/10 text-primary shadow-sm'
                : 'text-base-content/55 hover:bg-base-300/70 hover:text-base-content'
        } ${open ? 'gap-3 px-3 py-2.5' : 'gap-0 px-0 py-3 justify-center'}`;

    return (
        <aside className={`fixed top-0 left-0 h-screen bg-base-200 border-r border-base-300 flex flex-col z-50 shadow-xl shadow-black/15 transition-all duration-300 ${
            open ? 'w-56' : 'w-16'
        }`}>
            <button onClick={onToggle} className="px-4 py-5 border-b border-base-300 flex-shrink-0 flex items-center justify-center w-full hover:bg-base-300/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-center w-full">
                <div className="w-9 h-9 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="w-full h-full">
                        <rect width="40" height="40" rx="10" fill="#2563eb"/>
                        <rect x="8" y="22" width="4" height="10" rx="1.5" fill="white" opacity="0.5"/>
                        <rect x="14" y="17" width="4" height="15" rx="1.5" fill="white" opacity="0.7"/>
                        <rect x="20" y="12" width="4" height="20" rx="1.5" fill="white" opacity="0.9"/>
                        <rect x="26" y="7" width="4" height="25" rx="1.5" fill="white"/>
                        <circle cx="30" cy="30" r="3" fill="#22c55e" stroke="#2563eb" stroke-width="1.5"/>
                    </svg>
                </div>
                {open && (
                    <div className="leading-none text-left ml-3">
                        <div className="text-sm font-bold text-base-content tracking-wide">ArgusNet</div>
                        <div className="text-[10px] text-base-content/40 mt-0.5">{t('sidebar.networkMonitor')}</div>
                    </div>
                )}
            </div>
            </button>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.filter(i => i.show).map((item) => {
                    const active = pathname === item.to;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            style={{ textDecoration: 'none' }}
                            className={linkClass(active)}
                            title={!open ? item.label : undefined}
                        >
                            <div className="relative flex items-center justify-center flex-shrink-0 w-4">
                                <i className={`nav-icon fas ${item.icon} text-xs text-center ${active ? 'text-primary' : 'text-base-content/35'}`}></i>
                                {item.badge != null && !open && (
                                    <span className="absolute -top-2 -right-3 min-w-[14px] h-[14px] rounded-full bg-error text-white text-[7px] font-bold flex items-center justify-center px-0.5 leading-none">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            {open && (
                                <>
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge != null && (
                                        <span className="min-w-[18px] h-[18px] rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {open && (
                <div className="px-3 pb-4 pt-3 border-t border-base-300 flex-shrink-0 space-y-1">
                    <div className="flex items-center gap-0.5 bg-base-300/60 rounded-lg p-0.5">
                        {['light', 'dark', 'system'].map(mode => (
                            <button key={mode} onClick={() => onCycleTheme(mode)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    themePref === mode
                                        ? 'bg-primary/15 text-primary shadow-sm'
                                        : 'text-base-content/45 hover:text-base-content'
                                }`}>
                                <i className={`fas ${themeIcons[mode]} text-[10px]`}></i>
                                <span className="text-[10px]">{t(`sidebar.${mode}`)}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-base-300/40">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-user text-primary text-[10px]"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-base-content truncate leading-none">{user?.name}</div>
                            <span className={`text-[10px] font-medium leading-none mt-0.5 block ${
                                user?.role === 'admin' ? 'text-primary' : 'text-base-content/45'
                            }`}>{user?.role}</span>
                        </div>
                    </div>

                    <button onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-base-content/50 hover:bg-error/10 hover:text-error transition-all">
                        <i className="fas fa-sign-out-alt text-xs w-4 text-center flex-shrink-0"></i>
                        {t('sidebar.signOut')}
                    </button>
                </div>
            )}

            {!open && (
                <div className="px-2 pb-4 pt-3 border-t border-base-300 flex-shrink-0 space-y-1">
                    <div className="flex items-center justify-center py-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center"
                            title={user?.name}>
                            <i className="fas fa-user text-primary text-[10px]"></i>
                        </div>
                    </div>
                    <button onClick={() => onCycleTheme(
                        themePref === 'light' ? 'dark' : themePref === 'dark' ? 'system' : 'light'
                    )}
                        className="w-full flex items-center justify-center py-2 rounded-xl text-base-content/40 hover:text-base-content hover:bg-base-300/50 transition-all"
                        title="Toggle theme">
                        <i className={`fas ${themeIcons[themePref]} text-xs`}></i>
                    </button>
                    <button onClick={onLogout}
                        className="w-full flex items-center justify-center py-2 rounded-xl text-base-content/40 hover:text-error hover:bg-error/10 transition-all"
                        title="Sign out">
                        <i className="fas fa-sign-out-alt text-xs"></i>
                    </button>
                </div>
            )}
        </aside>
    );
}
