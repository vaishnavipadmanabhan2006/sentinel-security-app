import React, { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2, Copy, Check, ExternalLink, Hash, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { Block, BlockchainResponse } from "../types";

interface BlockchainLedgerViewProps {
  blockchainData: BlockchainResponse | null;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const BlockchainLedgerView: React.FC<BlockchainLedgerViewProps> = ({
  blockchainData,
  onRefresh,
  isLoading,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const chain = blockchainData?.chain || [];
  const integrity = blockchainData?.integrity || { isValid: true, message: "Valid cryptographic hash chain." };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            Mock Blockchain Audit Trail (SHA-256)
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/30">
            {chain.length} BLOCKS SEALED
          </span>
        </div>

        <button
          id="btn-refresh-blockchain"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 flex items-center gap-1 transition"
          title="Verify hash chain and refresh blocks"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          <span className="text-[10px]">VERIFY CHAIN</span>
        </button>
      </div>

      {/* Cryptographic Integrity Status Banner */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between text-[11px] ${
          integrity.isValid
            ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-300"
            : "bg-red-950/50 border-red-900/50 text-red-300 animate-pulse"
        }`}
      >
        <div className="flex items-center gap-2">
          {integrity.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span>{integrity.message}</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase">
          Ledger: append-only • SHA-256
        </span>
      </div>

      {/* Blocks List & Inspector */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Block History Column */}
        <div className="w-full md:w-1/2 border-r border-slate-800 overflow-y-auto p-2 space-y-2">
          {chain.slice().reverse().map((block) => {
            const isSelected = selectedBlock?.index === block.index || (!selectedBlock && block.index === chain.length - 1);
            const isGenesis = block.index === 0;

            return (
              <div
                key={block.index}
                id={`block-item-${block.index}`}
                onClick={() => setSelectedBlock(block)}
                className={`p-2.5 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/90 border-emerald-500/50 shadow-sm"
                    : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isGenesis ? "bg-purple-900/40 text-purple-300 border border-purple-700/50" : "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  }`}>
                    {isGenesis ? "GENESIS BLOCK #0" : `BLOCK #${block.index}`}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {block.timestamp.split("T")[1]?.replace("Z", "") || block.timestamp}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between gap-2">
                  <span className="truncate max-w-[210px] font-mono text-slate-300" title={block.hash}>
                    HASH: {block.hash.substring(0, 16)}...
                  </span>
                  <span className="text-[9px] px-1 bg-slate-800 text-slate-400 rounded">
                    nonce: {block.nonce}
                  </span>
                </div>

                {/* Event type summary */}
                <div className="mt-1 text-[10px] text-slate-400 truncate">
                  {block.eventData?.eventType || block.eventData?.message || "Surveillance Event"}
                  {block.eventData?.riskScore ? ` (Risk ${block.eventData.riskScore}/100)` : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Block Detail Inspector Column */}
        <div className="w-full md:w-1/2 p-3 bg-slate-950/60 overflow-y-auto">
          {(() => {
            const active = selectedBlock || chain[chain.length - 1];
            if (!active) return null;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">
                    BLOCK INSPECTOR #{active.index}
                  </span>
                  <button
                    id="btn-copy-block-hash"
                    onClick={() => handleCopy(active.hash)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400"
                  >
                    {copiedHash === active.hash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Hash Headers */}
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Current Block Hash (SHA-256):</span>
                    <p className="font-mono text-[10px] text-emerald-400 break-all bg-slate-900 p-1.5 rounded border border-slate-800">
                      {active.hash}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Previous Block Hash:</span>
                    <p className="font-mono text-[10px] text-slate-400 break-all bg-slate-900 p-1.5 rounded border border-slate-800">
                      {active.prevHash}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Timestamp: {active.timestamp}</span>
                    <span>Nonce: {active.nonce}</span>
                  </div>
                </div>

                {/* Block Payload JSON */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">
                    Immutable Payload Telemetry:
                  </span>
                  <pre className="text-[10px] text-slate-300 bg-slate-950 border border-slate-800 p-2.5 rounded overflow-x-auto max-h-[160px] leading-snug">
                    {JSON.stringify(active.eventData, null, 2)}
                  </pre>
                </div>

                <div className="p-2 rounded bg-emerald-950/30 border border-emerald-900/40 text-[10px] text-emerald-300">
                  ✓ Block is cryptographically bound to parent block. Any retroactive change will invalidate the downstream chain.
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
