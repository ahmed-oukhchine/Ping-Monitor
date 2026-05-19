import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const WIDGET_TYPES = [
  { type: 'stats',      labelKey: 'dashboard.stats',        icon: 'fa-chart-bar',    defaultW: 1 },
  { type: 'health',     labelKey: 'dashboard.health',       icon: 'fa-heartbeat',    defaultW: 2 },
  { type: 'targets',    labelKey: 'dashboard.targets',      icon: 'fa-server',       defaultW: 2 },
  { type: 'bandwidth',  labelKey: 'dashboard.bandwidth',    icon: 'fa-chart-area',   defaultW: 2 },
  { type: 'incidents',  labelKey: 'dashboard.incidents',    icon: 'fa-exclamation',  defaultW: 1 },
];

function genId() { return Math.random().toString(36).slice(2, 9); }

function StatsWidget({ t }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    axios.get('/api/targets').then(r => {
      const ts = r.data;
      const online = ts.filter(x => x.last_status === true && !x.is_paused).length;
      const offline = ts.filter(x => x.last_status === false && !x.is_paused).length;
      const paused = ts.filter(x => x.is_paused).length;
      const unknown = ts.length - online - offline - paused;
      setStats({ total: ts.length, online, offline, paused, unknown });
    }).catch(() => {});
  }, []);
  if (!stats) return <div className="flex items-center justify-center h-full text-base-content/20"><span className="loading loading-spinner loading-sm"></span></div>;
  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {[
        { label: t('stats.online'), val: stats.online, cls: 'text-success bg-success/8 border-success/20' },
        { label: t('stats.offline'), val: stats.offline, cls: 'text-error bg-error/8 border-error/20' },
        { label: t('stats.inMaintenance', { n: '' }).replace(/ \d+$/, ''), val: stats.paused, cls: 'text-warning bg-warning/8 border-warning/20' },
        { label: t('dashboard.totalTargets'), val: stats.total, cls: 'text-primary bg-primary/8 border-primary/20' },
      ].map(s => (
        <div key={s.label} className={`flex flex-col items-center justify-center rounded-lg border ${s.cls} p-2`}>
          <span className="text-lg font-black tabular-nums leading-none">{s.val}</span>
          <span className="text-[9px] font-medium mt-0.5 text-center leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function HealthWidget({ t }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    axios.get('/api/targets').then(r => {
      const ts = r.data;
      const online = ts.filter(x => x.last_status === true && !x.is_paused).length;
      const offline = ts.filter(x => x.last_status === false && !x.is_paused).length;
      const paused = ts.filter(x => x.is_paused).length;
      const unknown = ts.length - online - offline - paused;
      setStats({ total: ts.length, online, offline, paused, unknown });
    }).catch(() => {});
  }, []);
  if (!stats) return <div className="flex items-center justify-center h-full text-base-content/20"><span className="loading loading-spinner loading-sm"></span></div>;
  return (
    <div className="flex flex-col justify-center h-full gap-2 px-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-base-300/50 gap-px">
        {stats.online > 0 && <div className="bg-success transition-all" style={{ width: `${(stats.online / stats.total) * 100}%` }}></div>}
        {stats.paused > 0 && <div className="bg-warning transition-all" style={{ width: `${(stats.paused / stats.total) * 100}%` }}></div>}
        {stats.offline > 0 && <div className="bg-error transition-all" style={{ width: `${(stats.offline / stats.total) * 100}%` }}></div>}
        {stats.unknown > 0 && <div className="bg-base-content/20 transition-all" style={{ width: `${(stats.unknown / stats.total) * 100}%` }}></div>}
      </div>
      <div className="flex items-center justify-center gap-3 text-[10px]">
        {stats.online > 0 && <span className="flex items-center gap-1 text-success"><span className="w-1.5 h-1.5 rounded-full bg-success"></span>{stats.online}</span>}
        {stats.paused > 0 && <span className="flex items-center gap-1 text-warning"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span>{stats.paused}</span>}
        {stats.offline > 0 && <span className="flex items-center gap-1 text-error"><span className="w-1.5 h-1.5 rounded-full bg-error"></span>{stats.offline}</span>}
      </div>
    </div>
  );
}

function TargetsWidget({ t }) {
  const [targets, setTargets] = useState([]);
  useEffect(() => {
    axios.get('/api/targets').then(r => setTargets(r.data.slice(0, 8))).catch(() => {});
  }, []);
  return (
    <div className="space-y-1 overflow-y-auto max-h-full">
      {targets.map(t => (
        <div key={t.id} className="flex items-center justify-between px-2 py-1 rounded-md bg-base-100/50 text-[11px]">
          <span className="font-medium truncate mr-2">{t.name}</span>
          <span className={`tabular-nums flex-shrink-0 ${t.last_status === true ? 'text-success' : t.last_status === false ? 'text-error' : 'text-base-content/30'}`}>
            {t.last_response_time != null ? `${t.last_response_time} ms` : '—'}
          </span>
        </div>
      ))}
      {targets.length === 0 && <div className="text-center text-[10px] text-base-content/30 py-4">{t('table.noTargets')}</div>}
    </div>
  );
}

function BandwidthWidget({ t }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    axios.get('/api/targets').then(r => {
      const tgt = r.data.find(x => x.snmp_enabled);
      if (tgt) return axios.get(`/api/snmp/${tgt.id}/bandwidth?range=24h`).then(r2 => setData(r2.data));
    }).catch(() => {});
  }, []);
  if (!data) return <div className="flex items-center justify-center h-full text-[10px] text-base-content/30">{t('chart.noData')}</div>;
  const points = data.points || [];
  const maxIn = Math.max(...points.map(p => p.mbps_in || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-full px-1">
      {points.slice(-60).map((p, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end gap-px" style={{ height: '100%' }}>
          <div className="bg-primary/40 rounded-t" style={{ height: `${((p.mbps_in || 0) / maxIn) * 70}%` }}></div>
          <div className="bg-secondary/40 rounded-t" style={{ height: `${((p.mbps_out || 0) / maxIn) * 40}%` }}></div>
        </div>
      ))}
    </div>
  );
}

function IncidentsWidget({ t }) {
  const [incidents, setIncidents] = useState([]);
  useEffect(() => {
    axios.get('/api/incidents', { params: { per_page: 5 } }).then(r => setIncidents(r.data.data || [])).catch(() => {});
  }, []);
  if (incidents.length === 0) return <div className="flex items-center justify-center h-full text-[10px] text-base-content/30">{t('incidents.noIncidents') || 'No incidents'}</div>;
  return (
    <div className="space-y-1 overflow-y-auto max-h-full">
      {incidents.map(inc => (
        <div key={inc.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-base-100/50 text-[10px]">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inc.resolved_at ? 'bg-success' : 'bg-error'}`}></span>
          <span className="truncate flex-1">{inc.target?.name || '—'}</span>
          <span className="text-base-content/30 flex-shrink-0">{inc.duration ? `${Math.floor(inc.duration / 60)}m` : '—'}</span>
        </div>
      ))}
    </div>
  );
}

const WIDGET_MAP = {
  stats:     StatsWidget,
  health:    HealthWidget,
  targets:   TargetsWidget,
  bandwidth: BandwidthWidget,
  incidents: IncidentsWidget,
};

function Widget({ w, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const { t } = useLang();
  const meta = WIDGET_TYPES.find(x => x.type === w.type);
  const C = WIDGET_MAP[w.type];

  return (
    <div className="bg-base-200/70 border border-base-300/60 rounded-xl p-3 flex flex-col"
      style={{ gridColumn: `span ${w.width || meta?.defaultW || 1}` }}>
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-base-300/40">
        <div className="flex items-center gap-1.5">
          <i className={`fas ${meta?.icon || 'fa-chart-bar'} text-[10px] text-primary/60`}></i>
          <span className="text-[10px] font-semibold text-base-content/50 uppercase tracking-wider">{w.title || t(meta?.labelKey || '')}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst}
            className="w-5 h-5 flex items-center justify-center rounded text-[8px] text-base-content/25 hover:text-base-content hover:bg-base-300/50 disabled:opacity-20 transition-all">
            <i className="fas fa-chevron-up"></i>
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="w-5 h-5 flex items-center justify-center rounded text-[8px] text-base-content/25 hover:text-base-content hover:bg-base-300/50 disabled:opacity-20 transition-all">
            <i className="fas fa-chevron-down"></i>
          </button>
          <button onClick={onEdit}
            className="w-5 h-5 flex items-center justify-center rounded text-[8px] text-base-content/25 hover:text-primary hover:bg-primary/10 transition-all">
            <i className="fas fa-pen"></i>
          </button>
          <button onClick={onDelete}
            className="w-5 h-5 flex items-center justify-center rounded text-[8px] text-base-content/25 hover:text-error hover:bg-error/10 transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <C t={t} />
      </div>
    </div>
  );
}

export default function CustomDashboard() {
  const { t } = useLang();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [dashboards, setDashboards] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [widgetSettings, setWidgetSettings] = useState(null);

  const active = dashboards.find(d => d.id === activeId);
  const widgets = active?.widgets || [];

  const fetchDashboards = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/dashboards');
      setDashboards(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
      else if (data.length === 0) setActiveId(null);
    } catch {} finally { setLoading(false); }
  }, [activeId]);

  useEffect(() => { fetchDashboards(); }, []);

  const persist = async (dashId, newWidgets) => {
    try {
      await axios.put(`/api/dashboards/${dashId}`, { widgets: newWidgets });
    } catch { toast('Failed to save', 'error'); }
  };

  const addWidget = (type) => {
    const meta = WIDGET_TYPES.find(x => x.type === type);
    const newW = { id: genId(), type, title: '', width: meta?.defaultW || 1, settings: {} };
    const next = [...widgets, newW];
    setDashboards(ds => ds.map(d => d.id === activeId ? { ...d, widgets: next } : d));
    persist(activeId, next);
    setShowCreate(false);
  };

  const deleteWidget = (id) => {
    const next = widgets.filter(w => w.id !== id);
    setDashboards(ds => ds.map(d => d.id === activeId ? { ...d, widgets: next } : d));
    persist(activeId, next);
  };

  const moveWidget = (id, dir) => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx === -1) return;
    const next = [...widgets];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDashboards(ds => ds.map(d => d.id === activeId ? { ...d, widgets: next } : d));
    persist(activeId, next);
  };

  const createDashboard = async () => {
    if (!newName.trim()) return;
    try {
      const { data } = await axios.post('/api/dashboards', { name: newName, widgets: [] });
      setDashboards(ds => [...ds, data]);
      setActiveId(data.id);
      setNewName('');
      setShowCreate(false);
      toast('Dashboard created');
    } catch { toast('Failed to create', 'error'); }
  };

  const deleteDashboard = async (d) => {
    if (!window.confirm('Delete this dashboard?')) return;
    try {
      await axios.delete(`/api/dashboards/${d.id}`);
      const next = dashboards.filter(x => x.id !== d.id);
      setDashboards(next);
      if (activeId === d.id) setActiveId(next.length > 0 ? next[0].id : null);
      toast('Dashboard deleted');
    } catch { toast('Failed to delete', 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-base-content/30"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-base-content">{t('dashboard.customTitle') || 'Dashboards'}</h1>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">
                <i className="fas fa-plus text-[8px]"></i> New
              </button>
            </div>
          )}
        </div>

        {dashboards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-base-200 border border-base-300 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-chart-pie text-xl text-base-content/20"></i>
            </div>
            <p className="text-sm font-medium text-base-content/40 mb-1">No dashboards yet</p>
            <p className="text-xs text-base-content/30 mb-4">Create your first custom dashboard</p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">
                Create Dashboard
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
              {dashboards.map(d => (
                <button key={d.id} onClick={() => setActiveId(d.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                    activeId === d.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-base-content/50 border border-transparent hover:bg-base-200 hover:text-base-content'
                  }`}>
                  <i className="fas fa-chart-pie text-[8px]"></i>
                  {d.name}
                </button>
              ))}
              {isAdmin && (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] text-base-content/30 hover:text-primary border border-dashed border-base-300 hover:border-primary/40 transition-all">
                  <i className="fas fa-plus text-[7px]"></i> Add
                </button>
              )}
            </div>

            {active && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-base-content/40">{widgets.length} widget{widgets.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                        <i className="fas fa-plus text-[7px]"></i> Add Widget
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => deleteDashboard(active)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] text-base-content/30 hover:text-error hover:bg-error/10 transition-all">
                        <i className="fas fa-trash text-[7px]"></i>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 auto-rows-[140px]">
                  {widgets.map((w, i) => (
                    <Widget key={w.id} w={w}
                      onEdit={() => setWidgetSettings(w)}
                      onDelete={() => deleteWidget(w.id)}
                      onMoveUp={() => moveWidget(w.id, -1)}
                      onMoveDown={() => moveWidget(w.id, 1)}
                      isFirst={i === 0} isLast={i === widgets.length - 1} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <div className="bg-base-200 border border-base-300 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-sm font-semibold text-base-content mb-3">
                {widgets ? 'Add Widget' : 'New Dashboard'}
              </h2>
              {widgets ? (
                <div className="grid grid-cols-2 gap-2">
                  {WIDGET_TYPES.map(wt => (
                    <button key={wt.type} onClick={() => addWidget(wt.type)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-base-300 bg-base-100 hover:border-primary/40 hover:bg-primary/5 transition-all">
                      <i className={`fas ${wt.icon} text-sm text-primary/60`}></i>
                      <span className="text-[10px] font-medium text-base-content/70 text-center">{t(wt.labelKey)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-base-content/60 mb-1">Name</label>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Network Overview"
                      className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setShowCreate(false); setNewName(''); }}
                      className="px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors">Cancel</button>
                    <button onClick={createDashboard}
                      className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">Create</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {widgetSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setWidgetSettings(null)}>
            <div className="bg-base-200 border border-base-300 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-sm font-semibold text-base-content mb-3">Widget Settings</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-base-content/60 mb-1">Title</label>
                  <input type="text" value={widgetSettings.title || ''}
                    onChange={e => {
                      const next = widgets.map(w => w.id === widgetSettings.id ? { ...w, title: e.target.value } : w);
                      setDashboards(ds => ds.map(d => d.id === activeId ? { ...d, widgets: next } : d));
                      setWidgetSettings({ ...widgetSettings, title: e.target.value });
                    }}
                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-base-content/60 mb-1">Width</label>
                  <select value={widgetSettings.width || 1}
                    onChange={e => {
                      const v = Number(e.target.value);
                      const next = widgets.map(w => w.id === widgetSettings.id ? { ...w, width: v } : w);
                      setDashboards(ds => ds.map(d => d.id === activeId ? { ...d, widgets: next } : d));
                      setWidgetSettings({ ...widgetSettings, width: v });
                    }}
                    className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors">
                    <option value={1}>1 column</option>
                    <option value={2}>2 columns</option>
                    <option value={3}>3 columns (full)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button onClick={() => {
                  persist(activeId, widgets);
                  setWidgetSettings(null);
                }}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">Done</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
