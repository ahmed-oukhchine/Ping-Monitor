import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser]               = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/user')
            .then(({ data }) => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setAuthLoading(false));
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, authLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
