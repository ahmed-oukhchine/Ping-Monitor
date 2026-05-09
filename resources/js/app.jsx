import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import History from './pages/History';
import Incidents from './pages/Incidents';
import Users from './pages/Users';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';

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

    // Shared targets state
    const [targets, setTargets]             = useState([]);
    const [targetsLoading, setTargetsLoading] = useState(true);

    // Theme
    const [theme, setTheme] = useState(
        () => document.documentElement.getAttribute('data-theme') || 'dark'
    );
    const isLight = theme === 'light';

    const toggleTheme = () => {
        const next = isLight ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('argusnet_theme', next);
        setTheme(next);
    };

    const logout = () => {
        setUser(null);
        axios.post('/logout').catch(() => {});
    };

    const fetchTargets = async () => {
        try {
            const { data } = await axios.get('/api/targets');
            setTargets(data);
        } catch { /* 401 handled by auth guard */ }
        finally { setTargetsLoading(false); }
    };

    useEffect(() => { if (user) fetchTargets(); }, [user]);

    useEffect(() => {
        if (pathname === '/history')    setHistoryMounted(true);
        if (pathname === '/incidents')  setIncidentsMounted(true);
        if (pathname === '/monitoring') setMonitoringMounted(true);
        if (pathname === '/users')      setUsersMounted(true);
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

    return (
        <div className="flex min-h-screen bg-base-100">
            <Sidebar
                onLogout={logout}
                onThemeToggle={toggleTheme}
                isLight={isLight}
                offlineCount={targets.filter(t => !t.is_paused && t.last_status === false).length}
            />

            <div className="flex-1 pl-56">
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
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

createRoot(document.getElementById('app')).render(<App />);
