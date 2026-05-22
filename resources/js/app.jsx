import React, { useState, useEffect, useRef, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import axios from 'axios';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Statistics = React.lazy(() => import('./pages/Statistics'));
const History = React.lazy(() => import('./pages/History'));
const Incidents = React.lazy(() => import('./pages/Incidents'));
const Users = React.lazy(() => import('./pages/Users'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AuditLog = React.lazy(() => import('./pages/AuditLog'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const Topology = React.lazy(() => import('./pages/Topology'));
const Login = React.lazy(() => import('./pages/Login'));
import Sidebar from './components/Sidebar';
import { LangContext } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LanguageProvider } from './contexts/LanguageContext';

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

class ErrorFallback extends React.Component {
  state = { error: null };
  static contextType = LangContext;
  componentDidCatch() { this.setState({ error: true }); }
  render() {
    if (this.state.error) {
      const { t } = this.context;
      return (
        <div className="flex items-center justify-center h-full text-base-content/40">
          <div className="text-center">
            <div className="text-2xl mb-2">⚠</div>
            <div className="text-sm font-medium mb-1">{t('error.pageCrashed')}</div>
            <button onClick={() => this.setState({ error: null })} className="text-xs text-primary hover:underline">{t('error.reloadPage')}</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
    const { pathname } = useLocation();
    const { user, setUser, authLoading } = useAuth();

    const [historyMounted,    setHistoryMounted]    = useState(false);
    const [incidentsMounted, setIncidentsMounted]  = useState(false);
    const [monitoringMounted, setMonitoringMounted] = useState(false);
    const [usersMounted,      setUsersMounted]      = useState(false);
    const [settingsMounted,   setSettingsMounted]   = useState(false);
    const [auditLogMounted,   setAuditLogMounted]   = useState(false);
    const [reportsMounted,    setReportsMounted]    = useState(false);
    const [maintenanceMounted, setMaintenanceMounted] = useState(false);
    const [topologyMounted, setTopologyMounted]       = useState(false);
    const [sidebarOpen, setSidebarOpen]             = useState(true);

    const [targets, setTargets]             = useState([]);
    const [targetsLoading, setTargetsLoading] = useState(true);

    const mainRef = useRef(null);

    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);

    const [themePref, setThemePref] = useState(
        () => localStorage.getItem('argusnet_theme') || 'system'
    );

    const getResolved = (pref) => {
        if (pref === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return pref;
    };

    useEffect(() => {
        const resolved = getResolved(themePref);
        document.documentElement.setAttribute('data-theme', resolved);
        localStorage.setItem('argusnet_theme', themePref);
    }, [themePref]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (themePref === 'system') {
                document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [themePref]);

    const isLight = getResolved(themePref) === 'light';

    const setTheme = (mode) => setThemePref(mode);

    const logout = async () => {
        try { await axios.post('/logout'); } catch {}
        setUser(null);
    };

    const fetchTargets = async () => {
        try {
            const { data } = await axios.get('/api/targets');
            setTargets(data);
        } catch {}
        finally { setTargetsLoading(false); }
    };

    useEffect(() => { if (user) fetchTargets(); }, [user]);

    useEffect(() => {
        setHistoryMounted(pathname === '/history');
        setIncidentsMounted(pathname === '/incidents');
        setMonitoringMounted(pathname === '/monitoring');
        setUsersMounted(pathname === '/users');
        setSettingsMounted(pathname === '/settings');
        setAuditLogMounted(pathname === '/audit-log');
        setReportsMounted(pathname === '/reports');
        setMaintenanceMounted(pathname === '/maintenance');
        setTopologyMounted(pathname === '/topology');
    }, [pathname]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    const onDashboard  = pathname === '/';
    const onMonitoring = pathname === '/monitoring';
    const onHistory    = pathname === '/history';
    const onIncidents  = pathname === '/incidents';
    const onUsers      = pathname === '/users';
    const onSettings   = pathname === '/settings';
    const onAuditLog   = pathname === '/audit-log';
    const onReports    = pathname === '/reports';
    const onMaintenance = pathname === '/maintenance';
    const onTopology    = pathname === '/topology';

    return (
        <div className="flex min-h-screen bg-base-100">
            <Sidebar
                open={sidebarOpen}
                onToggle={() => setSidebarOpen(o => !o)}
                onLogout={logout}
                onCycleTheme={setTheme}
                themePref={themePref}
                isLight={isLight}
                offlineCount={targets.filter(t => !t.is_paused && t.last_status === false).length}
            />

            <div ref={mainRef} className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ps-56' : 'ps-16'}`} style={{ height: '100vh' }}>
                <ErrorFallback>
                <Suspense fallback={<div className="flex items-center justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>}>
                <div className="page-slot" style={{ display: onDashboard ? 'block' : 'none' }}>
                    <Statistics targets={targets} loading={targetsLoading} onRefresh={fetchTargets} />
                </div>
                {monitoringMounted && (
                    <div className="page-slot" style={{ display: onMonitoring ? 'block' : 'none' }}>
                        <Dashboard
                            targets={targets}
                            setTargets={setTargets}
                            fetchTargets={fetchTargets}
                            loading={targetsLoading}
                            sidebarOpen={sidebarOpen}
                        />
                    </div>
                )}
                {historyMounted && (
                    <div className="page-slot" style={{ display: onHistory ? 'block' : 'none' }}>
                        <History />
                    </div>
                )}
                {incidentsMounted && (
                    <div className="page-slot" style={{ display: onIncidents ? 'block' : 'none' }}>
                        <Incidents />
                    </div>
                )}
                {usersMounted && (
                    <div className="page-slot" style={{ display: onUsers ? 'block' : 'none' }}>
                        <Users />
                    </div>
                )}
                {settingsMounted && (
                    <div className="page-slot" style={{ display: onSettings ? 'block' : 'none' }}>
                        <Settings themePref={themePref} onCycleTheme={setTheme} />
                    </div>
                )}
                {auditLogMounted && (
                    <div className="page-slot" style={{ display: onAuditLog ? 'block' : 'none' }}>
                        <AuditLog active={onAuditLog} />
                    </div>
                )}
                {reportsMounted && (
                        <div className="page-slot" style={{ display: onReports ? 'block' : 'none' }}>
                            <Reports user={user} />
                        </div>
                )}
                {maintenanceMounted && (
                    <div className="page-slot" style={{ display: onMaintenance ? 'block' : 'none' }}>
                        <Maintenance />
                    </div>
                )}
                {topologyMounted && (
                    <div className="page-slot" style={{ display: onTopology ? 'block' : 'none' }}>
                        <Topology />
                    </div>
                )}

                </Suspense>
                </ErrorFallback>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <LanguageProvider>
                        <AppContent />
                    </LanguageProvider>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

createRoot(document.getElementById('app')).render(<App />);
