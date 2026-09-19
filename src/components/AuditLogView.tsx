import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Eye,
  FileCheck2,
  Calendar,
  Terminal,
  Clock,
  Building2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { AuditLogEntry, AgencyRole } from "../types";

interface AuditLogViewProps {
  onSelectAuditItem?: (item: AuditLogEntry) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ onSelectAuditItem }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [agencyFilter, setAgencyFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/audit-log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.warn("Audit log fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filter logs
  const filteredLogs = logs.filter((entry) => {
    if (agencyFilter !== "ALL" && entry.agency !== agencyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchActor = entry.actor.toLowerCase().includes(q);
      const matchTarget = entry.targetId.toLowerCase().includes(q);
      const matchDetails = entry.details.toLowerCase().includes(q);
      const matchAction = entry.action.toLowerCase().includes(q);
      return matchActor || matchTarget || matchDetails || matchAction;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CLIP_VIEWED":
        return {
          label: "CLIP VIEWED",
          classes: "bg-sky-950/70 text-sky-300 border-sky-800",
          icon: <Eye className="w-3 h-3 text-sky-400" />,
        };
      case "CERTIFICATE_EXPORTED":
        return {
          label: "CERT EXPORTED",
          classes: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
          icon: <FileCheck2 className="w-3 h-3 text-emerald-400" />,
        };
      case "HANDOVER_SIGNED":
        return {
          label: "HANDOVER SIGNED",
          classes: "bg-purple-950/70 text-purple-300 border-purple-800",
          icon: <Lock className="w-3 h-3 text-purple-400" />,
        };
      case "QRF_DISPATCHED":
        return {
          label: "QRF DISPATCHED",
          classes: "bg-red-950/70 text-red-300 border-red-800",
          icon: <ShieldAlert className="w-3 h-3 text-red-400" />,
        };
      case "NODE_SERVICED":
        return {
          label: "NODE SERVICED",
          classes: "bg-amber-950/70 text-amber-300 border-amber-800",
          icon: <RefreshCw className="w-3 h-3 text-amber-400" />,
        };
      default:
        return {
          label: action.replace(/_/g, " "),
          classes: "bg-slate-800 text-slate-300 border-slate-700",
          icon: <Terminal className="w-3 h-3" />,
        };
    }
  };

  const getAgencyColor = (agency: AgencyRole) => {
    switch (agency) {
      case "BSF":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "POLICE":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "ARMY":
        return "bg-red-500/15 text-red-300 border-red-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-mono text-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
                Immutable Audit Log
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                READ-ONLY LEDGER
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tamper-evident record of who viewed, exported, or verified evidence clips (Admin cannot edit or delete)
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-2.5 bg-slate-950 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Agency:
          </span>
          {(["ALL", "BSF", "POLICE", "ARMY", "COMMAND"] as const).map((ag) => (
            <button
              key={ag}
              onClick={() => setAgencyFilter(ag)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition border ${
                agencyFilter === ag
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {ag}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search actor, clip ID, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-2.5 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Scrollable Audit Trail Table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-600" />
            <p>No audit entries match filter criteria.</p>
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const badge = getActionBadge(entry.action);
            const agencyStyle = getAgencyColor(entry.agency);

            return (
              <div
                key={entry.id}
                onClick={() => onSelectAuditItem && onSelectAuditItem(entry)}
                className="p-3 bg-slate-900/70 border border-slate-800/90 rounded-lg hover:border-slate-700 transition space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badge.classes}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${agencyStyle}`}>
                      {entry.agency}
                    </span>

                    <strong className="text-slate-200 text-xs">{entry.actor}</strong>
                    <span className="text-[10px] text-slate-500">({entry.role})</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entry.timestamp}
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">{entry.ipAddress}</span>
                  </div>
                </div>

                {/* Details line */}
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  {entry.details}
                </div>

                {/* Target & Hash Verification Footer */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">TARGET:</span>
                    <strong className="text-slate-200">{entry.targetId}</strong>
                  </div>

                  {entry.blockHash && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">SEALED HASH:</span>
                      <span className="text-emerald-400 font-mono truncate max-w-[150px]">
                        {entry.blockHash.substring(0, 16)}...
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyHash(entry.blockHash!);
                        }}
                        className="p-0.5 text-slate-500 hover:text-slate-300"
                        title="Copy full cryptographic hash"
                      >
                        {copiedHash === entry.blockHash ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ledger Integrity Bottom Bar */}
      <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>CRYPTOGRAPHIC LEDGER: Append-only • Zero deletions permitted by architecture</span>
        </div>
        <span>Total Records: {logs.length}</span>
      </div>
    </div>
  );
};
