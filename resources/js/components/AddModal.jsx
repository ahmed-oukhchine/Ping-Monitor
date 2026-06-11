import React, { useState } from 'react';

const INPUT = "w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors";

export default function AddModal({ groups = [], onSave, onClose }) {
    const [name, setName]               = useState('');
    const [ip, setIp]                   = useState('');
    const [location, setLocation]       = useState('');
    const [type, setType]               = useState('');
    const [notes, setNotes]             = useState('');
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [warnMs, setWarnMs]           = useState('');
    const [criticalMs, setCriticalMs]   = useState('');
    const [alertEnabled, setAlertEnabled] = useState(false);
    const [alertEmail, setAlertEmail]     = useState('');
    const [alertConsecutive, setAlertConsecutive] = useState(3);
    const [alertCooldown, setAlertCooldown]       = useState(60);
    const [snmpEnabled, setSnmpEnabled]   = useState(false);
    const [snmpCommunity, setSnmpCommunity] = useState('');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');

    const toggleGroup = (id) => {
        setSelectedGroups(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await onSave({
                name:                    name.trim(),
                ip_address:              ip.trim(),
                location:                location.trim(),
                type:                    type || null,
                notes:                   notes.trim() || null,
                group_ids:               selectedGroups,
                warn_ms:                 warnMs     ? parseInt(warnMs)     : null,
                critical_ms:             criticalMs ? parseInt(criticalMs) : null,
                alert_email:             alertEnabled && alertEmail.trim() ? alertEmail.trim() : null,
                alert_consecutive:       alertEnabled ? parseInt(alertConsecutive) || 3 : null,
                alert_cooldown_minutes:  alertEnabled ? parseInt(alertCooldown)    || 60 : null,
                snmp_enabled:            snmpEnabled,
                snmp_community:          snmpEnabled && snmpCommunity.trim() ? snmpCommunity.trim() : null,
                snmp_version:            '2c',
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add target.');
            setLoading(false);
        }
    };

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
            <div className="modal-enter bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <i className="fas fa-plus text-primary text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Add Target</h3>
                            <p className="text-xs text-base-content/40 mt-0.5">Monitor a new device</p>
                        </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg hover:bg-base-300 flex items-center justify-center text-base-content/50 hover:text-base-content transition-colors" onClick={onClose}>
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                <form onSubmit={submit}>
                    <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-1.5">Target Name</label>
                            <input type="text" className={INPUT}
                                placeholder="e.g. Core Switch"
                                value={name} onChange={e => setName(e.target.value)}
                                required autoFocus />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-1.5">IP Address or Hostname</label>
                            <input type="text" className={`${INPUT} font-mono`}
                                placeholder="e.g. 192.168.1.1"
                                value={ip} onChange={e => setIp(e.target.value)}
                                required />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-1.5">Location</label>
                            <div className="relative">
                                <i className="fas fa-map-marker-alt absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 text-xs pointer-events-none"></i>
                                <input type="text" className={`${INPUT} pl-8`}
                                    placeholder="e.g. Server Room A, Floor 2"
                                    value={location} onChange={e => setLocation(e.target.value)}
                                    required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-1.5">
                                Device Type <span className="text-base-content/30 font-normal">(optional)</span>
                            </label>
                            <select className={INPUT}
                                value={type} onChange={e => setType(e.target.value)}>
                                <option value="">— Not specified —</option>
                                <option value="switch">Switch</option>
                                <option value="router">Router</option>
                                <option value="firewall">Firewall</option>
                                <option value="server">Server</option>
                                <option value="workstation">Workstation</option>
                                <option value="printer">Printer</option>
                                <option value="access_point">Access Point</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-1.5">
                                Notes <span className="text-base-content/30 font-normal">(optional)</span>
                            </label>
                            <textarea
                                className={`${INPUT} resize-none`}
                                rows={2}
                                placeholder="Owner, purpose, maintenance schedule…"
                                value={notes} onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {groups.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-base-content/55 mb-2">
                                    Groups <span className="text-base-content/30 font-normal">(optional)</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {groups.map(g => {
                                        const selected = selectedGroups.includes(g.id);
                                        return (
                                            <button key={g.id} type="button"
                                                onClick={() => toggleGroup(g.id)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                                                style={selected ? {
                                                    backgroundColor: `${g.color}25`, color: g.color, borderColor: `${g.color}55`,
                                                } : {
                                                    backgroundColor: 'transparent', color: 'var(--color-base-content)',
                                                    opacity: 0.45, borderColor: 'var(--color-base-300)',
                                                }}>
                                                {selected && <i className="fas fa-check text-[8px]"></i>}
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }}></span>
                                                {g.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-2">
                                Latency Thresholds <span className="text-base-content/30 font-normal">(optional)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0"></span>
                                        <span className="text-[11px] text-base-content/50 font-medium">Warn above</span>
                                    </div>
                                    <div className="relative">
                                        <input type="number" min="1" max="60000" className={`${INPUT} pr-9`}
                                            placeholder="e.g. 100"
                                            value={warnMs} onChange={e => setWarnMs(e.target.value)} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-base-content/30 mono pointer-events-none">ms</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="w-2 h-2 rounded-full bg-error flex-shrink-0"></span>
                                        <span className="text-[11px] text-base-content/50 font-medium">Critical above</span>
                                    </div>
                                    <div className="relative">
                                        <input type="number" min="1" max="60000" className={`${INPUT} pr-9`}
                                            placeholder="e.g. 500"
                                            value={criticalMs} onChange={e => setCriticalMs(e.target.value)} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-base-content/30 mono pointer-events-none">ms</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-base-300/60 pt-3 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-network-wired text-[11px] text-primary/60"></i>
                                    <span className="text-xs font-semibold text-base-content/55">SNMP Monitoring</span>
                                    <span className="text-base-content/30 text-xs font-normal">optional</span>
                                </div>
                                <button type="button" onClick={() => setSnmpEnabled(v => !v)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${snmpEnabled ? 'bg-primary' : 'bg-base-300'}`}>
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${snmpEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                </button>
                            </div>
                            <div className={`overflow-hidden transition-all duration-200 ${snmpEnabled ? 'max-h-40 mt-3' : 'max-h-0'}`}>
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-base-content/45 mb-1.5">
                                            <i className="fas fa-key text-[9px] mr-1"></i>Community string
                                        </label>
                                        <input type="text" className={INPUT}
                                            placeholder="public"
                                            value={snmpCommunity} onChange={e => setSnmpCommunity(e.target.value)}
                                            required={snmpEnabled} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-base-300/60 pt-3 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-bell text-[11px] text-warning/60"></i>
                                    <span className="text-xs font-semibold text-base-content/55">Email Alerts</span>
                                    <span className="text-base-content/30 text-xs font-normal">optional</span>
                                </div>
                                <button type="button" onClick={() => setAlertEnabled(v => !v)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${alertEnabled ? 'bg-primary' : 'bg-base-300'}`}>
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${alertEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                </button>
                            </div>
                            <div className={`overflow-hidden transition-all duration-200 ${alertEnabled ? 'max-h-60 mt-3' : 'max-h-0'}`}>
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-base-content/45 mb-1.5">
                                            <i className="fas fa-envelope text-[9px] mr-1"></i>Alert email
                                        </label>
                                        <input type="email" className={INPUT}
                                            placeholder="ops@example.com"
                                            value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
                                            required={alertEnabled} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-base-content/45 mb-1.5">Trigger after</label>
                                            <div className="relative">
                                                <input type="number" min="1" max="20" className={`${INPUT} pr-16`}
                                                    value={alertConsecutive} onChange={e => setAlertConsecutive(e.target.value)} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-base-content/30 pointer-events-none whitespace-nowrap">failures</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-base-content/45 mb-1.5">Cooldown</label>
                                            <div className="relative">
                                                <input type="number" min="1" max="10080" className={`${INPUT} pr-8`}
                                                    value={alertCooldown} onChange={e => setAlertCooldown(e.target.value)} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-base-content/30 pointer-events-none">min</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2.5">
                                <i className="fas fa-exclamation-circle flex-shrink-0"></i>
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 text-xs font-semibold text-base-content/50 hover:text-base-content hover:bg-base-300/50 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                            {loading
                                ? <><span className="loading loading-spinner loading-xs"></span>Adding…</>
                                : <><i className="fas fa-plus text-[10px]"></i>Add Target</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
