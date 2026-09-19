import React, { useState, useEffect } from "react";
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Sun,
  Zap,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wrench,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { EdgeNodePower } from "../types";

interface EdgeNodesWidgetProps {
  nodes?: EdgeNodePower[];
  onRefresh?: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export const EdgeNodesWidget: React.FC<EdgeNodesWidgetProps> = ({
  nodes: propNodes,
  onRefresh,
  onSelectNode,
}) => {
  const [internalNodes, setInternalNodes] = useState<EdgeNodePower[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isServicing, setIsServicing] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      const res = await fetch("/api/edge-nodes");
      if (res.ok) {
        const data = await res.json();
        setInternalNodes(data.nodes || []);
      }
    } catch (e) {
      console.warn("Edge nodes fetch error:", e);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 15000);
    return () => clearInterval(interval);
  }, []);

  const nodes = propNodes && propNodes.length > 0 ? propNodes : internalNodes;
  const criticalNodes = nodes.filter((n) => n.batteryPercent < 25);
  const lowestNode = nodes.reduce((min, n) => (n.batteryPercent < min.batteryPercent ? n : min), nodes[0] || { batteryPercent: 100 });

  const handleServiceNode = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsServicing(nodeId);
    try {
      const res = await fetch(`/api/edge-nodes/${nodeId}/service`, { method: "POST" });
      if (res.ok) {
        await fetchNodes();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.warn("Service node error:", err);
    } finally {
      setIsServicing(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs shadow-sm">
      {/* Summary Header Bar */}
      <div
        id="edge-nodes-summary-bar"
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 transition"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${criticalNodes.length > 0 ? "bg-red-950 text-red-400 border border-red-800 animate-pulse" : "bg-emerald-950 text-emerald-400 border border-emerald-800"}`}>
            {criticalNodes.length > 0 ? <BatteryWarning className="w-4 h-4" /> : <BatteryCharging className="w-4 h-4" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">EDGE CAMERA POWER STATUS</span>
              <span className="text-[10px] text-slate-400">({nodes.length} remote masts)</span>
              {criticalNodes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-bold text-[10px] animate-bounce">
                  ⚠️ {criticalNodes.length} NODE CRITICAL (&lt;25%)
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Lowest: <strong className={lowestNode?.batteryPercent < 25 ? "text-red-400 font-bold" : "text-amber-400"}>{lowestNode?.name} ({lowestNode?.batteryPercent}%)</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Sun className="w-3 h-3" />
                Solar input active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick mini-gauges for top 3 nodes */}
          <div className="hidden sm:flex items-center gap-2 text-[10px]">
            {nodes.slice(0, 4).map((node) => (
              <div
                key={node.nodeId}
                className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                  node.batteryPercent < 25
                    ? "bg-red-950/80 border-red-500 text-red-300 animate-pulse"
                    : node.batteryPercent < 60
                    ? "bg-amber-950/40 border-amber-700/50 text-amber-300"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
                title={`${node.name}: ${node.batteryPercent}% battery (~${node.estimatedHoursLeft}h left, ${node.solarWatts}W solar)`}
              >
                <span className="text-[9px] text-slate-400">{node.nodeId.replace("CAM-", "")}:</span>
                <span className="font-bold">{node.batteryPercent}%</span>
              </div>
            ))}
          </div>

          <button
            className="p-1 rounded text-slate-400 hover:text-slate-200"
            title={isExpanded ? "Collapse node list" : "Expand all camera node power stats"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Critical Outage Warning Banner if any node is <25% */}
      {criticalNodes.length > 0 && (
        <div className="bg-red-950/60 border-y border-red-800/80 px-3 py-1.5 flex items-center justify-between text-[11px] text-red-300">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-bounce" />
            <span>
              <strong>OUTAGE RISK:</strong> {criticalNodes[0].name} has ~{criticalNodes[0].estimatedHoursLeft} hours remaining before going dark.
            </span>
          </div>
          <button
            id={`btn-service-node-${criticalNodes[0].nodeId}`}
            onClick={(e) => handleServiceNode(criticalNodes[0].nodeId, e)}
            disabled={isServicing === criticalNodes[0].nodeId}
            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-sm"
          >
            <Wrench className="w-3 h-3" />
            <span>{isServicing === criticalNodes[0].nodeId ? "Servicing..." : "Swap Battery Pack"}</span>
          </button>
        </div>
      )}

      {/* Expanded Grid of All Nodes */}
      {isExpanded && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {nodes.map((node) => {
              const isCritical = node.batteryPercent < 25;
              const isWarning = node.batteryPercent >= 25 && node.batteryPercent < 60;

              return (
                <div
                  key={node.nodeId}
                  onClick={() => onSelectNode && onSelectNode(node.nodeId)}
                  className={`p-2.5 rounded-lg border transition cursor-pointer ${
                    isCritical
                      ? "bg-red-950/30 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      : isWarning
                      ? "bg-amber-950/20 border-amber-700/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{node.nodeId}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{node.name}</span>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                        isCritical
                          ? "bg-red-950 text-red-300 border-red-700 animate-pulse"
                          : isWarning
                          ? "bg-amber-950 text-amber-300 border-amber-700"
                          : "bg-emerald-950 text-emerald-300 border-emerald-700"
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  {/* Battery Gauge Bar */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Battery Level</span>
                      <strong className={isCritical ? "text-red-400 font-bold" : isWarning ? "text-amber-400" : "text-emerald-400"}>
                        {node.batteryPercent}% ({node.voltage}V)
                      </strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${node.batteryPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Solar & Consumption Telemetry */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" />
                      <span>Solar: <strong>{node.solarWatts}W</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-sky-400" />
                      <span>Est: <strong>~{node.estimatedHoursLeft}h left</strong></span>
                    </div>
                  </div>

                  {/* Service Action Button if low battery */}
                  {isCritical && (
                    <div className="mt-2 pt-1.5 border-t border-red-900/40 flex items-center justify-between">
                      <span className="text-[10px] text-red-400 font-semibold">Risk of going dark soon</span>
                      <button
                        onClick={(e) => handleServiceNode(node.nodeId, e)}
                        disabled={isServicing === node.nodeId}
                        className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center gap-1 transition"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{isServicing === node.nodeId ? "Servicing..." : "Swap Battery"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Remote Edge Telemetry: 12V LiFePO4 battery banks + 60W Mono-Si Solar Arrays</span>
            <button
              onClick={fetchNodes}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Poll Hardware Status</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
