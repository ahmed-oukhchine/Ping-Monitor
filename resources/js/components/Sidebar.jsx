import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ onLogout, onThemeToggle, isLight, offlineCount = 0 }) {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const navItems = [
        { to: '/',           label: 'Dashboard',  icon: 'fa-chart-pie',      show: true,    badge: null },
        { to: '/monitoring', label: 'Monitoring', icon: 'fa-tachometer-alt', show: true,    badge: offlineCount > 0 ? offlineCount : null },
        { to: '/history',    label: 'History',    icon: 'fa-history',        show: true,    badge: null },
        { to: '/incidents',  label: 'Incidents',  icon: 'fa-exclamation-circle', show: true, badge: null },
        { to: '/users',      label: 'Users',      icon: 'fa-users',          show: isAdmin, badge: null },
    ];

    return (
        <aside className="sidebar-animate fixed top-0 left-0 h-screen w-56 bg-base-200 border-r border-base-300 flex flex-col z-50">

            {/* ── Logo ─────────────────────────────────────────── */}
            <div className="px-4 py-5 border-b border-base-300 flex-shrink-0">
                <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-satellite-dish text-primary text-sm"></i>
                    </div>
                    <div className="leading-none">
                        <div className="text-sm font-bold text-base-content tracking-wide">ArgusNet</div>
                        <div className="text-[10px] text-base-content/40 mt-0.5">Network Monitor</div>
                    </div>
                </Link>
            </div>

            {/* ── Navigation ───────────────────────────────────── */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.filter(i => i.show).map(item => {
                    const active = pathname === item.to;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            style={{ textDecoration: 'none' }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                                active
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-base-content/55 hover:bg-base-300/70 hover:text-base-content'
                            }`}
                        >
                            <i className={`fas ${item.icon} text-xs w-4 text-center flex-shrink-0 ${active ? 'text-primary' : 'text-base-content/35'}`}></i>
                            <span className="flex-1">{item.label}</span>
                            {item.badge != null && (
                                <span className="min-w-[18px] h-[18px] rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ── Bottom ───────────────────────────────────────── */}
            <div className="px-3 pb-4 pt-3 border-t border-base-300 flex-shrink-0 space-y-1">

                {/* Theme toggle */}
                <button
                    onClick={onThemeToggle}
                    title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-base-content/50 hover:bg-base-300/70 hover:text-base-content transition-all"
                >
                    <i className={`fas ${isLight ? 'fa-moon' : 'fa-sun'} text-xs w-4 text-center flex-shrink-0 text-base-content/35`}></i>
                    {isLight ? 'Dark Mode' : 'Light Mode'}
                </button>

                {/* User card */}
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

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-base-content/50 hover:bg-error/10 hover:text-error transition-all"
                >
                    <i className="fas fa-sign-out-alt text-xs w-4 text-center flex-shrink-0"></i>
                    Sign out
                </button>
            </div>
        </aside>
    );
}
