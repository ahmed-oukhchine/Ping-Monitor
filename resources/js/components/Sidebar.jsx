import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

const themeIcons = { light: 'fa-sun', dark: 'fa-moon', system: 'fa-desktop' };

const sections = [
  {
    label: 'Overview',
    items: [
      { to: '/',           labelKey: 'dashboard',  icon: 'fa-chart-pie',          admin: false },
      { to: '/monitoring', labelKey: 'monitoring', icon: 'fa-tachometer-alt',     admin: false },
      { to: '/topology',   labelKey: 'topology',   icon: 'fa-project-diagram',    admin: false },
    ],
  },
  {
    label: 'Data & Alerts',
    items: [
      { to: '/history',    labelKey: 'history',    icon: 'fa-history',            admin: false },
      { to: '/incidents',  labelKey: 'incidents',  icon: 'fa-exclamation-circle', admin: false },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/reports',    labelKey: 'reports',    icon: 'fa-file-alt',           admin: false },
      { to: '/maintenance', labelKey: 'maintenance', icon: 'fa-calendar-alt',     admin: false },
    ],
  },
  {
    label: 'Administration',
    admin: true,
    items: [
      { to: '/users',      labelKey: 'users',      icon: 'fa-users',              admin: true },
      { to: '/audit-log',  labelKey: 'auditLog',   icon: 'fa-clipboard-list',     admin: true },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings',   labelKey: 'settings',   icon: 'fa-cog',                admin: false },
    ],
  },
];

export default function Sidebar({ open, onToggle, onLogout, onCycleTheme, themePref, offlineCount = 0 }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useLang();
  const isAdmin = user?.role === 'admin';

  const linkClass = (active) =>
    `relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
      active
        ? 'nav-active bg-primary/10 text-primary shadow-sm'
        : 'text-base-content/55 hover:bg-base-300/70 hover:text-base-content'
    } ${open ? 'gap-3 px-3 py-2.5' : 'gap-0 px-0 py-3 justify-center'}`;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onToggle} />
      )}

      <aside className={`fixed top-0 left-0 h-screen bg-base-200/95 backdrop-blur-xl border-r border-base-300 flex flex-col z-50 shadow-xl shadow-black/15 transition-all duration-300 ${
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
                <circle cx="30" cy="30" r="3" fill="#22c55e" stroke="#2563eb" strokeWidth="1.5"/>
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

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {open ? (
            <div className="space-y-3">
              {sections.map((section) => {
                if (section.admin && !isAdmin) return null;
                const visible = section.items.filter(i => !i.admin || isAdmin);
                if (!visible.length) return null;
                return (
                  <div key={section.label}>
                    <div className="px-3 mb-1">
                      <div className="text-[8px] font-semibold uppercase tracking-widest text-base-content/25">{section.label}</div>
                    </div>
                    <div className="space-y-0.5">
                      {visible.map((item) => {
                        const active = pathname === item.to;
                        const badge = item.to === '/monitoring' ? offlineCount : null;
                        return (
                          <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}
                            className={linkClass(active)}>
                            {active && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary"></div>
                            )}
                            <div className="relative flex items-center justify-center flex-shrink-0 w-4">
                              <i className={`nav-icon fas ${item.icon} text-xs text-center ${active ? 'text-primary' : 'text-base-content/35'}`}></i>
                            </div>
                            <span className="flex-1">{t(`sidebar.${item.labelKey}`)}</span>
                            {badge != null && badge > 0 && (
                              <span className="min-w-[18px] h-[18px] rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none shadow-sm shadow-error/40">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {sections.flatMap(s => s.items).filter(i => !i.admin || isAdmin).map((item) => {
                const active = pathname === item.to;
                const badge = item.to === '/monitoring' ? offlineCount : null;
                return (
                  <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}
                    className={linkClass(active)}
                    title={t(`sidebar.${item.labelKey}`)}>
                    <div className="relative flex items-center justify-center flex-shrink-0 w-4">
                      <i className={`nav-icon fas ${item.icon} text-xs text-center ${active ? 'text-primary' : 'text-base-content/35'}`}></i>
                      {badge != null && badge > 0 && (
                        <span className="absolute -top-2 -right-3 min-w-[14px] h-[14px] rounded-full bg-error text-white text-[7px] font-bold flex items-center justify-center px-0.5 leading-none shadow-sm shadow-error/40">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
          <div className="px-1.5 pb-4 pt-3 border-t border-base-300 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center"
                title={user?.name}>
                <i className="fas fa-user text-primary text-[10px]"></i>
              </div>
            </div>

            <div className="flex items-center justify-center gap-[1px]">
              {['light', 'dark', 'system'].map(mode => (
                <button key={mode} onClick={() => onCycleTheme(mode)}
                  className={`w-[15px] h-[18px] flex items-center justify-center rounded-md text-[7px] transition-all ${
                    themePref === mode
                      ? 'bg-primary/15 text-primary'
                      : 'text-base-content/25 hover:text-base-content hover:bg-base-300/50'
                  }`}
                  title={mode.charAt(0).toUpperCase() + mode.slice(1)}>
                  <i className={`fas ${themeIcons[mode]}`}></i>
                </button>
              ))}
            </div>

            <button onClick={onLogout}
              className="w-full flex items-center justify-center py-1.5 rounded-xl text-base-content/30 hover:text-error hover:bg-error/10 transition-all"
              title="Sign out">
              <i className="fas fa-sign-out-alt text-[10px]"></i>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
