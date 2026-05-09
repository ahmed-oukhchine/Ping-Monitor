import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Statistics from './pages/Statistics';
import Dashboard from './pages/Dashboard';
import History from './pages/History';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/"           element={<Dashboard />} />
                <Route path="/monitoring" element={<Statistics />} />
                <Route path="/history"    element={<History />} />
                <Route path="*"           element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}
