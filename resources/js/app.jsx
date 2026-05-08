import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import History from './pages/History';

axios.defaults.headers.common['X-CSRF-TOKEN'] = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute('content');
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

function AppContent() {
    const { pathname } = useLocation();
    // Lazy-mount History only after first visit so it doesn't fetch on startup
    const [historyMounted, setHistoryMounted] = useState(false);
    useEffect(() => {
        if (pathname === '/history') setHistoryMounted(true);
    }, [pathname]);

    const onDashboard = pathname === '/' || pathname === '/dashboard';
    const onHistory   = pathname === '/history';

    return (
        <>
            {/* Dashboard stays mounted permanently — timer never resets */}
            <div style={{ display: onDashboard ? 'block' : 'none' }}>
                <Dashboard />
            </div>

            {/* History mounts on first visit, stays mounted after */}
            {historyMounted && (
                <div style={{ display: onHistory ? 'block' : 'none' }}>
                    <History />
                </div>
            )}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

createRoot(document.getElementById('app')).render(<App />);
