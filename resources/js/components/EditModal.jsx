import React, { useState } from 'react';

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
    const [loading, setLoading]     = useState(false);

    const toggleGroup = (id) => {
        setSelectedGroups(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
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
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
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

                        {/* Alert Settings */}
                        <div className="border border-base-300 rounded-xl overflow-hidden">
                            <button type="button"
                                onClick={() => setAlertEnabled(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-base-300/30 hover:bg-base-300/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-bell text-[11px] text-base-content/40"></i>
                                    <span className="text-xs font-semibold text-base-content/55">Email Alerts</span>
                                    <span className="text-base-content/30 text-xs font-normal">optional</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {alertEnabled && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">ON</span>
                                    )}
                                    <i className={`fas fa-chevron-${alertEnabled ? 'up' : 'down'} text-[9px] text-base-content/30`}></i>
                                </div>
                            </button>
                            {alertEnabled && (
                                <div className="px-4 py-3 flex flex-col gap-3 border-t border-base-300">
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
                            )}
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
