import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  ReactFlow, Handle, Position, useNodesState, useEdgesState,
  Background, Controls, MiniMap, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const GROUP_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316','#6366f1','#14b8a6','#e11d48'];

class SidebarBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="w-80 ml-3 bg-base-200 border border-base-300 rounded-xl p-4 flex items-center justify-center text-[10px] text-base-content/30">Could not load details</div>;
    }
    return this.props.children;
  }
}

const TargetNode = React.memo(({ data }) => {
  const statusColor = data.isPaused ? 'warning'
    : data.lastStatus === true ? 'success'
    : data.lastStatus === false ? 'error' : 'ghost';
  const dimmed = data.dimmed;
  const showIncident = data.lastStatus === false && !data.isPaused;

  return (
    <div className={`relative px-3 py-2 rounded-xl border-2 shadow-lg bg-base-100 min-w-[130px] transition-all hover:shadow-xl ${
      data.selected ? 'ring-2 ring-primary shadow-xl scale-105'
      : data.monitored ? 'ring-2 ring-secondary/60'
      : ''
    } ${
      statusColor === 'success' ? 'border-success/40'
      : statusColor === 'error' ? 'border-error/40'
      : statusColor === 'warning' ? 'border-warning/40'
      : 'border-base-300'
    } ${dimmed ? 'opacity-30' : ''}`}>
      {data.groupColor && (
        <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full" style={{ backgroundColor: data.groupColor }} />
      )}
      {showIncident && (
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-error flex items-center justify-center shadow-lg">
          <span className="absolute inline-flex h-full w-full rounded-full bg-error animate-ping opacity-60"></span>
          <span className="relative w-1.5 h-1.5 rounded-full bg-white"></span>
        </span>
      )}
      <Handle type="target" position={Position.Left}
        className="w-2.5 h-2.5 border-2 border-base-100 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
          statusColor === 'success' ? 'bg-success'
          : statusColor === 'error' ? 'bg-error'
          : statusColor === 'warning' ? 'bg-warning'
          : 'bg-base-300'
        } ${data.monitored ? 'ring-2 ring-secondary ring-offset-1 ring-offset-base-100' : ''}`}></span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-base-content leading-tight truncate">{data.label}</div>
          <div className="text-[9px] text-base-content/40 font-mono">{data.ip}</div>
          {data.lastResponseTime != null && (
            <div className="text-[8px] font-mono text-base-content/25 mt-0.5">{data.lastResponseTime}ms</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="w-2.5 h-2.5 border-2 border-base-100 !bg-primary" />
    </div>
  );
});

const nodeTypes = { targetNode: TargetNode };

/* ── layout algorithms ── */
function ipToNumber(ip) {
  const parts = ip?.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!parts) return null;
  return ((+parts[1]*256 + +parts[2])*256 + +parts[3])*256 + +parts[4];
}

function forceDirectedLayout(nodes, edges, centerX, centerY, iterations = 80) {
  const pos = nodes.map(n => ({ x: n.position.x, y: n.position.y }));
  const nodeIds = nodes.map(n => n.id);
  const adj = new Map();
  edges.forEach(e => {
    const si = nodeIds.indexOf(e.source);
    const ti = nodeIds.indexOf(e.target);
    if (si !== -1 && ti !== -1) {
      if (!adj.has(si)) adj.set(si, new Set());
      if (!adj.has(ti)) adj.set(ti, new Set());
      adj.get(si).add(ti);
      adj.get(ti).add(si);
    }
  });

  const k = 200;
  for (let iter = 0; iter < iterations; iter++) {
    const forces = pos.map(() => ({ x: 0, y: 0 }));
    const repulsion = 8000;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let f = repulsion / (dist * dist);
        forces[i].x -= f * (dx / dist);
        forces[i].y -= f * (dy / dist);
        forces[j].x += f * (dx / dist);
        forces[j].y += f * (dy / dist);
      }
    }
    adj.forEach((neighbors, i) => {
      neighbors.forEach(j => {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let f = (dist - k) * 0.01;
        forces[i].x += f * (dx / dist);
        forces[i].y += f * (dy / dist);
        forces[j].x -= f * (dx / dist);
        forces[j].y -= f * (dy / dist);
      });
    });
    const cooling = 1 - iter / iterations;
    pos.forEach((p, i) => {
      p.x += forces[i].x * cooling;
      p.y += forces[i].y * cooling;
    });
  }
  const cx = pos.reduce((s, p) => s + p.x, 0) / pos.length;
  const cy = pos.reduce((s, p) => s + p.y, 0) / pos.length;
  const ox = centerX - cx;
  const oy = centerY - cy;
  return pos.map(p => ({ x: p.x + ox, y: p.y + oy }));
}

export default function Topology() {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const flowRef = useRef(null);
  const rfInstance = useRef(null);

  const [topologyData, setTopologyData] = useState({ targets: [], connections: [] });
  const topologyRef = useRef(topologyData);
  topologyRef.current = topologyData;
  const [loading, setLoading] = useState(true);
  const [connectingLabel, setConnectingLabel] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [layoutLocked, setLayoutLocked] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [edgeTooltip, setEdgeTooltip] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [editEdgeLabel, setEditEdgeLabel] = useState('');
  const [layoutType, setLayoutType] = useState('force');
  const [hiddenTargets, setHiddenTargets] = useState(new Set());
  const [hiddenGroupIds, setHiddenGroupIds] = useState(new Set());
  const [showTargetFilter, setShowTargetFilter] = useState(false);
  const [selectedInMonitoring, setSelectedInMonitoring] = useState(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('topology_selected');
    if (saved) setSelectedInMonitoring(new Set(JSON.parse(saved)));
    const interval = setInterval(() => {
      const saved = localStorage.getItem('topology_selected');
      if (saved) setSelectedInMonitoring(new Set(JSON.parse(saved)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const groupColorMap = useMemo(() => {
    const seen = {};
    topologyData.targets.forEach(t => (t.groups || []).forEach(g => { if (!seen[g.id]) seen[g.id] = g; }));
    return Object.values(seen).reduce((m, g, i) => { m[g.id] = GROUP_COLORS[i % GROUP_COLORS.length]; return m; }, {});
  }, [topologyData.targets]);

  const groupLegend = useMemo(() => {
    const seen = {};
    topologyData.targets.forEach(t => (t.groups || []).forEach(g => { if (!seen[g.id]) seen[g.id] = g; }));
    return Object.values(seen).map(g => ({ id: g.id, name: g.name, color: groupColorMap[g.id] }));
  }, [topologyData.targets, groupColorMap]);

  const toggleGroup = (id) => {
    setHiddenGroupIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const filteredTargets = useMemo(() =>
    topologyData.targets.filter(t => !hiddenTargets.has(t.id) && !(t.groups || []).some(g => hiddenGroupIds.has(g.id))),
  [topologyData.targets, hiddenTargets, hiddenGroupIds]);

  const initialNodes = useMemo(() => filteredTargets.map(tgt => {
    const group = (tgt.groups || [])[0];
    return {
      id: `target-${tgt.id}`,
      type: 'targetNode',
      position: { x: tgt.topology_x ?? 50 + (tgt.id % 5) * 180, y: tgt.topology_y ?? 50 + Math.floor(tgt.id / 5) * 120 },
      data: {
        label: tgt.name, ip: tgt.ip_address,
        location: tgt.location, notes: tgt.notes,
        lastStatus: tgt.last_status, isPaused: tgt.is_paused,
        lastResponseTime: tgt.last_response_time, lastPingAt: tgt.last_ping_at,
        warnMs: tgt.warn_ms, criticalMs: tgt.critical_ms,
        snmpEnabled: tgt.snmp_enabled,
        uptimePercent: tgt.uptime_percent,
        groups: tgt.groups || [],
        targetId: tgt.id, dimmed: false, selected: false, monitored: selectedInMonitoring.has(tgt.id),
        groupColor: group ? groupColorMap[group.id] : null,
      },
      draggable: !layoutLocked,
    };
  }), [filteredTargets, groupColorMap, layoutLocked, selectedInMonitoring]);

  const initialEdges = useMemo(() => topologyData.connections
    .filter(conn => !hiddenTargets.has(conn.source_target_id) && !hiddenTargets.has(conn.destination_target_id))
    .map(conn => {
      const sourceTgt = topologyData.targets.find(t => t.id === conn.source_target_id);
      const destTgt = topologyData.targets.find(t => t.id === conn.destination_target_id);
      const bothOnline = sourceTgt?.last_status === true && destTgt?.last_status === true;
      const anyOffline = sourceTgt?.last_status === false || destTgt?.last_status === false;
      return {
        id: `conn-${conn.id}`,
        source: `target-${conn.source_target_id}`,
        target: `target-${conn.destination_target_id}`,
        label: conn.label || '',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: bothOnline ? '#22c55e' : anyOffline ? '#ef4444' : '#6b7280' },
        style: {
          stroke: bothOnline ? '#22c55e' : anyOffline ? '#ef4444' : '#6b7280',
          strokeWidth: bothOnline ? 2.5 : 2,
          strokeDasharray: anyOffline ? '5 3' : 'none',
        },
        labelStyle: { fontSize: 9, fontWeight: 600, color: '#6b7280', background: 'transparent' },
        labelBgStyle: { fill: 'transparent' },
        data: { connId: conn.id, label: conn.label || '' },
      };
    }),
  [topologyData, hiddenTargets]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges]);

  /* ── search dimming ── */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, dimmed: false } })));
      return;
    }
    const q = searchQuery.toLowerCase();
    setNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        dimmed: !n.data.label.toLowerCase().includes(q) && !n.data.ip.toLowerCase().includes(q),
      },
    })));
  }, [searchQuery, setNodes]);

  /* ── selected highlight ── */
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, selected: n.data.targetId === selectedNodeData?.id },
    })));
  }, [selectedNodeData, setNodes]);

  /* ── data fetching ── */
  const fetchTopology = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/topology');
      setTopologyData(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTopology(); }, []);
  useEffect(() => {
    const interval = setInterval(() => fetchTopology(), 10000);
    const onVisible = () => { if (!document.hidden) fetchTopology(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  /* ── connection handlers ── */
  const onConnect = useCallback((params) => {
    setPendingConnection(params);
    setConnectingLabel('');
    setShowLabelModal(true);
  }, []);

  const confirmConnection = async () => {
    if (!pendingConnection) return;
    const sourceId = parseInt(pendingConnection.source.replace('target-', ''));
    const targetId = parseInt(pendingConnection.target.replace('target-', ''));
    try {
      await axios.post('/api/topology', {
        source_target_id: sourceId,
        destination_target_id: targetId,
        label: connectingLabel || null,
      });
      setShowLabelModal(false);
      setPendingConnection(null);
      fetchTopology();
    } catch (err) {
      setShowLabelModal(false);
      setPendingConnection(null);
      toast(err.response?.status === 409 ? 'Connection already exists' : 'Failed to create connection', 'error');
    }
  };

  const saveEdgeLabel = async () => {
    if (!editingEdge) return;
    try {
      await axios.put(`/api/topology/${editingEdge}`, { label: editEdgeLabel || null });
      setEditingEdge(null);
      fetchTopology();
      toast('Label updated');
    } catch { toast('Failed to update label', 'error'); }
  };

  const confirmDeleteConnection = async () => {
    try {
      await axios.delete(`/api/topology/${pendingDeleteId}`);
      setPendingDeleteId(null);
      fetchTopology();
    } catch {}
  };

  const onNodeDragStop = useCallback(async (_event, node) => {
    const targetId = parseInt(node.id.replace('target-', ''));
    const threshold = 60;
    const near = nodes.find(n => {
      if (n.id === node.id) return false;
      const dx = n.position.x - node.position.x;
      const dy = n.position.y - node.position.y;
      return Math.sqrt(dx * dx + dy * dy) < threshold;
    });
    if (near && isAdmin) {
      const nearId = parseInt(near.id.replace('target-', ''));
      const exists = topologyData.connections.some(c =>
        (c.source_target_id === targetId && c.destination_target_id === nearId) ||
        (c.source_target_id === nearId && c.destination_target_id === targetId)
      );
      if (!exists) {
        setPendingConnection({ source: node.id, target: near.id });
        setConnectingLabel('');
        setShowLabelModal(true);
      } else {
        toast('Connection already exists', 'error');
      }
    }
    try {
      await axios.post('/api/topology/positions', {
        positions: [{ id: targetId, topology_x: Math.round(node.position.x), topology_y: Math.round(node.position.y) }],
      });
      setTopologyData(prev => ({
        ...prev,
        targets: prev.targets.map(t =>
          t.id === targetId
            ? { ...t, topology_x: Math.round(node.position.x), topology_y: Math.round(node.position.y) }
            : t
        ),
      }));
    } catch {}
  }, [nodes, isAdmin, topologyData.connections]);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    if (edge.data?.connId && isAdmin) {
      setPendingDeleteId(edge.data.connId);
    }
  }, [isAdmin]);

  const onEdgeDoubleClick = useCallback((event, edge) => {
    event.stopPropagation();
    if (!isAdmin || !edge.data?.connId) return;
    setEditingEdge(edge.data.connId);
    setEditEdgeLabel(edge.data?.label || '');
  }, [isAdmin]);

  /* ── edge tooltip ── */
  const onEdgeMouseEnter = useCallback((event, edge) => {
    const sourceTgt = topologyData.targets.find(t => t.id === parseInt(edge.source.replace('target-', '')));
    const destTgt = topologyData.targets.find(t => t.id === parseInt(edge.target.replace('target-', '')));
    setEdgeTooltip({ x: event.clientX, y: event.clientY, label: edge.data?.label || '', source: sourceTgt?.name || '', dest: destTgt?.name || '' });
  }, [topologyData.targets]);
  const onEdgeMouseLeave = useCallback(() => setEdgeTooltip(null), []);

  /* ── context menu ── */
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  const loadNodeDetails = async (targetId, targetName) => {
    const target = topologyRef.current.targets.find(t => t.id === targetId);
    setSelectedNodeData({ id: targetId, name: targetName, loading: true, target });
    try {
      const { data: points } = await axios.get(`/api/targets/${targetId}/chart-data?range=24h`);
      const valid = points.filter(p => p.response_time != null);
      const avg = valid.length ? (valid.reduce((s, p) => s + p.response_time, 0) / valid.length).toFixed(0) : null;
      const min = valid.length ? Math.min(...valid.map(p => p.response_time)).toFixed(0) : null;
      const max = valid.length ? Math.max(...valid.map(p => p.response_time)).toFixed(0) : null;
      const loss = points.length ? ((points.filter(p => !p.is_success).length / points.length) * 100).toFixed(1) : null;
      const data = { id: targetId, name: targetName, target, loading: false, points, stats: { avg, min, max, loss: loss ? `${loss}%` : null } };

      const depsResp = axios.get(`/api/targets/${targetId}/dependencies`).catch(() => null);
      const incResp = axios.get('/api/incidents', { params: { target_id: targetId, per_page: 5 } }).catch(() => null);
      const ifaceResp = target?.snmp_enabled ? axios.get(`/api/snmp/${targetId}/interfaces`).catch(() => null) : null;
      const bwResp = target?.snmp_enabled ? axios.get(`/api/snmp/${targetId}/bandwidth`, { params: { range: '24h' } }).catch(() => null) : null;

      const [deps, inc, ifaces, bw] = await Promise.all([depsResp, incResp, ifaceResp, bwResp].filter(Boolean));
      data.dependencies = deps?.data || [];
      data.recentIncidents = inc?.data?.data || [];
      if (ifaces) data.interfaces = ifaces.data;
      if (bw) data.bandwidth = bw.data;
      setSelectedNodeData(data);
    } catch { setSelectedNodeData({ id: targetId, name: targetName, target, loading: false }); }
  };

  const contextMenuAction = async (action) => {
    if (!contextMenu) return;
    const targetId = contextMenu.node.data.targetId;
    const targetName = contextMenu.node.data.label;
    closeContextMenu();
    if (action === 'details') {
      loadNodeDetails(targetId, targetName);
      return;
    }
    try {
      if (action === 'ping') {
        const { data } = await axios.post(`/targets/${targetId}/ping`);
        toast(`${targetName} responded (${data.response_time} ms)`, 'success');
      } else if (action === 'pause') {
        await axios.post(`/targets/${targetId}/pause`);
        toast(`${targetName} paused`, 'success');
        fetchTopology();
      } else if (action === 'resume') {
        await axios.post(`/targets/${targetId}/resume`);
        toast(`${targetName} resumed`, 'success');
        fetchTopology();
      }
    } catch {
      toast('Action failed', 'error');
    }
  };

  /* ── node click → sidebar ── */
  const onNodeClick = (_event, node) => {
    if (selectedNodeData?.id === node.data.targetId) return;
    loadNodeDetails(node.data.targetId, node.data.label);
  };

  /* ── layout ── */
  const applyForceLayout = () => {
    const w = flowRef.current?.getBounds?.()?.width || 800;
    const h = flowRef.current?.getBounds?.()?.height || 600;
    const positions = forceDirectedLayout(initialNodes, initialEdges, w / 2, h / 2);
    const updates = initialNodes.map((n, i) => ({ id: n.data.targetId, x: Math.round(positions[i].x), y: Math.round(positions[i].y) }));
    setNodes(nds => nds.map((n, i) => ({ ...n, position: { x: positions[i].x, y: positions[i].y } })));
    axios.post('/api/topology/positions', { positions: updates.map(u => ({ id: u.id, topology_x: u.x, topology_y: u.y })) }).catch(() => {});
    toast('Force-directed layout applied');
  };

  const applyGeographicLayout = () => {
    const w = flowRef.current?.getBounds?.()?.width || 800;
    const h = flowRef.current?.getBounds?.()?.height || 600;
    const withIp = initialNodes.map(n => ({ node: n, ip: ipToNumber(topologyData.targets.find(t => t.id === n.data.targetId)?.ip_address) }));
    const sorted = [...withIp].sort((a, b) => (a.ip ?? Infinity) - (b.ip ?? Infinity));
    const n = sorted.length;
    const cols = Math.ceil(Math.sqrt(n)) || 1;
    const gapX = Math.min(220, (w - 80) / cols);
    const gapY = Math.min(130, (h - 80) / Math.ceil(n / cols));
    const positions = {};
    sorted.forEach(({ node, ip }, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[node.data.targetId] = { x: Math.round(40 + col * gapX), y: Math.round(40 + row * gapY) };
    });
    setNodes(nds => nds.map(n => ({ ...n, position: positions[n.data.targetId] || n.position })));
    const updates = Object.entries(positions).map(([id, p]) => ({ id: Number(id), topology_x: p.x, topology_y: p.y }));
    axios.post('/api/topology/positions', { positions: updates }).catch(() => {});
    toast('Geographic layout applied');
  };

  /* ── export ── */
  const exportPng = async () => {
    const el = flowRef.current?.querySelector('.react-flow__renderer');
    if (!el) return toast('Nothing to export', 'error');
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#1e293b', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `topology-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast('Topology exported as PNG');
    } catch {
      toast('Export failed', 'error');
    }
  };

  /* ── target visibility toggle ── */
  const toggleTarget = (id) => {
    setHiddenTargets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* ── sidebar ── */
  const closeSidebar = () => setSelectedNodeData(null);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col" onClick={closeContextMenu}>
      {/* ── toolbar ── */}
      <div className="flex items-center justify-between px-6 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-4">
          <div className="w-0.5 h-5 rounded-full bg-primary/50 flex-shrink-0"></div>
          <h1 className="text-base font-bold text-base-content">{t('topology.title')}</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-base-content/25"></i>
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Filter nodes…"
                className="w-40 bg-base-200 border border-base-300 rounded-lg pl-7 pr-3 py-1.5 text-xs text-base-content outline-none focus:border-primary/40 transition-colors placeholder:text-base-content/20" />
            </div>
            <button onClick={() => setShowTargetFilter(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showTargetFilter ? 'bg-primary/10 border-primary/30 text-primary' : 'border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200'
              }`}>
              <i className="fas fa-eye text-[10px]"></i>
              {topologyData.targets.length - hiddenTargets.size}/{topologyData.targets.length}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={layoutType} onChange={e => {
            const v = e.target.value;
            setLayoutType(v);
            requestAnimationFrame(() => {
              if (v === 'force') applyForceLayout();
              else if (v === 'geographic') applyGeographicLayout();
              requestAnimationFrame(() => { rfInstance.current?.fitView({ duration: 200 }); });
            });
          }}
            className="bg-base-200 border border-base-300 rounded-lg px-3 py-1.5 text-xs text-base-content outline-none focus:border-primary/40 transition-colors cursor-pointer">
            <option value="force">Force-directed</option>
            <option value="geographic">Geographic</option>
          </select>
          <div className="w-px h-5 bg-base-300 mx-1"></div>
          <button onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-all">
            <i className="fas fa-download text-[10px]"></i> Export
          </button>
          <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-all">
            <i className="fas fa-expand text-[10px]"></i> Fullscreen
          </button>
          <div className="w-px h-5 bg-base-300 mx-1"></div>
          <button onClick={() => setLayoutLocked(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              layoutLocked ? 'bg-warning/10 border-warning/30 text-warning' : 'border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200'
            }`}>
            <i className={`fas ${layoutLocked ? 'fa-lock' : 'fa-lock-open'} text-[10px]`}></i>
            {layoutLocked ? 'Locked' : 'Unlocked'}
          </button>
          <span className="text-base-content/20 mx-1">|</span>
          <span className="text-xs text-base-content/30 whitespace-nowrap">Drag nodes to reposition</span>
        </div>
      </div>

      {/* ── target filter dropdown ── */}
      {showTargetFilter && (
        <div className="relative z-10">
          <div className="absolute left-6 top-0 bg-base-200 border border-base-300 rounded-xl p-3 shadow-xl w-56 max-h-64 overflow-y-auto">
            <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-2">Toggle Targets</div>
            {topologyData.targets.map(t => (
              <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-base-300/50 cursor-pointer text-[11px]">
                <input type="checkbox" checked={!hiddenTargets.has(t.id)} onChange={() => toggleTarget(t.id)}
                  className="checkbox checkbox-xs checkbox-primary" />
                <span className={`flex-1 truncate ${hiddenTargets.has(t.id) ? 'line-through text-base-content/30' : 'text-base-content'}`}>{t.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${t.last_status === true ? 'bg-success' : t.last_status === false ? 'bg-error' : 'bg-base-300'}`}></span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── group legend ── */}
        {groupLegend.length > 1 && (
          <div className="flex items-center gap-3 px-6 py-1.5 flex-shrink-0">
            <span className="text-[9px] font-semibold text-base-content/30 uppercase tracking-wider">Groups</span>
            {groupLegend.map(g => {
              const hidden = hiddenGroupIds.has(g.id);
              return (
                <button key={g.name} onClick={() => toggleGroup(g.id)}
                  className={`flex items-center gap-1.5 text-[10px] transition-all px-1.5 py-0.5 rounded-md ${
                    hidden ? 'text-base-content/20 line-through' : 'text-base-content/50 hover:bg-base-300/40'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${hidden ? 'opacity-30' : ''}`} style={{ backgroundColor: g.color }}></span>
                  {g.name}
                </button>
              );
            })}
          </div>
        )}

      {/* ── main area ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-base-content/30">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="flex-1 flex gap-0 mx-4 mb-4 min-h-0">
          <div ref={flowRef} className="flex-1 rounded-xl border border-base-300 overflow-hidden bg-base-200/50">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onInit={instance => { rfInstance.current = instance; }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={isAdmin ? onConnect : undefined}
              onNodeDragStop={onNodeDragStop}
              onEdgeClick={onEdgeClick}
              onEdgeDoubleClick={onEdgeDoubleClick}
              onEdgeMouseEnter={onEdgeMouseEnter}
              onEdgeMouseLeave={onEdgeMouseLeave}
              onNodeContextMenu={onNodeContextMenu}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              panOnScroll
              selectionOnDrag
              panOnDrag={[1, 2]}
              selectNodesOnDrag={false}
              nodesDraggable={!layoutLocked}
              nodesConnectable={isAdmin && !layoutLocked}
            >
              <Background color="#94a3b8" gap={20} size={0.5} />
              <Controls showInteractive={false} className="!bg-base-100 !border-base-300 !rounded-lg !shadow-md !text-base-content/60" />
              <MiniMap
                nodeColor={(n) => {
                  const d = n.data;
                  if (d?.isPaused) return '#f59e0b';
                  if (d?.lastStatus === true) return '#22c55e';
                  if (d?.lastStatus === false) return '#ef4444';
                  return '#d1d5db';
                }}
                maskColor="rgba(0,0,0,0.1)"
                className="!bg-base-100 !border !border-base-300 !rounded-lg !shadow-md"
              />
            </ReactFlow>
          </div>

          {/* ── detail sidebar ── */}
          {selectedNodeData && (
            <SidebarBoundary>
            <div className="w-80 ml-3 bg-base-200 border border-base-300 rounded-xl overflow-y-auto flex-shrink-0">
              <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300/60 px-4 py-2.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-base-content truncate mr-2">{selectedNodeData.name}</h3>
                <button onClick={closeSidebar}
                  className="w-5 h-5 flex items-center justify-center rounded text-[9px] text-base-content/25 hover:text-base-content hover:bg-base-300/50 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              {selectedNodeData.loading ? (
                <div className="flex items-center justify-center py-12 text-[10px] text-base-content/30">
                  <span className="loading loading-spinner loading-sm mr-2"></span> Loading…
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* ── Status + IP ── */}
                  {(() => {
                    const tgt = selectedNodeData.target;
                    const status = tgt?.is_paused ? 'paused' : tgt?.last_status === true ? 'online' : tgt?.last_status === false ? 'offline' : 'unknown';
                    const statusColors = { online: 'bg-success text-success-content', offline: 'bg-error text-error-content', paused: 'bg-warning text-warning-content', unknown: 'bg-base-300 text-base-content/50' };
                    const statusLabels = { online: 'Online', offline: 'Offline', paused: 'Paused', unknown: 'Unknown' };
                    return (
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusColors[status]}`}>{statusLabels[status]}</span>
                        <span className="text-xs font-mono text-base-content/50">{tgt?.ip_address || '—'}</span>
                      </div>
                    );
                  })()}
                  {selectedNodeData.target?.location && (
                    <div className="text-[10px] text-base-content/40 flex items-center gap-1.5">
                      <i className="fas fa-map-marker-alt text-[9px]"></i> {selectedNodeData.target.location}
                    </div>
                  )}

                  {/* ── Stats row ── */}
                  {selectedNodeData.stats && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Uptime', value: selectedNodeData.target?.uptime_percent != null ? `${selectedNodeData.target.uptime_percent}%` : '—', cls: 'text-base-content' },
                        { label: 'Avg', value: selectedNodeData.stats.avg ? `${selectedNodeData.stats.avg}ms` : '—', cls: 'text-primary' },
                        { label: 'Loss', value: selectedNodeData.stats.loss || '—', cls: 'text-warning' },
                        { label: 'Last', value: selectedNodeData.target?.last_response_time != null ? `${selectedNodeData.target.last_response_time}ms` : '—', cls: 'text-base-content/60' },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <div className="text-[9px] text-base-content/40 font-medium">{s.label}</div>
                          <div className={`text-xs font-black tabular-nums ${s.cls}`}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Quick actions ── */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={async () => { closeSidebar(); try { const { data } = await axios.post(`/targets/${selectedNodeData.id}/ping`); toast(`${selectedNodeData.name} responded (${data.response_time}ms)`, 'success'); } catch {} }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                      <i className="fas fa-bolt text-[9px]"></i> Ping
                    </button>
                    {selectedNodeData.target?.is_paused ? (
                      <button onClick={async () => { try { await axios.post(`/targets/${selectedNodeData.id}/resume`); toast('Resumed', 'success'); fetchTopology(); } catch {} }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-success/10 text-success hover:bg-success/20 transition-all">
                        <i className="fas fa-play text-[9px]"></i> Resume
                      </button>
                    ) : (
                      <button onClick={async () => { try { await axios.post(`/targets/${selectedNodeData.id}/pause`); toast('Paused', 'success'); fetchTopology(); } catch {} }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-warning/10 text-warning hover:bg-warning/20 transition-all">
                        <i className="fas fa-pause text-[9px]"></i> Pause
                      </button>
                    )}
                    <button onClick={() => window.location.href = '/monitoring'}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-base-300/50 text-base-content/50 hover:text-base-content hover:bg-base-300 transition-all">
                      <i className="fas fa-external-link-alt text-[9px]"></i> Open
                    </button>
                  </div>

                  {/* ── Groups ── */}
                  {selectedNodeData.target?.groups?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedNodeData.target.groups.map(g => (
                        <span key={g.id} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-base-300/70 text-base-content/60">{g.name}</span>
                      ))}
                    </div>
                  )}

                  {/* ── Connections ── */}
                  {(() => {
                    const conns = topologyData.connections.filter(c => c.source_target_id === selectedNodeData.id || c.destination_target_id === selectedNodeData.id);
                    if (!conns.length) return null;
                    return (
                      <div>
                        <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1.5">Connections</div>
                        <div className="space-y-0.5">
                          {conns.map(c => {
                            const isOut = c.source_target_id === selectedNodeData.id;
                            const other = topologyData.targets.find(t => t.id === (isOut ? c.destination_target_id : c.source_target_id));
                            return (
                              <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-base-content/60">
                                <span className="text-[9px]">{isOut ? '→' : '←'}</span>
                                <span className="truncate">{other?.name || '?'}</span>
                                {c.label && <span className="text-[8px] text-base-content/30 ml-auto">({c.label})</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Dependencies ── */}
                  {selectedNodeData.dependencies?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1.5">Depends On</div>
                      <div className="space-y-0.5">
                        {selectedNodeData.dependencies.map(d => (
                          <div key={d.id} className="flex items-center gap-1.5 text-[10px] text-base-content/60">
                            <i className="fas fa-link text-[8px] text-base-content/30"></i>
                            <span className="truncate">{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Notes ── */}
                  {selectedNodeData.target?.notes && (
                    <div>
                      <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1">Notes</div>
                      <p className="text-[10px] text-base-content/50 leading-relaxed">{selectedNodeData.target.notes}</p>
                    </div>
                  )}

                  {/* ── Latency chart + thresholds ── */}
                  {selectedNodeData.points?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1.5">Latency (24h)</div>
                      <div className="relative">
                        {/* threshold lines */}
                        {(() => {
                          const warn = selectedNodeData.target?.warn_ms;
                          const crit = selectedNodeData.target?.critical_ms;
                          const maxVal = Math.max(...selectedNodeData.points.map(x => x.response_time || 0), crit || 1);
                          if (warn || crit) {
                            const h = 64;
                            return (
                              <div className="absolute inset-0 pointer-events-none" style={{ height: h }}>
                                {warn && <div className="absolute left-0 right-0 border-t border-dashed border-warning/40" style={{ bottom: `${(warn / maxVal) * 100}%` }}>
                                  <span className="absolute -top-3 right-0 text-[7px] text-warning/50">{warn}ms</span>
                                </div>}
                                {crit && <div className="absolute left-0 right-0 border-t border-dashed border-error/40" style={{ bottom: `${(crit / maxVal) * 100}%` }}>
                                  <span className="absolute -top-3 right-0 text-[7px] text-error/50">{crit}ms (crit)</span>
                                </div>}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-end gap-px h-16">
                          {selectedNodeData.points.slice(-60).map((p, i) => {
                            const max = Math.max(...selectedNodeData.points.map(x => x.response_time || 0), 1);
                            const h = Math.min(100, ((p.response_time || 0) / max) * 100);
                            return <div key={i} className={`flex-1 rounded-t ${p.is_success ? 'bg-primary/30' : 'bg-error/40'}`}
                              style={{ height: `${h}%` }}></div>;
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── SNMP + Bandwidth ── */}
                  {selectedNodeData.interfaces?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1.5">
                        SNMP ({selectedNodeData.interfaces.length} interfaces)
                      </div>
                      <div className="space-y-1">
                        {selectedNodeData.interfaces.slice(0, 4).map(iface => (
                          <div key={iface.id} className="flex items-center justify-between text-[9px] px-2 py-1 rounded bg-base-100/50">
                            <span className="font-medium text-base-content/60 truncate mr-2">{iface.name || iface.description}</span>
                            <span className={`tabular-nums ${iface.is_up ? 'text-success' : 'text-error'}`}>{iface.is_up ? 'UP' : 'DOWN'}</span>
                          </div>
                        ))}
                        {selectedNodeData.interfaces.length > 4 && (
                          <div className="text-[8px] text-base-content/30 text-center">+{selectedNodeData.interfaces.length - 4} more</div>
                        )}
                      </div>
                      {selectedNodeData.bandwidth?.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1">Bandwidth</div>
                          <div className="flex items-end gap-px h-10">
                            {selectedNodeData.bandwidth.slice(-40).map((b, i) => {
                              const max = Math.max(...selectedNodeData.bandwidth.map(x => Math.max(x.in_octets || 0, x.out_octets || 0)), 1);
                              const hIn = ((b.in_octets || 0) / max) * 100;
                              const hOut = ((b.out_octets || 0) / max) * 100;
                              return (
                                <div key={i} className="flex-1 flex flex-col-reverse gap-px">
                                  <div className="rounded-t bg-primary/30" style={{ height: `${Math.min(100, hIn)}%` }}></div>
                                  <div className="rounded-t bg-secondary/30" style={{ height: `${Math.min(100, hOut)}%` }}></div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[8px] text-primary/50"><span className="w-1.5 h-1.5 rounded-sm bg-primary/30"></span> In</span>
                            <span className="flex items-center gap-1 text-[8px] text-secondary/50"><span className="w-1.5 h-1.5 rounded-sm bg-secondary/30"></span> Out</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Last ping time ── */}
                  {selectedNodeData.target?.last_ping_at && (
                    <div className="text-[8px] text-base-content/20 text-center">
                      Last ping: {new Date(selectedNodeData.target.last_ping_at).toLocaleString()}
                    </div>
                  )}

                  {/* ── Recent Incidents ── */}
                  {selectedNodeData.recentIncidents?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1.5">Recent Incidents</div>
                      <div className="space-y-1">
                        {selectedNodeData.recentIncidents.map((inc, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-md bg-base-100/50 text-[10px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${!inc.ongoing ? 'bg-success' : 'bg-error'}`}></span>
                            <span className="text-base-content/40">{inc.duration_sec ? `${Math.floor(inc.duration_sec / 60)}m` : '—'}</span>
                            <span className="text-base-content/30 text-[8px]">{new Date(inc.started_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </SidebarBoundary>
          )}
        </div>
      )}

      {/* ── context menu ── */}
      {contextMenu && (
        <div className="fixed z-50" style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}>
          <div className="bg-base-200 border border-base-300 rounded-xl shadow-2xl py-1 min-w-[140px] overflow-hidden">
            <div className="px-3 py-1.5 text-[9px] font-semibold text-base-content/40 border-b border-base-300/60 truncate">{contextMenu.node.data.label}</div>
            {[
              { action: 'ping', icon: 'fa-bolt', label: 'Ping', color: 'text-primary' },
              { action: 'details', icon: 'fa-chart-line', label: 'Details', color: 'text-base-content' },
              { action: 'pause', icon: 'fa-pause', label: 'Pause', color: 'text-warning' },
              { action: 'resume', icon: 'fa-play', label: 'Resume', color: 'text-success' },
            ].map(item => (
              <button key={item.action} onClick={() => contextMenuAction(item.action)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium ${item.color} hover:bg-base-300/70 transition-colors text-left`}>
                <i className={`fas ${item.icon} text-[10px] w-3 text-center`}></i>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── edge tooltip ── */}
      {edgeTooltip && (
        <div className="fixed z-50 pointer-events-none" style={{ left: edgeTooltip.x + 12, top: edgeTooltip.y - 10 }}>
          <div className="bg-base-200 border border-base-300 rounded-lg shadow-xl px-3 py-1.5 text-[10px] whitespace-nowrap">
            <div className="font-semibold text-base-content">{edgeTooltip.source} → {edgeTooltip.dest}</div>
            {edgeTooltip.label && <div className="text-base-content/40 text-[9px]">{edgeTooltip.label}</div>}
          </div>
        </div>
      )}

      {/* ── modals ── */}
      {pendingDeleteId && (
        <ConfirmModal
          title={t('topology.deleteConfirm')}
          message="This will remove the connection line. Nodes will not be affected."
          onConfirm={confirmDeleteConnection}
          onClose={() => setPendingDeleteId(null)}
        />
      )}

      {showLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowLabelModal(false); setPendingConnection(null); }}>
          <div className="modal-glass border border-base-300 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
              <h2 className="text-sm font-semibold text-base-content">{t('topology.newConnection')}</h2>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1">{t('topology.connectionLabel')}</label>
                <input type="text" value={connectingLabel}
                  onChange={e => setConnectingLabel(e.target.value)}
                  placeholder={t('topology.labelPlaceholder')}
                  className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setShowLabelModal(false); setPendingConnection(null); }}
                className="px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors">
                {t('topology.cancel')}
              </button>
              <button onClick={confirmConnection}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">
                <i className="fas fa-link text-xs"></i>
                {t('topology.connect')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEdge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setEditingEdge(null)}>
          <div className="modal-glass border border-base-300 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-0.5 h-4 rounded-full bg-primary/50 flex-shrink-0"></div>
              <h2 className="text-sm font-semibold text-base-content">Edit Connection Label</h2>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1">Label</label>
                <input type="text" value={editEdgeLabel}
                  onChange={e => setEditEdgeLabel(e.target.value)}
                  placeholder="e.g. VPN, Backup Link, 10 Gbps"
                  className="w-full bg-base-100 border border-base-300 rounded-lg px-3 py-2 text-sm text-base-content outline-none focus:border-primary/60 transition-colors" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setEditingEdge(null)}
                className="px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content transition-colors">Cancel</button>
              <button onClick={saveEdgeLabel}
                className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
