import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import translations from '../i18n/translations';

const LangContext = createContext();

function getInitial() {
    try { return localStorage.getItem('siren_lang') || 'en'; } catch { return 'en'; }
}

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(getInitial);
    const rtlLangs = ['ar'];

    const setLang = useCallback((l) => {
        setLangState(l);
        try { localStorage.setItem('siren_lang', l); } catch {}
    }, []);

    const isRTL = rtlLangs.includes(lang);

    useEffect(() => {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }, [isRTL]);

    const t = useCallback((key, params = {}) => {
        const entry = translations[key];
        if (!entry) return key;
        let val = entry[lang] || entry.en || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => { val = val.replace(`{${k}}`, v); });
        }
        return val;
    }, [lang]);

    return (
        <LangContext.Provider value={{ lang, setLang, t, isRTL }}>
            {children}
        </LangContext.Provider>
    );
}

export function useLang() {
    return useContext(LangContext);
}
export { LangContext };
