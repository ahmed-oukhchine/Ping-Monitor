import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
    const { pathname } = useLocation();
    const { user, setUser } = useAuth();
    const onDash  = pathname === '/';
    const onMon   = pathname === '/monitoring';
    const onHist  = pathname === '/history';

    const logout = () => {
        setUser(null);
        axios.post('/logout').catch(() => {});
    };

    return (
        <header className="sticky top-0 z-50 bg-base-200/90 backdrop-blur-md border-b border-base-300">
            <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">

                <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                    <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                        <i className="fas fa-satellite-dish text-primary text-sm"></i>
                    </div>
                    <div className="leading-none">
                        <div className="text-sm font-bold text-base-content tracking-wide">SIREN</div>
                        <div className="text-[10px] text-base-content/40 mt-0.5">Network Monitor</div>
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    <nav className="flex items-center gap-1">
                        <Link to="/"
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                onDash
                                    ? 'bg-primary/15 text-primary border border-primary/25'
                                    : 'text-base-content/60 hover:text-base-content hover:bg-base-300/60 border border-transparent'
                            }`}
                            style={{ textDecoration: 'none' }}
                        >
                            <i className="fas fa-chart-pie text-xs"></i>
                            Dashboard
                        </Link>
                        <Link to="/monitoring"
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                onMon
                                    ? 'bg-primary/15 text-primary border border-primary/25'
                                    : 'text-base-content/60 hover:text-base-content hover:bg-base-300/60 border border-transparent'
                            }`}
                            style={{ textDecoration: 'none' }}
                        >
                            <i className="fas fa-tachometer-alt text-xs"></i>
                            Monitoring
                        </Link>
                        <Link to="/history"
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                onHist
                                    ? 'bg-primary/15 text-primary border border-primary/25'
                                    : 'text-base-content/60 hover:text-base-content hover:bg-base-300/60 border border-transparent'
                            }`}
                            style={{ textDecoration: 'none' }}
                        >
                            <i className="fas fa-history text-xs"></i>
                            History
                        </Link>
                    </nav>

                    <div className="flex items-center gap-2.5 pl-3 border-l border-base-300">
                        <div className="text-right leading-none">
                            <div className="text-xs font-semibold text-base-content">{user?.name}</div>
                            <span className={`inline-block text-[10px] mt-0.5 font-medium px-1.5 py-0.5 rounded ${
                                user?.role === 'admin'
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-base-300 text-base-content/50'
                            }`}>
                                {user?.role}
                            </span>
                        </div>
                        <button
                            onClick={logout}
                            title="Logout"
                            className="w-8 h-8 rounded-lg bg-base-300/60 hover:bg-error/10 hover:text-error text-base-content/50 transition-all flex items-center justify-center"
                        >
                            <i className="fas fa-sign-out-alt text-xs"></i>
                        </button>
                    </div>
                </div>

            </div>
        </header>
    );
}
