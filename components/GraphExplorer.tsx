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

  // Node coloring by disciplined role (Un-slopped: eliminated rainbow candy palette)
  const getNodeFill = (node: GraphNode) => {
    if (node.is_risk_seed) return '#f43f5e'; // Rose 500 (Risk seed)
    if (highlightedNodeIds.includes(node.id)) return '#f59e0b'; // Amber 500 (Highlight)
    switch (node.category) {
      case 'wallet':
        return '#38bdf8'; // Sky 400
      case 'funding_source':
        return '#818cf8'; // Indigo 400
      case 'agent':
        return '#94a3b8'; // Slate 400
      case 'smart_contract':
        return '#2dd4bf'; // Teal 400
      default:
        return '#64748b'; // Slate 500
    }
  };

  const getNodeStroke = (node: GraphNode) => {
    if (node.id === selectedNode?.id) return '#ffffff';
    if (node.is_risk_seed) return '#fda4af';
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
    <div className="relative w-full h-[640px] bg-[#080b11] rounded-none border border-[#1b2333] overflow-hidden flex flex-col font-mono">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d121c] border-b border-[#1b2333] z-10 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200 tracking-wider">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>TOPOLOGY GRAPH</span>
          </div>

          {/* Node Category Filters */}
          <div className="flex items-center border border-[#1b2333] bg-[#080b11] text-[11px]">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 border-r border-[#1b2333] transition-colors ${
                filterCategory === 'all' ? 'bg-[#1e293b] text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL ({topology.nodes.length})
            </button>
            <button
              onClick={() => setFilterCategory('wallet')}
              className={`px-2.5 py-1 border-r border-[#1b2333] transition-colors ${
                filterCategory === 'wallet' ? 'bg-[#1e293b] text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              WALLETS
            </button>
            <button
              onClick={() => setFilterCategory('funding_source')}
              className={`px-2.5 py-1 border-r border-[#1b2333] transition-colors ${
                filterCategory === 'funding_source' ? 'bg-[#1e293b] text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              FUNDING
            </button>
            <button
              onClick={() => setFilterCategory('agent')}
              className={`px-2.5 py-1 border-r border-[#1b2333] transition-colors ${
                filterCategory === 'agent' ? 'bg-[#1e293b] text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              AGENTS
            </button>
            <button
              onClick={() => setFilterCategory('smart_contract')}
              className={`px-2.5 py-1 transition-colors ${
                filterCategory === 'smart_contract' ? 'bg-[#1e293b] text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              CONTRACTS
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={() => setHighlightCycles(!highlightCycles)}
            className={`flex items-center gap-1.5 px-2.5 py-1 border transition-colors ${
              highlightCycles
                ? 'bg-amber-950/30 border-amber-500/50 text-amber-300 font-semibold'
                : 'bg-[#080b11] border-[#1b2333] text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CYCLE DETECTOR</span>
          </button>

          <div className="flex items-center border border-[#1b2333] bg-[#080b11]">
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#1e293b] border-r border-[#1b2333]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#1e293b] border-r border-[#1b2333]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 text-slate-400 hover:text-white hover:bg-[#1e293b]"
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
                  {/* Sharp targeting ring for risk seeds or selected nodes (Un-slopped: zero bouncy animations) */}
                  {node.is_risk_seed && (
                    <circle
                      r="18"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                  )}
                  {isSelected && (
                    <circle
                      r="17"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Core Node Circle */}
                  <circle
                    r="12"
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Node Label Text */}
                  <text
                    y="22"
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono font-medium pointer-events-none tracking-tight"
                  >
                    {node.label.length > 18 ? node.label.substring(0, 16) + '…' : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Node Inspector Docked Terminal Sheet */}
        {selectedNode && (
          <div className="absolute top-0 right-0 h-full w-84 bg-[#0d121c] border-l border-[#1b2333] p-4 text-xs flex flex-col justify-between z-20 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#1b2333] pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-none"
                    style={{ backgroundColor: getNodeFill(selectedNode) }}
                  />
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider font-mono">
                    {selectedNode.category.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white font-mono text-sm px-1"
                >
                  ✕
                </button>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Entity ID</p>
                <p className="font-mono text-cyan-300 break-all text-xs select-all mt-0.5 bg-[#080b11] p-1.5 border border-[#1b2333]">
                  {selectedNode.id}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Label</p>
                <p className="font-medium text-slate-200 mt-0.5">{selectedNode.label}</p>
              </div>

              {selectedNode.is_risk_seed && (
                <div className="p-2 border border-rose-900/60 bg-rose-950/20 text-rose-300">
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>SANCTION / RISK SEED</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Flagged in high-risk cluster. Direct interaction creates severe risk attribution.
                  </p>
                </div>
              )}

              {selectedNode.details && (
                <div className="border border-[#1b2333] bg-[#080b11] p-2.5 space-y-1.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Entity Attributes</p>
                  {Object.entries(selectedNode.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400 capitalize">{k.replace('_', ' ')}:</span>
                      <span className="text-slate-200">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#1b2333]">
              <button
                onClick={() => {
                  if (onSelectNode) onSelectNode(selectedNode.id);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-xs transition-colors border border-cyan-500/40"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>INVESTIGATE WALLET</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d121c] border-t border-[#1b2333] text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-500 uppercase text-[10px] font-bold">LEGEND:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#38bdf8]" />
            <span>Wallet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#818cf8]" />
            <span>Funding Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#94a3b8]" />
            <span>Agent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#2dd4bf]" />
            <span>Contract</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#f43f5e]" />
            <span>Risk Seed</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          TOPOLOGY: {visibleNodes.length} VERTICES • {visibleLinks.length} EDGES
        </div>
      </div>
    </div>
  );
}
