import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

const termGreen = '#00ff41';
const termDark = '#0a0a0a';

export default function TerminalModal({ target, onClose }) {
    const { toast } = useToast();
    const [host, setHost] = useState(target?.ip_address || '');
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [connected, setConnected] = useState(false);
    const [lines, setLines] = useState([]);
    const [running, setRunning] = useState(false);
    const [history, setHistory] = useState([]);
    const [histIdx, setHistIdx] = useState(-1);
    const [typed, setTyped] = useState('');
    const inputRef = useRef(null);
    const outputRef = useRef(null);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines, typed]);

    useEffect(() => {
        if (connected && outputRef.current) {
            outputRef.current.focus();
        }
    }, [connected]);

    const focusInput = () => {
        setTimeout(() => outputRef.current?.focus(), 50);
    };

    const addLine = (text, type = 'output') => {
        setLines(prev => [...prev, { text, type, id: Date.now() + Math.random() }]);
    };

    const handleConnect = () => {
        if (!host || !username || !password) {
            toast('Fill in host, username and password', 'error');
            return;
        }
        addLine(`Connecting to ${host}:${port}...`, 'info');
        axios.post('/api/terminal/exec', { host, port, username, password, command: 'echo CONNECTED' })
            .then(({ data }) => {
                if (data.success) {
                    setConnected(true);
                    addLine('Connected successfully', 'success');
                    addLine(`[${username}@${host}]$ `, 'prompt');
                    focusInput();
                } else {
                    addLine(`Connection failed: ${data.output}`, 'error');
                }
            })
            .catch(() => addLine('Connection failed: server unreachable', 'error'));
    };

    const handleDisconnect = () => {
        setConnected(false);
        setLines(prev => [...prev, { text: 'Disconnected', type: 'info', id: Date.now() }]);
        setHistory([]);
        setHistIdx(-1);
        setTyped('');
    };

    const sendCommand = async (cmd) => {
        if (!cmd.trim()) return;
        const promptLine = lines[lines.length - 1];
        if (promptLine?.type === 'prompt') {
            setLines(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], text: `${updated[updated.length - 1].text}${cmd}` };
                return updated;
            });
        } else {
            addLine(`$ ${cmd}`, 'input');
        }
        setRunning(true);
        setTyped('');
        setHistory(prev => [cmd, ...prev.slice(0, 99)]);
        setHistIdx(-1);

        try {
            const { data } = await axios.post('/api/terminal/exec', { host, port, username, password, command: cmd });
            if (data.success) {
                const out = data.output.trim();
                if (out) {
                    out.split('\n').forEach(l => addLine(l || ' ', 'output'));
                }
            } else {
                addLine(`Error: ${data.output}`, 'error');
            }
        } catch {
            addLine('Connection lost', 'error');
            setConnected(false);
        }
        setRunning(false);
        addLine(`[${username}@${host}]$ `, 'prompt');
        focusInput();
    };

    const handleKeyDown = (e) => {
        if (!connected) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = typed;
            setTyped('');
            sendCommand(cmd);
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            setTyped(prev => prev.slice(0, -1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0) {
                const next = Math.min(histIdx + 1, history.length - 1);
                setHistIdx(next);
                setTyped(history[next]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (histIdx > 0) {
                const next = histIdx - 1;
                setHistIdx(next);
                setTyped(history[next]);
            } else {
                setHistIdx(-1);
                setTyped('');
            }
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setLines([]);
            addLine(`[${username}@${host}]$ `, 'prompt');
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setTyped(prev => prev + e.key);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ background: termDark, border: '1px solid #1a1a2e', borderRadius: 0 }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-2 border-b"
                    style={{ background: '#0d0d0d', borderColor: '#1a1a2e' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: termGreen }}>{'>'}_ TERMINAL</span>
                        {connected && (
                            <>
                                <span className="text-[9px]" style={{ color: '#555' }}>|</span>
                                <span className="text-[9px]" style={{ color: '#555' }}>{username}@{host}:{port}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px]" style={{ color: connected ? termGreen : '#666' }}>
                            {connected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                        <button onClick={onClose} className="text-xs" style={{ color: '#666' }}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {!connected ? (
                    <div className="p-5 space-y-3" style={{ background: termDark }}>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#666' }}>Host</label>
                                <input value={host} onChange={e => setHost(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-mono outline-none"
                                    style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', color: termGreen, borderRadius: 0 }} />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#666' }}>Port</label>
                                <input type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 22)}
                                    className="w-full px-3 py-2 text-xs font-mono outline-none"
                                    style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', color: termGreen, borderRadius: 0 }} />
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleConnect}
                                    className="w-full px-4 py-2 text-xs font-bold transition-all"
                                    style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', color: termGreen, borderRadius: 0 }}>
                                    {'>'} CONNECT
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#666' }}>Username</label>
                                <input value={username} onChange={e => setUsername(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-mono outline-none"
                                    style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', color: termGreen, borderRadius: 0 }} />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest mb-1 block" style={{ color: '#666' }}>Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleConnect(); }}
                                    className="w-full px-3 py-2 text-xs font-mono outline-none"
                                    style={{ background: '#0d0d0d', border: '1px solid #1a1a2e', color: termGreen, borderRadius: 0 }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col" style={{ background: '#000000' }}>
                        <div ref={outputRef} tabIndex={0} onKeyDown={handleKeyDown}
                            className="overflow-y-auto p-4 font-mono text-xs leading-relaxed select-text outline-none cursor-text"
                            style={{ background: '#000000', minHeight: '360px', maxHeight: '420px', color: '#c0c0c0', caretColor: termGreen }}>
                            {lines.map((l, i) => (
                                <div key={l.id} className="whitespace-pre-wrap break-all"
                                    style={{
                                        color: l.type === 'error' ? '#ff4444' :
                                               l.type === 'success' ? termGreen :
                                               l.type === 'info' ? '#888' :
                                               l.type === 'input' ? termGreen :
                                               l.type === 'prompt' ? termGreen :
                                               '#c0c0c0'
                                    }}>{l.text}</div>
                            ))}
                            {connected && (
                                <div className="whitespace-pre-wrap break-all" style={{ color: termGreen }}>
                                    {typed}<span className="animate-pulse" style={{ color: termGreen }}>▊</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
