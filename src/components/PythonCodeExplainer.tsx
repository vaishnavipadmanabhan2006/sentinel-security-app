import React, { useState, useEffect } from "react";
import { Code, Terminal, FileText, Copy, Check, ExternalLink, Cpu, Layers } from "lucide-react";
import { PythonModule } from "../types";

export const PythonCodeExplainer: React.FC = () => {
  const [modules, setModules] = useState<PythonModule[]>([]);
  const [activeTab, setActiveTab] = useState<string>("detection.py");
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/python-modules")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setModules(data);
          setActiveTab(data[0].name);
        }
      })
      .catch((err) => console.warn("Failed to load python modules:", err))
      .finally(() => setLoading(false));
  }, []);

  const activeModule = modules.find((m) => m.name === activeTab) || modules[0];

  const handleCopyCode = () => {
    if (!activeModule) return;
    navigator.clipboard.writeText(activeModule.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            Python Architecture & Judge Code Explainer
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
            MODULAR LOCAL RUNNER
          </span>
        </div>

        <button
          id="btn-copy-python-code"
          onClick={handleCopyCode}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px] transition"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Module</span>
            </>
          )}
        </button>
      </div>

      {/* Presentation Architecture Explainer Bar */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800 text-[11px] text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Local Runner:</strong> Run <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-700">python app.py</code> to launch FastAPI + YOLOv8 + SQLite + SHA-256 Ledger.
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          Modular files ready for live hackathon presentation & judging.
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-950/70 border-b border-slate-800">
        {modules.map((m) => (
          <button
            key={m.name}
            id={`tab-code-${m.name.replace(".", "-")}`}
            onClick={() => setActiveTab(m.name)}
            className={`px-2.5 py-1 rounded text-[11px] transition flex items-center gap-1.5 ${
              activeTab === m.name
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>{m.name}</span>
          </button>
        ))}
      </div>

      {/* Code Viewer Body */}
      <div className="flex-1 overflow-y-auto p-3 bg-slate-950/90 text-slate-200">
        {activeModule ? (
          <div>
            <div className="mb-2 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-400 mr-2">{activeModule.name}</span>
                <span className="text-slate-400">{activeModule.description}</span>
              </div>
            </div>
            <pre className="text-[11px] text-slate-300 font-mono leading-relaxed overflow-x-auto p-3 rounded bg-black/60 border border-slate-900">
              <code>{activeModule.code}</code>
            </pre>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500">Loading module source...</div>
        )}
      </div>
    </div>
  );
};
