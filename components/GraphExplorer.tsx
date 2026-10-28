'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3Force from 'd3-force';
import { GraphTopology, GraphNode, GraphLink, NodeCategory } from '@/lib/graph/types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  ShieldAlert,
  Info,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface GraphExplorerProps {
  initialTopology?: GraphTopology;
  highlightedNodeIds?: string[];
  onSelectNode?: (nodeId: string) => void;
}

export function GraphExplorer({
  initialTopology,
  highlightedNodeIds = [],
  onSelectNode,
}: GraphExplorerProps) {
  const [topology, setTopology] = useState<GraphTopology>(initialTopology || { nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [highlightCycles, setHighlightCycles] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<any>(null);

  // Fetch topology if not provided
  useEffect(() => {
    if (!initialTopology) {
      fetch('/api/graph')
        .then((res) => res.json())
        .then((data: GraphTopology) => {
          setTopology(data);
        })
        .catch(console.error);
    } else {
      setTopology(initialTopology);
    }
  }, [initialTopology]);

  // Run d3-force simulation
  useEffect(() => {
    if (!topology.nodes.length) return;

    const width = 800;
    const height = 550;

    // Clone nodes and links for simulation
    const simNodes = topology.nodes.map((d) => ({ ...d }));
    const simLinks = topology.links.map((d) => ({
      ...d,
      source: typeof d.source === 'object' ? (d.source as any).id : d.source,
      target: typeof d.target === 'object' ? (d.target as any).id : d.target,
    }));

    const simulation = d3Force
      .forceSimulation(simNodes as any)
      .force(
        'link',
        d3Force
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(90)
      )
      .force('charge', d3Force.forceManyBody().strength(-240))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collision', d3Force.forceCollide().radius(35))
      .on('tick', () => {
        // Trigger React re-render by updating node coordinates
        setTopology({
          nodes: simNodes as GraphNode[],
          links: simLinks as GraphLink[],
        });
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [topology.nodes.length]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.4, Math.min(2.5, prev + delta)));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag canvas if background clicked
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  // Node coloring by type
  const getNodeFill = (node: GraphNode) => {
    if (node.is_risk_seed) return '#ef4444'; // Red
    if (highlightedNodeIds.includes(node.id)) return '#f59e0b'; // Amber
    switch (node.category) {
      case 'wallet':
        return '#06b6d4'; // Cyan
      case 'funding_source':
        return '#8b5cf6'; // Purple
      case 'agent':
        return '#ec4899'; // Pink
      case 'smart_contract':
        return '#10b981'; // Emerald
      default:
        return '#64748b'; // Slate
    }
  };

  const getNodeStroke = (node: GraphNode) => {
    if (node.id === selectedNode?.id) return '#ffffff';
    if (node.is_risk_seed) return '#fca5a5';
    return '#1e293b';
  };

  // Filtered nodes
  const visibleNodes = topology.nodes.filter((node) => {
    if (filterCategory === 'all') return true;
    return node.category === filterCategory;
  });

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  const visibleLinks = topology.links.filter((link) => {
    const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    return visibleNodeIds.has(sId) && visibleNodeIds.has(tId);
  });

  // Cycle nodes (Scenario A suspect wallets)
  const isCycleLink = (link: GraphLink) => {
    const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    const cycleNodes = ['0x71c...sus1', '0x82d...sus2', '0x93e...sus3'];
    return cycleNodes.includes(sId) && cycleNodes.includes(tId) && link.type === 'TRANSFERRED_TO';
  };

  return (
    <div className="relative w-full h-[640px] bg-[#0b1120] rounded-xl border border-card-border overflow-hidden flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-card-border z-10 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>GRAPH EXPLORER</span>
          </div>

          {/* Node Category Filters */}
          <div className="flex items-center gap-1 bg-[#1e293b]/70 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterCategory === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({topology.nodes.length})
            </button>
            <button
              onClick={() => setFilterCategory('wallet')}
              className={`px-2 py-1 rounded transition-colors ${
                filterCategory === 'wallet' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wallets
            </button>
            <button
              onClick={() => setFilterCategory('funding_source')}
              className={`px-2 py-1 rounded transition-colors ${
                filterCategory === 'funding_source' ? 'bg-purple-500/20 text-purple-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Funding
            </button>
            <button
              onClick={() => setFilterCategory('agent')}
              className={`px-2 py-1 rounded transition-colors ${
                filterCategory === 'agent' ? 'bg-pink-500/20 text-pink-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => setFilterCategory('smart_contract')}
              className={`px-2 py-1 rounded transition-colors ${
                filterCategory === 'smart_contract' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Contracts
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setHighlightCycles(!highlightCycles)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
              highlightCycles
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Highlight Cycles</span>
          </button>

          <div className="flex items-center bg-slate-800/80 rounded-lg border border-slate-700 p-0.5">
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Graph Canvas */}
      <div
        className="relative flex-1 cursor-grab active:cursor-grabbing select-none overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          id="graph-bg"
          viewBox="0 0 800 550"
        >
          {/* Arrowhead Defs */}
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
            </marker>
            <marker
              id="arrow-cycle"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
            <marker
              id="arrow-funding"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
            </marker>
          </defs>

          {/* Transform Container with Pan & Zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoomLevel})`}>
            {/* Links */}
            {visibleLinks.map((link, idx) => {
              const sourceNode =
                typeof link.source === 'object'
                  ? (link.source as any)
                  : topology.nodes.find((n) => n.id === link.source);
              const targetNode =
                typeof link.target === 'object'
                  ? (link.target as any)
                  : topology.nodes.find((n) => n.id === link.target);

              if (!sourceNode || !targetNode) return null;

              const isSusCycle = highlightCycles && isCycleLink(link);
              const isFunding = link.type === 'FUNDED';

              const strokeColor = isSusCycle ? '#f59e0b' : isFunding ? '#8b5cf6' : '#334155';
              const strokeWidth = isSusCycle ? 2.5 : 1.5;
              const markerEnd = isSusCycle ? 'url(#arrow-cycle)' : isFunding ? 'url(#arrow-funding)' : 'url(#arrow-default)';

              return (
                <g key={`link-${idx}`}>
                  <line
                    x1={sourceNode.x || 400}
                    y1={sourceNode.y || 275}
                    x2={targetNode.x || 400}
                    y2={targetNode.y || 275}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isSusCycle ? '4 2' : 'none'}
                    markerEnd={markerEnd}
                  />
                  {link.amount && (
                    <text
                      x={((sourceNode.x || 400) + (targetNode.x || 400)) / 2}
                      y={((sourceNode.y || 275) + (targetNode.y || 275)) / 2 - 4}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {link.amount} {link.asset || 'ETH'}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {visibleNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isHighlighted = highlightedNodeIds.includes(node.id);
              const fill = getNodeFill(node);
              const stroke = getNodeStroke(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x || 400}, ${node.y || 275})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    if (onSelectNode) onSelectNode(node.id);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Outer pulse for risk seeds or selected nodes */}
                  {(node.is_risk_seed || isSelected || isHighlighted) && (
                    <circle
                      r="19"
                      fill="none"
                      stroke={node.is_risk_seed ? '#ef4444' : '#06b6d4'}
                      strokeWidth="2"
                      opacity="0.6"
                      className="animate-pulse"
                    />
                  )}

                  {/* Core Node Circle */}
                  <circle
                    r="13"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-transform group-hover:scale-110"
                  />

                  {/* Node Label Text */}
                  <text
                    y="24"
                    fill="#cbd5e1"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-medium pointer-events-none"
                  >
                    {node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Node Inspector Side-Sheet */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-80 bg-[#0f172a]/95 backdrop-blur-md border border-card-border rounded-xl p-4 shadow-2xl text-xs space-y-3 z-20">
            <div className="flex items-center justify-between border-b border-card-border pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getNodeFill(selectedNode) }}
                />
                <span className="font-semibold text-white uppercase text-[11px] tracking-wider">
                  {selectedNode.category.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 font-mono">Entity Identifier</p>
              <p className="font-mono text-cyan-300 break-all text-xs select-all mt-0.5">
                {selectedNode.id}
              </p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 font-mono">Display Label</p>
              <p className="font-medium text-slate-200 mt-0.5">{selectedNode.label}</p>
            </div>

            {selectedNode.is_risk_seed && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-red-950/40 border border-red-800/60 text-red-300">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  Flagged Risk Seed (OFAC / Sanction / Threat Intel)
                </span>
              </div>
            )}

            {selectedNode.details && (
              <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Metadata</p>
                {Object.entries(selectedNode.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-slate-400 capitalize">{k.replace('_', ' ')}:</span>
                    <span className="text-slate-200 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1 flex gap-2">
              <button
                onClick={() => {
                  if (onSelectNode) onSelectNode(selectedNode.id);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Investigate in Depth</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0f172a] border-t border-card-border text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-500 uppercase text-[10px] font-semibold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Wallet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Funding Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <span>Autonomous Agent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Smart Contract</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Risk Seed</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500">
          Showing {visibleNodes.length} entities • {visibleLinks.length} directed relationships
        </div>
      </div>
    </div>
  );
}
