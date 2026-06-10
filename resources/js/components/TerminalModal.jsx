import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}>
            <div className="bg-base-200 border border-base-300 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-base-300">
                    <span className="text-sm font-semibold text-base-content flex items-center gap-2">
                        <i className="fas fa-terminal text-[11px] text-primary"></i>
                        SSH Terminal
                        {target && <span className="text-[11px] text-base-content/40 font-mono">— {target.name}</span>}
                    </span>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-base-300/50 flex items-center justify-center text-base-content/40 hover:text-base-content transition-all">
                        <i className="fas fa-times text-xs"></i>
                    </button>
                </div>

                {!connected ? (
                    <div className="p-5 space-y-3">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Host</label>
                                <input value={host} onChange={e => setHost(e.target.value)}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Port</label>
                                <input type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 22)}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleConnect}
                                    className="w-full px-4 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all flex items-center justify-center gap-1.5">
                                    <i className="fas fa-plug text-[10px]"></i>
                                    Connect
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Username</label>
                                <input value={username} onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 block">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleConnect(); }}
                                    className="w-full bg-base-300 border border-base-300 rounded-xl px-3 py-2 text-xs text-base-content font-mono outline-none focus:border-primary/30 transition-all" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col p-0">
                        <div ref={outputRef}
                            className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
                            style={{ background: '#0d1117', minHeight: '320px', maxHeight: '400px' }}>
                            {lines.map(l => (
                                <div key={l.id}
                                    className={`whitespace-pre-wrap break-all ${
                                        l.type === 'error' ? 'text-red-400' :
                                        l.type === 'success' ? 'text-green-400' :
                                        l.type === 'info' ? 'text-cyan-400' :
                                        l.type === 'input' ? 'text-green-300 font-semibold' :
                                        l.type === 'prompt' ? 'text-green-400' :
                                        'text-gray-300'
                                    }`}>{l.text}</div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800"
                            style={{ background: '#0d1117' }}>
                            <span className="text-green-400 text-xs font-mono flex-shrink-0">$</span>
                            <input ref={inputRef} value={command} onChange={e => setCommand(e.target.value)}
                                onKeyDown={handleKeyDown} disabled={running}
                                className="flex-1 bg-transparent border-none outline-none text-xs text-gray-200 font-mono placeholder-gray-600"
                                placeholder="Type a command..." />
                            <button onClick={() => handleCommand(command)} disabled={running || !command.trim()}
                                className="px-3 py-1 rounded-lg text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 disabled:opacity-30 transition-all">
                                {running ? <span className="loading loading-spinner loading-xs"></span> : 'Send'}
                            </button>
                            <button onClick={handleDisconnect}
                                className="px-3 py-1 rounded-lg text-[10px] font-bold bg-error/15 text-error border border-error/25 hover:bg-error/25 transition-all">
                                <i className="fas fa-power-off text-[9px]"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
