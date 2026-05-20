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

function TargetNode({ data }) {
  const statusColor = data.isPaused ? 'warning'
    : data.lastStatus === true ? 'success'
    : data.lastStatus === false ? 'error' : 'ghost';
  const dimmed = data.dimmed;

  return (
    <div className={`px-3 py-2 rounded-xl border-2 shadow-lg bg-base-100 min-w-[130px] transition-all hover:shadow-xl ${
      data.selected ? 'ring-2 ring-primary shadow-xl scale-105' : ''
    } ${
      statusColor === 'success' ? 'border-success/40'
      : statusColor === 'error' ? 'border-error/40'
      : statusColor === 'warning' ? 'border-warning/40'
      : 'border-base-300'
    } ${dimmed ? 'opacity-30' : ''}`}>
      <Handle type="target" position={Position.Left}
        className="w-2.5 h-2.5 border-2 border-base-100 !bg-primary" />
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          statusColor === 'success' ? 'bg-success'
          : statusColor === 'error' ? 'bg-error'
          : statusColor === 'warning' ? 'bg-warning'
          : 'bg-base-300'
        }`}></span>
        <div className="min-w-0">
          <div className="text-xs font-bold text-base-content leading-tight truncate">{data.label}</div>
          <div className="text-[9px] text-base-content/40 font-mono">{data.ip}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right}
        className="w-2.5 h-2.5 border-2 border-base-100 !bg-primary" />
    </div>
  );
}

const nodeTypes = { targetNode: TargetNode };

/* ── layout algorithms ── */
function circularLayout(nodeCount, centerX, centerY, radius) {
  return nodeCount === 0 ? [] : Array.from({ length: nodeCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  });
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
    pos.forEach(p => {
      p.x += forces[0].x * cooling;
      p.y += forces[0].y * cooling;
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

  const [topologyData, setTopologyData] = useState({ targets: [], connections: [] });
  const [loading, setLoading] = useState(true);
  const [connectingLabel, setConnectingLabel] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [layoutLocked, setLayoutLocked] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hiddenTargets, setHiddenTargets] = useState(new Set());
  const [showTargetFilter, setShowTargetFilter] = useState(false);

  const filteredTargets = useMemo(() =>
    topologyData.targets.filter(t => !hiddenTargets.has(t.id)),
  [topologyData.targets, hiddenTargets]);

  const initialNodes = useMemo(() => filteredTargets.map(tgt => ({
    id: `target-${tgt.id}`,
    type: 'targetNode',
    position: { x: tgt.topology_x ?? 50 + (tgt.id % 5) * 180, y: tgt.topology_y ?? 50 + Math.floor(tgt.id / 5) * 120 },
    data: {
      label: tgt.name, ip: tgt.ip_address,
      lastStatus: tgt.last_status, isPaused: tgt.is_paused,
      targetId: tgt.id, dimmed: false, selected: false,
    },
    draggable: !layoutLocked,
  })), [filteredTargets, layoutLocked]);

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

  const confirmDeleteConnection = async () => {
    try {
      await axios.delete(`/api/topology/${pendingDeleteId}`);
      setPendingDeleteId(null);
      fetchTopology();
    } catch {}
  };

  const onNodeDragStop = useCallback(async (_event, node) => {
    const targetId = parseInt(node.id.replace('target-', ''));
    try {
      await axios.post('/api/topology/positions', {
        positions: [{ id: targetId, topology_x: Math.round(node.position.x), topology_y: Math.round(node.position.y) }],
      });
    } catch {}
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    if (edge.data?.connId && isAdmin) {
      setPendingDeleteId(edge.data.connId);
    }
  }, [isAdmin]);

  /* ── context menu ── */
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node });
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  const loadNodeDetails = useCallback(async (targetId, targetName) => {
    setSelectedNodeData({ id: targetId, name: targetName, loading: true });
    try {
      const { data: points } = await axios.get(`/api/targets/${targetId}/chart-data?range=24h`);
      const valid = points.filter(p => p.response_time != null);
      const avg = valid.length ? (valid.reduce((s, p) => s + p.response_time, 0) / valid.length).toFixed(0) : null;
      const min = valid.length ? Math.min(...valid.map(p => p.response_time)).toFixed(0) : null;
      const max = valid.length ? Math.max(...valid.map(p => p.response_time)).toFixed(0) : null;
      const loss = points.length ? ((points.filter(p => !p.is_success).length / points.length) * 100).toFixed(1) : null;
      setSelectedNodeData({ id: targetId, name: targetName, loading: false, points, stats: { avg, min, max, loss: loss ? `${loss}%` : null } });
      try {
        const incResp = await axios.get('/api/incidents', { params: { target_id: targetId, per_page: 5 } });
        setSelectedNodeData(prev => ({ ...prev, recentIncidents: incResp.data.data || [] }));
      } catch {}
    } catch { setSelectedNodeData({ id: targetId, name: targetName, loading: false }); }
  }, []);

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
  const onNodeClick = useCallback((_event, node) => {
    if (selectedNodeData?.id === node.data.targetId) return;
    loadNodeDetails(node.data.targetId, node.data.label);
  }, [selectedNodeData, loadNodeDetails]);

  /* ── layout ── */
  const applyCircularLayout = () => {
    const w = flowRef.current?.getBounds?.()?.width || 800;
    const h = flowRef.current?.getBounds?.()?.height || 600;
    const positions = circularLayout(initialNodes.length, w / 2, h / 2, Math.min(w, h) * 0.35);
    const updates = initialNodes.map((n, i) => ({ id: n.data.targetId, x: Math.round(positions[i].x), y: Math.round(positions[i].y) }));
    setNodes(nds => nds.map((n, i) => ({ ...n, position: { x: positions[i].x, y: positions[i].y } })));
    axios.post('/api/topology/positions', { positions: updates.map(u => ({ id: u.id, topology_x: u.x, topology_y: u.y })) }).catch(() => {});
    toast('Circular layout applied');
  };

  const applyForceLayout = () => {
    const w = flowRef.current?.getBounds?.()?.width || 800;
    const h = flowRef.current?.getBounds?.()?.height || 600;
    const positions = forceDirectedLayout(initialNodes, initialEdges, w / 2, h / 2);
    const updates = initialNodes.map((n, i) => ({ id: n.data.targetId, x: Math.round(positions[i].x), y: Math.round(positions[i].y) }));
    setNodes(nds => nds.map((n, i) => ({ ...n, position: { x: positions[i].x, y: positions[i].y } })));
    axios.post('/api/topology/positions', { positions: updates.map(u => ({ id: u.id, topology_x: u.x, topology_y: u.y })) }).catch(() => {});
    toast('Force-directed layout applied');
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
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
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
          <button onClick={applyCircularLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-all">
            <i className="fas fa-circle text-[10px]"></i> Circular
          </button>
          <button onClick={applyForceLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-all">
            <i className="fas fa-share-alt text-[10px]"></i> Force
          </button>
          <button onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-base-300 text-base-content/50 hover:text-base-content hover:bg-base-200 transition-all">
            <i className="fas fa-download text-[10px]"></i> Export
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
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={isAdmin ? onConnect : undefined}
              onNodeDragStop={onNodeDragStop}
              onEdgeClick={onEdgeClick}
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
            <div className="w-72 ml-3 bg-base-200 border border-base-300 rounded-xl p-4 overflow-y-auto flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-base-content truncate mr-2">{selectedNodeData.name}</h3>
                <button onClick={closeSidebar}
                  className="w-5 h-5 flex items-center justify-center rounded text-[9px] text-base-content/25 hover:text-base-content hover:bg-base-300/50 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              {selectedNodeData.loading ? (
                <div className="flex items-center justify-center py-8 text-[10px] text-base-content/30">
                  <span className="loading loading-spinner loading-sm mr-2"></span> Loading…
                </div>
              ) : (
                <>
                  {selectedNodeData.stats && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { label: 'Avg Latency', value: selectedNodeData.stats.avg, cls: 'text-primary border-primary/20' },
                        { label: 'Min', value: selectedNodeData.stats.min, cls: 'text-success border-success/20' },
                        { label: 'Max', value: selectedNodeData.stats.max, cls: 'text-error border-error/20' },
                        { label: 'Packet Loss', value: selectedNodeData.stats.loss, cls: 'text-warning border-warning/20' },
                      ].map(s => (
                        <div key={s.label} className={`border rounded-lg px-2 py-1.5 ${s.cls}`}>
                          <div className="text-[9px] text-base-content/40 font-medium">{s.label}</div>
                          <div className="text-xs font-black tabular-nums">{s.value ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedNodeData.points?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[9px] font-semibold text-base-content/40 uppercase tracking-wider mb-1.5">Latency (24h)</div>
                      <div className="flex items-end gap-px h-16">
                        {selectedNodeData.points.slice(-60).map((p, i) => {
                          const max = Math.max(...selectedNodeData.points.map(x => x.response_time || 0), 1);
                          const h = Math.min(100, ((p.response_time || 0) / max) * 100);
                          return <div key={i} className={`flex-1 rounded-t ${p.is_success ? 'bg-primary/30' : 'bg-error/40'}`}
                            style={{ height: `${h}%` }}></div>;
                        })}
                      </div>
                    </div>
                  )}
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
                </>
              )}
            </div>
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
    </div>
  );
}
