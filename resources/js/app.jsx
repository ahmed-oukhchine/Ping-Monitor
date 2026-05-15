import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import History from './pages/History';
import Incidents from './pages/Incidents';
import Users from './pages/Users';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

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
        if (pathname === '/history')    setHistoryMounted(true);
        if (pathname === '/incidents')  setIncidentsMounted(true);
        if (pathname === '/monitoring') setMonitoringMounted(true);
        if (pathname === '/users')      setUsersMounted(true);
        if (pathname === '/settings')   setSettingsMounted(true);
        if (pathname === '/audit-log')  setAuditLogMounted(true);
        if (pathname === '/reports')    setReportsMounted(true);
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

            <div ref={mainRef} className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'pl-56' : 'pl-16'}`} style={{ height: '100vh' }}>
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
                        <Settings />
                    </div>
                )}
                {auditLogMounted && (
                    <div className="page-slot" style={{ display: onAuditLog ? 'block' : 'none' }}>
                        <AuditLog active={onAuditLog} />
                    </div>
                )}
                {reportsMounted && (
                    <div className="page-slot" style={{ display: onReports ? 'block' : 'none' }}>
                        <Reports />
                    </div>
                )}
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <AppContent />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

createRoot(document.getElementById('app')).render(<App />);
