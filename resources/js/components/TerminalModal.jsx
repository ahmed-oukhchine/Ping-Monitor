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
    const [command, setCommand] = useState('');
    const [lines, setLines] = useState([]);
    const [running, setRunning] = useState(false);
    const [history, setHistory] = useState([]);
    const [histIdx, setHistIdx] = useState(-1);
    const inputRef = useRef(null);
    const outputRef = useRef(null);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines]);

    useEffect(() => {
        if (connected && inputRef.current) {
            inputRef.current.focus();
        }
    }, [connected]);

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
    };

    const handleCommand = async (cmd) => {
        if (!cmd.trim()) return;
        setRunning(true);
        addLine(`$ ${cmd}`, 'input');
        setHistory(prev => [cmd, ...prev.slice(0, 99)]);
        setHistIdx(-1);
        setCommand('');

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
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommand(command);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length > 0) {
                const next = Math.min(histIdx + 1, history.length - 1);
                setHistIdx(next);
                setCommand(history[next]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (histIdx > 0) {
                const next = histIdx - 1;
                setHistIdx(next);
                setCommand(history[next]);
            } else {
                setHistIdx(-1);
                setCommand('');
            }
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
                    <span className="text-xs font-bold" style={{ color: termGreen }}>{'>'}_ TERMINAL</span>
                    <span className="text-[10px]" style={{ color: '#666' }}>
                        {target?.name || 'SSH'}
                        <span className="mx-2">|</span>
                        {connected ? <span style={{ color: termGreen }}>CONNECTED</span> : 'DISCONNECTED'}
                    </span>
                    <button onClick={onClose} className="text-xs" style={{ color: '#666' }}>
                        <i className="fas fa-times"></i>
                    </button>
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
                    <div className="flex-1 flex flex-col p-0" style={{ background: termDark }}>
                        <div ref={outputRef}
                            className="overflow-y-auto p-4 font-mono text-xs leading-relaxed select-text"
                            style={{ background: '#000000', minHeight: '320px', maxHeight: '400px', color: '#c0c0c0' }}>
                            {lines.map(l => (
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
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2"
                            style={{ background: '#000000', borderTop: '1px solid #0a0a0a' }}>
                            <span className="text-xs font-mono flex-shrink-0" style={{ color: termGreen }}>$</span>
                            <input ref={inputRef} value={command} onChange={e => setCommand(e.target.value)}
                                onKeyDown={handleKeyDown} disabled={running}
                                className="flex-1 bg-transparent border-none outline-none text-xs font-mono"
                                style={{ color: '#c0c0c0' }} placeholder={running ? '' : ''} />
                            <button onClick={() => handleCommand(command)} disabled={running || !command.trim()}
                                className="text-[9px] font-bold px-2 py-1 transition-all"
                                style={{ background: '#0a0a0a', border: '1px solid #1a1a2e', color: running ? '#555' : termGreen, borderRadius: 0 }}>
                                {running ? '...' : 'SEND'}
                            </button>
                            <button onClick={() => setLines([])}
                                className="text-[9px] font-bold px-2 py-1 transition-all"
                                style={{ background: '#0a0a0a', border: '1px solid #1a1a2e', color: '#666', borderRadius: 0 }}>
                                CLS
                            </button>
                            <button onClick={handleDisconnect}
                                className="text-[9px] font-bold px-2 py-1 transition-all"
                                style={{ background: '#0a0a0a', border: '1px solid #1a1a2e', color: '#ff4444', borderRadius: 0 }}>
                                EXIT
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
