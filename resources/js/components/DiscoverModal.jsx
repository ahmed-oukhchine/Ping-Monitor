import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useLang } from '../contexts/LanguageContext';

export default function DiscoverModal({ onClose, onImported }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [subnet, setSubnet] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);

  const startScan = async () => {
    if (!subnet.trim()) return;
    setScanning(true);
    setScanResult(null);
    setSelected(new Set());
    try {
      const { data } = await axios.post('/api/targets/discover', { subnet: subnet.trim() });
      setScanResult(data);
      const alive = data.hosts.filter(h => h.alive && !h.exists);
      if (alive.length > 0) {
        setSelected(new Set(alive.map(h => h.ip)));
      }
      if (data.hosts.length > 100) {
        toast(`Scanning ${data.hosts.length} hosts, this may take a moment...`, 'info');
      }
    } catch (err) {
      toast(err.response?.data?.message || t('discovery.scanFailed'), 'error');
    } finally {
      setScanning(false);
    }
  };

  const toggleHost = (ip) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip); else next.add(ip);
      return next;
    });
  };

  const selectAll = () => {
    const addable = scanResult.hosts.filter(h => h.alive && !h.exists);
    if (addable.every(h => selected.has(h.ip))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(addable.map(h => h.ip)));
    }
  };

  const addSelected = async () => {
    const hosts = scanResult.hosts
      .filter(h => selected.has(h.ip))
      .map(h => ({ ip: h.ip, name: h.hostname || h.ip }));

    if (hosts.length === 0) {
      toast(t('discovery.noSelection'), 'error');
      return;
    }

    setAdding(true);
    try {
      await axios.post('/api/targets/discover/store', { hosts });
      toast(t('discovery.added', { n: hosts.length }), 'success');
      onImported();
    } catch (err) {
      toast(err.response?.data?.message || t('discovery.failed'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const stats = scanResult ? {
    total: scanResult.hosts.length,
    alive: scanResult.hosts.filter(h => h.alive).length,
    exists: scanResult.hosts.filter(h => h.exists).length,
    new: scanResult.hosts.filter(h => h.alive && !h.exists).length,
  } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div className="bg-base-200 border border-base-300 rounded-xl w-full max-w-xl mx-4 shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-base-300/60 flex-shrink-0">
          <div className="w-1 h-5 rounded-full bg-primary/40 flex-shrink-0"></div>
          <h2 className="text-sm font-bold text-base-content flex-1">{t('discovery.title')}</h2>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-[10px] text-base-content/25 hover:text-base-content hover:bg-base-300/50 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <input type="text" value={subnet} onChange={e => setSubnet(e.target.value)}
              placeholder={t('discovery.placeholder')}
              className="flex-1 bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-xs text-base-content outline-none focus:border-primary/60 transition-colors placeholder:text-base-content/20 font-mono"
              onKeyDown={e => e.key === 'Enter' && !scanning && startScan()} />
            <button onClick={startScan} disabled={scanning || !subnet.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-40 flex-shrink-0">
              {scanning ? (
                <><span className="loading loading-spinner loading-xs"></span> {t('discovery.scanning')}</>
              ) : (
                <><i className="fas fa-search text-[10px]"></i> {t('discovery.scan')}</>
              )}
            </button>
          </div>

          {scanResult && (
            <div className="flex items-center gap-3 mb-3 text-[10px] font-medium">
              {[{ label: t('discovery.total'), value: stats.total, cls: 'text-base-content/40' },
                { label: t('discovery.alive'), value: stats.alive, cls: 'text-success' },
                { label: t('discovery.new'), value: stats.new, cls: 'text-primary font-bold' },
                { label: t('discovery.existing'), value: stats.exists, cls: 'text-base-content/30' },
              ].map(s => (
                <span key={s.label} className={`${s.cls}`}>{s.label}: <strong>{s.value}</strong></span>
              ))}
            </div>
          )}

          {scanResult && scanResult.hosts.length > 0 && (
            <div className="border border-base-300 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-base-300/30 border-b border-base-300 text-[10px] font-semibold text-base-content/40 uppercase tracking-wider">
                <input type="checkbox" checked={scanResult.hosts.filter(h => h.alive && !h.exists).length > 0 && scanResult.hosts.filter(h => h.alive && !h.exists).every(h => selected.has(h.ip))}
                  onChange={selectAll} className="checkbox checkbox-xs rounded border-base-content/30" />
                <span className="flex-1">{t('discovery.ipAddress')}</span>
                <span className="w-20 text-center">{t('discovery.status')}</span>
                <span className="w-16 text-right">{t('discovery.latency')}</span>
                <span className="w-28 hidden sm:block">{t('discovery.hostname')}</span>
              </div>
              <div className="max-h-64 overflow-y-auto text-[11px] divide-y divide-base-300/30">
                {scanResult.hosts.map(h => {
                  const canAdd = h.alive && !h.exists;
                  return (
                    <label key={h.ip} className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${selected.has(h.ip) && canAdd ? 'bg-primary/5' : 'hover:bg-base-300/30'} ${h.exists ? 'opacity-40' : ''}`}>
                      <input type="checkbox" checked={selected.has(h.ip)} disabled={!canAdd}
                        onChange={() => toggleHost(h.ip)} className="checkbox checkbox-xs rounded border-base-content/30" />
                      <span className="flex-1 font-mono text-xs">{h.ip}</span>
                      <span className="w-20 text-center">
                        {h.alive
                          ? <span className="inline-flex items-center gap-1 text-success font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-success"></span>{t('discovery.alive')}</span>
                          : <span className="inline-flex items-center gap-1 text-base-content/25"><span className="w-1.5 h-1.5 rounded-full bg-base-300"></span>No resp.</span>
                        }
                      </span>
                      <span className="w-16 text-right text-base-content/40 font-mono tabular-nums">{h.time_ms ? `${h.time_ms} ms` : '—'}</span>
                      <span className="w-28 hidden sm:block truncate text-base-content/40">{h.hostname || '—'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {scanResult && scanResult.hosts.length === 0 && (
            <div className="text-center py-10 text-xs text-base-content/30">
              <i className="fas fa-search text-2xl block mb-2 opacity-30"></i>
              {t('discovery.noHosts')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-base-300/60 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors">
            {t('discovery.cancel')}
          </button>
          <button onClick={addSelected} disabled={adding || selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-40">
            {adding ? (
              <><span className="loading loading-spinner loading-xs"></span> {t('discovery.adding')}</>
            ) : (
              <><i className="fas fa-plus text-[10px]"></i> {t('discovery.addSelected', { n: selected.size })}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
