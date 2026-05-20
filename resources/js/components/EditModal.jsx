import React, { useState, useEffect } from 'react';
import axios from 'axios';

const INPUT = "w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors";

export default function EditModal({ target, groups = [], onSave, onClose }) {
    const [name, setName]         = useState(target.name);
    const [ip, setIp]             = useState(target.ip_address);
    const [location, setLocation] = useState(target.location || '');
    const [notes, setNotes]       = useState(target.notes || '');
    const [selectedGroups, setSelectedGroups] = useState(
        (target.groups || []).map(g => g.id)
    );
    const [warnMs, setWarnMs]       = useState(target.warn_ms     ?? '');
    const [criticalMs, setCriticalMs] = useState(target.critical_ms ?? '');
    const [alertEnabled, setAlertEnabled]         = useState(!!target.alert_email);
    const [alertEmail, setAlertEmail]             = useState(target.alert_email || '');
    const [alertConsecutive, setAlertConsecutive] = useState(target.alert_consecutive ?? 3);
    const [alertCooldown, setAlertCooldown]       = useState(target.alert_cooldown_minutes ?? 60);
    const [escEnabled, setEscEnabled]             = useState(!!target.escalation_email);
    const [escEmail, setEscEmail]                 = useState(target.escalation_email || '');
    const [escAfter, setEscAfter]                 = useState(target.escalation_after_minutes ?? 30);
    const [snmpEnabled, setSnmpEnabled]           = useState(!!target.snmp_enabled);
    const [snmpCommunity, setSnmpCommunity]       = useState(target.snmp_community || '');
    const [loading, setLoading]     = useState(false);
    const [allTargets, setAllTargets] = useState([]);
    const [deps, setDeps]           = useState([]);

    useEffect(() => {
        axios.get('/api/targets').then(r => setAllTargets(r.data.filter(t => t.id !== target.id))).catch(() => {});
        axios.get(`/api/targets/${target.id}/dependencies`).then(r => setDeps(r.data.map(d => d.id))).catch(() => {});
    }, [target.id]);

    const toggleGroup = (id) => {
        setSelectedGroups(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDep = async (depId) => {
        if (deps.includes(depId)) {
            await axios.delete(`/api/targets/${target.id}/dependencies/${depId}`);
            setDeps(prev => prev.filter(id => id !== depId));
        } else {
            await axios.post(`/api/targets/${target.id}/dependencies`, { depends_on_target_id: depId });
            setDeps(prev => [...prev, depId]);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(target.id, {
                name:                   name.trim(),
                ip_address:             ip.trim(),
                location:               location.trim(),
                notes:                  notes.trim() || null,
                group_ids:              selectedGroups,
                warn_ms:                warnMs     ? parseInt(warnMs)     : null,
                critical_ms:            criticalMs ? parseInt(criticalMs) : null,
                alert_email:            alertEnabled && alertEmail.trim() ? alertEmail.trim() : null,
                alert_consecutive:      alertEnabled ? parseInt(alertConsecutive) || 3 : null,
                alert_cooldown_minutes: alertEnabled ? parseInt(alertCooldown)    || 60 : null,
                escalation_email:       escEnabled && escEmail.trim() ? escEmail.trim() : null,
                escalation_after_minutes: escEnabled ? parseInt(escAfter) || 30 : null,
                snmp_enabled:           snmpEnabled,
                snmp_community:         snmpEnabled && snmpCommunity.trim() ? snmpCommunity.trim() : null,
                snmp_version:           '2c',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" onClick={onClose}>
            <div className="modal-enter bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                            <i className="fas fa-pen text-warning text-sm"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-base-content leading-none">Edit Target</h3>
                            <p className="text-xs text-base-content/40 mt-0.5">{target.ip_address}</p>
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
                                value={name} onChange={e => setName(e.target.value)}
                                required autoFocus />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-base-content/55 mb-1.5">IP Address or Hostname</label>
                            <input type="text" className={`${INPUT} font-mono`}
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
                                    <div className="text-[10px] text-base-content/30 leading-relaxed">
                                        <i className="fas fa-info-circle mr-1"></i>
                                        After saving, run <strong>snmp:discover</strong> on this target from the Monitoring page.
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

                                        <div className="border-t border-base-300/40 pt-2 mt-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-base-content/45">Escalation</span>
                                                <button type="button" onClick={() => setEscEnabled(v => !v)}
                                                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors cursor-pointer ${escEnabled ? 'bg-error' : 'bg-base-300'}`}>
                                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${escEnabled ? 'translate-x-[17px]' : 'translate-x-[3px]'}`} />
                                                </button>
                                            </div>
                                            <div className={`overflow-hidden transition-all duration-200 ${escEnabled ? 'max-h-40 mt-2' : 'max-h-0'}`}>
                                                <div className="flex flex-col gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-base-content/45 mb-1">Escalation email</label>
                                                        <input type="email" className={INPUT} placeholder="manager@example.com"
                                                            value={escEmail} onChange={e => setEscEmail(e.target.value)} required={escEnabled} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-base-content/45 mb-1">Escalate after</label>
                                                        <div className="relative">
                                                            <input type="number" min="1" max="10080" className={`${INPUT} pr-8`}
                                                                value={escAfter} onChange={e => setEscAfter(e.target.value)} />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-base-content/30 pointer-events-none">min</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] text-base-content/30 leading-relaxed">If still down after this time, the escalation contact is notified instead.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-base-300/60 pt-3 mt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="fas fa-sitemap text-[11px] text-info/60"></i>
                                        <span className="text-xs font-semibold text-base-content/55">Dependencies</span>
                                        <span className="text-base-content/30 text-xs font-normal">optional</span>
                                    </div>
                                    <p className="text-[9px] text-base-content/30 mb-2">If a dependency is down, alerts for this target are suppressed.</p>
                                    <div className="max-h-32 overflow-y-auto bg-base-100 border border-base-300 rounded-lg p-1.5 space-y-0.5">
                                        {allTargets.map(t => {
                                            const sel = deps.includes(t.id);
                                            return (
                                                <button key={t.id} type="button" onClick={() => toggleDep(t.id)}
                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
                                                        sel ? 'bg-info/10 text-info border border-info/20' : 'text-base-content/50 hover:bg-base-300/50'
                                                    }`}>
                                                    <i className={`fas ${sel ? 'fa-check-circle' : 'fa-circle'} text-[7px]`}></i>
                                                    <span className="truncate flex-1 text-left">{t.name}</span>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${t.last_status === true ? 'bg-success' : t.last_status === false ? 'bg-error' : 'bg-base-300'}`}></span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                        </div>

                    </div>

                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 text-xs font-semibold text-base-content/50 hover:text-base-content hover:bg-base-300/50 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-[0_0_14px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
                            {loading
                                ? <><span className="loading loading-spinner loading-xs"></span>Saving…</>
                                : <><i className="fas fa-save text-[10px]"></i>Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
