import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow, Handle, Position, useNodesState, useEdgesState,
  Background, Controls, MiniMap, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

function TargetNode({ data }) {
  const statusColor = data.isPaused ? 'warning'
    : data.lastStatus === true ? 'success'
    : data.lastStatus === false ? 'error' : 'ghost';

  return (
    <div className={`px-3 py-2 rounded-xl border-2 shadow-lg bg-base-100 min-w-[130px] transition-all hover:shadow-xl ${
      statusColor === 'success' ? 'border-success/40'
      : statusColor === 'error' ? 'border-error/40'
      : statusColor === 'warning' ? 'border-warning/40'
      : 'border-base-300'
    }`}>
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

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
  style: { stroke: '#6b7280', strokeWidth: 2 },
};

export default function Topology() {
  const { t } = useLang();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [topologyData, setTopologyData] = useState({ targets: [], connections: [] });
  const [loading, setLoading] = useState(true);
  const [connectingLabel, setConnectingLabel] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);

  const initialNodes = useMemo(() => topologyData.targets.map(tgt => ({
    id: `target-${tgt.id}`,
    type: 'targetNode',
    position: { x: tgt.topology_x ?? 50 + (tgt.id % 5) * 180, y: tgt.topology_y ?? 50 + Math.floor(tgt.id / 5) * 120 },
    data: { label: tgt.name, ip: tgt.ip_address, lastStatus: tgt.last_status, isPaused: tgt.is_paused, targetId: tgt.id },
    draggable: true,
  })), [topologyData.targets]);

  const initialEdges = useMemo(() => topologyData.connections.map(conn => ({
    id: `conn-${conn.id}`,
    source: `target-${conn.source_target_id}`,
    target: `target-${conn.destination_target_id}`,
    label: conn.label || '',
    data: { connId: conn.id, label: conn.label || '' },
  })), [topologyData.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges]);

  const fetchTopology = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/topology');
      setTopologyData(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTopology(); }, []);

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
      if (err.response?.status === 409) {
        setShowLabelModal(false);
        setPendingConnection(null);
      }
    }
  };

  const deleteConnection = async (connId) => {
    try {
      await axios.delete(`/api/topology/${connId}`);
      fetchTopology();
    } catch {}
  };

  const onNodeDragStop = useCallback(async (event, node) => {
    const targetId = parseInt(node.id.replace('target-', ''));
    try {
      await axios.post('/api/topology/positions', {
        positions: [{ id: targetId, topology_x: node.position.x, topology_y: node.position.y }],
      });
    } catch {}
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    if (edge.data?.connId && isAdmin) {
      if (window.confirm(t('topology.deleteConfirm'))) {
        deleteConnection(edge.data.connId);
      }
    }
  }, [isAdmin, t]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full bg-primary flex-shrink-0"></div>
          <div>
            <h1 className="text-base font-bold text-base-content leading-tight">{t('topology.title')}</h1>
            <p className="text-xs text-base-content/40 mt-0.5">{t('topology.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-base-content/40">
          <i className="fas fa-arrows-alt text-xs"></i>
          <span>{t('topology.dragHint')}</span>
          <span className="text-base-content/20 mx-1">|</span>
          <i className="fas fa-link text-xs"></i>
          <span>{t('topology.connectHint')}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-base-content/30">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="flex-1 mx-4 mb-4 rounded-xl border border-base-300 overflow-hidden bg-base-200/50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={isAdmin ? onConnect : undefined}
            onNodeDragStop={onNodeDragStop}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={null}
            multiSelectionKeyCode={null}
            panOnScroll
            selectionOnDrag
            panOnDrag={[1, 2]}
            selectNodesOnDrag={false}
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
      )}

      {showLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowLabelModal(false); setPendingConnection(null); }}>
          <div className="bg-base-200 border border-base-300 rounded-xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                className="btn-prime flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:brightness-110 transition-all">
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
