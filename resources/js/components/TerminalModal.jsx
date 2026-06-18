import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

export default function TerminalModal({ target, sshConfig, onClose }) {
    const { toast } = useToast();
    const auto = sshConfig?.host && sshConfig?.password && (sshConfig?.protocol !== 'telnet' ? sshConfig?.username : true);
    const [protocol, setProtocol] = useState(sshConfig?.protocol || 'ssh');
    const [host, setHost] = useState(sshConfig?.host || target?.ip_address || '');
    const [port, setPort] = useState(sshConfig?.port || (sshConfig?.protocol === 'telnet' ? 23 : 22));
    const [username, setUsername] = useState(sshConfig?.username || '');
    const [password, setPassword] = useState(sshConfig?.password || '');
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [lines, setLines] = useState([]);
    const [running, setRunning] = useState(false);
    const [history, setHistory] = useState([]);
    const [histIdx, setHistIdx] = useState(-1);
    const [typed, setTyped] = useState('');
    const outputRef = useRef(null);
    const mountedRef = useRef(true);
    const [showForm, setShowForm] = useState(false);

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

    useEffect(() => {
        mountedRef.current = true;
        if (auto) handleConnect();
        else setShowForm(true);
        return () => { mountedRef.current = false; };
    }, []);

    const focusInput = () => {
        setTimeout(() => outputRef.current?.focus(), 50);
    };

    const addLine = (text, type = 'output') => {
        setLines(prev => [...prev, { text, type, id: Date.now() + Math.random() }]);
    };

    const handleConnect = () => {
        if (!host || !password) {
            toast('Fill in host and password', 'error');
            return;
        }
        if (protocol !== 'telnet' && !username) {
            toast('Fill in username for SSH', 'error');
            return;
        }
        setConnecting(true);
        addLine(`Connecting to ${host}:${port} via ${protocol.toUpperCase()}...`, 'info');
        axios.post('/api/terminal/exec', { protocol, host, port, username, password, command: 'echo CONNECTED' })
            .then(({ data }) => {
                if (!mountedRef.current) return;
                setConnecting(false);
                if (data.success) {
                    setConnected(true);
                    addLine('Connected successfully', 'success');
                    addLine(protocol === 'telnet' ? `[${host}]$ ` : `[${username}@${host}]$ `, 'prompt');
                    focusInput();
                } else {
                    addLine(`Connection failed: ${data.output}`, 'error');
                }
            })
            .catch(() => {
                if (!mountedRef.current) return;
                setConnecting(false);
                addLine('Connection failed: server unreachable', 'error');
            });
    };

    const handleDisconnect = () => {
        setConnected(false);
        setLines(prev => [...prev, { text: 'Disconnected', type: 'info', id: Date.now() }]);
        setHistory([]);
        setHistIdx(-1);
        setTyped('');
        setShowForm(true);
    };

    const sendCommand = async (cmd) => {
        if (!cmd.trim()) return;
        setRunning(true);
        setTyped('');
        setHistory(prev => [cmd, ...prev.slice(0, 99)]);
        setHistIdx(-1);

        try {
            const { data } = await axios.post('/api/terminal/exec', { protocol, host, port, username, password, command: cmd });
            if (data.success) {
                const prev = [...lines];
                const promptLine = prev[prev.length - 1];
                if (promptLine?.type === 'prompt') {
                    prev[prev.length - 1] = { ...promptLine, text: `${promptLine.text}${cmd}` };
                }
                const out = data.output.trim();
                if (out) {
                    out.split('\n').forEach(l => prev.push({ text: l || ' ', type: 'output', id: Date.now() + Math.random() }));
                }
                const prompt = protocol === 'telnet' ? `[${host}]$ ` : `[${username}@${host}]$ `;
                prev.push({ text: prompt, type: 'prompt', id: Date.now() + Math.random() });
                setLines(prev);
            } else {
                addLine(`Error: ${data.output}`, 'error');
            }
        } catch {
            addLine('Connection lost', 'error');
            setConnected(false);
        }
        setRunning(false);
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
            addLine(protocol === 'telnet' ? `[${host}]$ ` : `[${username}@${host}]$ `, 'prompt');
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setTyped(prev => prev + e.key);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-200"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-base-300 bg-base-300/30">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{'\u003E_'} TERMINAL</span>
                        {connected && (
                            <>
                                <span className="text-[10px] text-base-content/30">|</span>
                                <span className="text-[10px] text-base-content/50">{username}@{host}:{port}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${connected ? 'text-success' : 'text-base-content/40'}`}>
                            {connected ? 'CONNECTED' : connecting ? 'CONNECTING…' : 'DISCONNECTED'}
                        </span>
                        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300 transition-all">
                            <i className="fas fa-times text-[11px]"></i>
                        </button>
                    </div>
                </div>

                {!connected && showForm && (
                    <div className="p-5 space-y-3 bg-base-200">
                        <div className="grid grid-cols-5 gap-3">
                            <div>
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Protocol</label>
                                <div className="flex bg-base-300 border border-base-300 rounded-xl overflow-hidden">
                                    <button onClick={() => { setProtocol('ssh'); setPort(22); }}
                                        className={`flex-1 px-2 py-2 text-[10px] font-bold transition-all ${protocol === 'ssh' ? 'bg-primary/20 text-primary' : 'text-base-content/40 hover:text-base-content/60'}`}>
                                        SSH
                                    </button>
                                    <button onClick={() => { setProtocol('telnet'); setPort(23); }}
                                        className={`flex-1 px-2 py-2 text-[10px] font-bold transition-all ${protocol === 'telnet' ? 'bg-primary/20 text-primary' : 'text-base-content/40 hover:text-base-content/60'}`}>
                                        Telnet
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Host</label>
                                <input value={host} onChange={e => setHost(e.target.value)}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Port</label>
                                <input type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || (protocol === 'telnet' ? 23 : 22))}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleConnect} disabled={connecting}
                                    className="w-full px-4 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 disabled:opacity-40 transition-all">
                                    {connecting ? <i className="fas fa-spinner fa-spin text-[10px] mr-1"></i> : <i className="fas fa-plug text-[10px] mr-1"></i>}
                                    {connecting ? 'Connecting…' : 'Connect'}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {protocol !== 'telnet' && (
                                <div>
                                    <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Username</label>
                                    <input value={username} onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                                </div>
                            )}
                            <div className={protocol === 'telnet' ? 'col-span-2' : ''}>
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleConnect(); }}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                        </div>
                    </div>
                )}

                {!connected && connecting && (
                    <div className="flex items-center justify-center py-20 bg-base-200 text-base-content/40">
                        <span className="loading loading-spinner loading-md mr-3"></span>
                        <span className="text-xs font-medium">Connecting to {host}:{port}…</span>
                    </div>
                )}

                {connected && (
                    <div className="flex flex-col bg-base-100">
                        <div ref={outputRef} tabIndex={0} onKeyDown={handleKeyDown}
                            className="overflow-y-auto p-4 font-mono text-xs leading-relaxed select-text outline-none cursor-text"
                            style={{ minHeight: '360px', maxHeight: '420px' }}>
                            {lines.map((l) => (
                                <div key={l.id} className={`whitespace-pre-wrap break-all ${
                                    l.type === 'error' ? 'text-error' :
                                    l.type === 'success' ? 'text-success' :
                                    l.type === 'info' ? 'text-base-content/50' :
                                    l.type === 'prompt' ? 'text-primary' :
                                    'text-base-content'
                                }`}>{l.text}</div>
                            ))}
                            {connected && (
                                <div className="whitespace-pre-wrap break-all text-primary">
                                    {typed}<span className="animate-pulse">▊</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
