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

function ThemeToggle() {
    const [theme, setTheme] = useState(
        () => document.documentElement.getAttribute('data-theme') || 'dark'
    );
    const isLight = theme === 'light';

    const toggle = () => {
        const next = isLight ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('argusnet_theme', next);
        setTheme(next);
    };

    return (
        <button
            onClick={toggle}
            title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
            className="fixed bottom-6 right-6 z-[9999] w-11 h-11 rounded-xl bg-base-200 border border-base-300 hover:border-primary/50 hover:bg-primary/10 text-base-content/60 hover:text-primary transition-all duration-200 flex items-center justify-center shadow-lg"
        >
            <i className={`fas ${isLight ? 'fa-moon' : 'fa-sun'} text-sm`}></i>
        </button>
    );
}

function AppContent() {
    const { pathname } = useLocation();
    const [historyMounted, setHistoryMounted] = useState(false);
    useEffect(() => {
        if (pathname === '/history') setHistoryMounted(true);
    }, [pathname]);

    const onDashboard = pathname === '/' || pathname === '/dashboard';
    const onHistory   = pathname === '/history';

    return (
        <>
            <div style={{ display: onDashboard ? 'block' : 'none' }}>
                <Dashboard />
            </div>
            {historyMounted && (
                <div style={{ display: onHistory ? 'block' : 'none' }}>
                    <History />
                </div>
            )}
            <ThemeToggle />
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
