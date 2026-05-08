import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const { pathname } = useLocation();
    const onDash = pathname === '/' || pathname === '/dashboard';
    const onHist = pathname === '/history';

    return (
        <header className="sticky top-0 z-50 bg-base-200/90 backdrop-blur-md border-b border-base-300">
            <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">

                <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                    <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                        <i className="fas fa-satellite-dish text-primary text-sm"></i>
                    </div>
                    <div className="leading-none">
                        <div className="text-sm font-bold text-base-content tracking-wide">ArgusNet</div>
                        <div className="text-[10px] text-base-content/40 mt-0.5">Network Monitor</div>
                    </div>
                </Link>

                <nav className="flex items-center gap-1">
                    <Link to="/"
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                            onDash
                                ? 'bg-primary/15 text-primary border border-primary/25'
                                : 'text-base-content/60 hover:text-base-content hover:bg-base-300/60 border border-transparent'
                        }`}
                        style={{ textDecoration: 'none' }}
                    >
                        <i className="fas fa-tachometer-alt text-xs"></i>
                        Dashboard
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
            </div>
        </header>
    );
}
