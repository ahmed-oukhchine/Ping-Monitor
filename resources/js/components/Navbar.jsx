import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const { pathname } = useLocation();

    return (
        <nav style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            padding: '0 1.5rem',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-satellite-dish" style={{ color: 'var(--accent)', fontSize: 18 }}></i>
                <span style={{
                    fontWeight: 700,
                    fontSize: 17,
                    background: 'linear-gradient(135deg, var(--accent), #8bddff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    ArgusNet
                </span>
            </Link>

            <div style={{ display: 'flex', gap: 6 }}>
                <NavLink to="/" active={pathname === '/'} icon="fa-tachometer-alt" label="Dashboard" />
                <NavLink to="/history" active={pathname === '/history'} icon="fa-history" label="History" />
            </div>
        </nav>
    );
}

function NavLink({ to, active, icon, label }) {
    return (
        <Link to={to} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 13,
            background: active ? 'rgba(88,166,255,.15)' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--muted)',
            border: `1px solid ${active ? 'rgba(88,166,255,.3)' : 'transparent'}`,
            transition: 'all .15s',
        }}>
            <i className={`fas ${icon}`}></i>
            {label}
        </Link>
    );
}
