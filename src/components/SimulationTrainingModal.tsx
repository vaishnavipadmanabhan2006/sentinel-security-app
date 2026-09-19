import React, { useState } from "react";
import {
  GraduationCap,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  RotateCcw,
  Award,
  Sparkles,
  Eye,
  ChevronRight,
} from "lucide-react";
import { TrainingScenario, ThreatTier } from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface SimulationTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: "DRILL-101",
    title: "Nocturnal Camouflage Wire Breach",
    difficulty: "RECRUIT",
    scenarioType: "NOCTURNAL_CAMOUFLAGE",
    briefing:
      "At 02:44 AM, thermal tripwire detected 2 heat signatures in Sector 4-Alpha. Targets are prone with low infrared emissivity tarps. How do you triage this incident?",
    historicalDate: "Recorded 04 Aug 2026 (Anonymized Archive)",
    snapshotUrl: "",
    targetCount: 2,
    actualRiskScore: 92,
    correctTier: "LEVEL_3_CRITICAL",
    correctAction: "ESCALATE_QRF",
    keyClues: [
      "Low crawling vector towards barbed wire gap",
      "Thermal signature matches human core body temperature (36.8°C)",
      "Restricted buffer boundary already breached",
    ],
    learningTakeaway:
      "Low emissivity tarps mask optical cameras, but FLIR thermal reveals joint motion and breath plumes. Immediate Level 3 QRF dispatch is required.",
  },
  {
    id: "DRILL-102",
    title: "Stray Livestock Grazing Near Fence",
    difficulty: "RECRUIT",
    scenarioType: "STRAY_ANIMAL_FALSE_ALARM",
    briefing:
      "At 19:15 PM, seismo-acoustic sensor logged repeated ground impacts near Sector 2 buffer. Track bounding box shows 1 target moving erratically at 12 px/s.",
    historicalDate: "Recorded 18 Jul 2026 (Anonymized Archive)",
    snapshotUrl: "",
    targetCount: 1,
    actualRiskScore: 32,
    correctTier: "LEVEL_1_ROUTINE",
    correctAction: "MARK_FALSE_POSITIVE",
    keyClues: [
      "Quadruped horizontal gait pattern on ground sensors",
      "No breach equipment or cutting implements detected",
      "Grazing stops and non-linear wander vector",
    ],
    learningTakeaway:
      "Avoid dispatching QRF for non-hostile animal intrusions. Mark as false positive to feed the edge model's active learning loop.",
  },
  {
    id: "DRILL-103",
    title: "Dual Riverbed Diversion Tactic",
    difficulty: "SPECIALIST",
    scenarioType: "COORDINATED_DIVERSION",
    briefing:
      "At 21:30 PM, simultaneous alerts fire 800m apart: a noisy flash decoy in Sector 1 while 3 silent targets cross the shallow river ford in Sector 2.",
    historicalDate: "Recorded 29 May 2026 (Anonymized Archive)",
    snapshotUrl: "",
    targetCount: 3,
    actualRiskScore: 88,
    correctTier: "LEVEL_3_CRITICAL",
    correctAction: "DISPATCH_DRONE",
    keyClues: [
      "Simultaneous alerts indicate coordinated diversion tactics",
      "Water displacement signature matches buoyant dry-bags",
      "High-risk corridor used during shift handover",
    ],
    learningTakeaway:
      "Deploy aerial drone Falcon-08 to verify both sectors simultaneously before committing ground vehicles to a potential decoy.",
  },
];

export const SimulationTrainingModal: React.FC<SimulationTrainingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [completedDrills, setCompletedDrills] = useState<number>(0);

  const scenario = TRAINING_SCENARIOS[currentScenarioIndex];

  const handleSelectAction = (action: string) => {
    if (hasSubmitted) return;
    setSelectedAction(action);
  };

  const handleSubmitTriage = () => {
    if (!selectedAction) return;
    setHasSubmitted(true);
    setCompletedDrills((prev) => prev + 1);

    const isCorrect = selectedAction === scenario.correctAction;
    if (isCorrect) {
      setScore((prev) => prev + 100);
      audioAnnunciator.playSonarPing();
      audioAnnunciator.speakTacticalAlert("Correct triage decision. Recruits protocol verified.");
    } else {
      audioAnnunciator.speakTacticalAlert("Triage discrepancy. Review protocol debrief.");
    }
  };

  const handleNextScenario = () => {
    if (currentScenarioIndex < TRAINING_SCENARIOS.length - 1) {
      setCurrentScenarioIndex((prev) => prev + 1);
      setSelectedAction(null);
      setHasSubmitted(false);
    }
  };

  const handleResetTraining = () => {
    setCurrentScenarioIndex(0);
    setSelectedAction(null);
    setHasSubmitted(false);
    setScore(0);
    setCompletedDrills(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">
                  RECRUIT SIMULATION & TRAINING DRILL
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700">
                  DRILL {currentScenarioIndex + 1} OF {TRAINING_SCENARIOS.length}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Practice triaging real anonymized border incidents before operating live feeds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded bg-slate-800 text-emerald-300 text-xs font-bold border border-slate-700">
              SCORE: {score} PTS
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Scenario Briefing Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-400 text-sm">{scenario.title}</span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold text-[10px]">
                DIFFICULTY: {scenario.difficulty}
              </span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              {scenario.briefing}
            </p>
            <div className="text-[10px] text-slate-500 pt-1">
              Historical Incident Archive // {scenario.historicalDate}
            </div>
          </div>

          {/* Key Clues on Frame */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              SENSOR TELEMETRY & OBSERVATIONAL CLUES:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {scenario.keyClues.map((clue, idx) => (
                <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="text-sky-400 font-bold">0{idx + 1}.</span>
                  <span>{clue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Choice Buttons */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              CHOOSE OPERATIONAL TRIAGE DECISION:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectAction("ESCALATE_QRF")}
                disabled={hasSubmitted}
                className={`p-3 rounded-lg border text-left transition font-bold ${
                  selectedAction === "ESCALATE_QRF"
                    ? "bg-red-600/30 text-red-200 border-red-500"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">ESCALATE TO QRF GROUND PATROL</div>
                <div className="text-[10px] text-slate-400 font-normal">Dispatch armed ground vehicle interception</div>
              </button>

              <button
                onClick={() => handleSelectAction("DISPATCH_DRONE")}
                disabled={hasSubmitted}
                className={`p-3 rounded-lg border text-left transition font-bold ${
                  selectedAction === "DISPATCH_DRONE"
                    ? "bg-sky-600/30 text-sky-200 border-sky-500"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">DISPATCH AERIAL DRONE (UAV-08)</div>
                <div className="text-[10px] text-slate-400 font-normal">Deploy top-down orthomosaic tracking</div>
              </button>

              <button
                onClick={() => handleSelectAction("MARK_FALSE_POSITIVE")}
                disabled={hasSubmitted}
                className={`p-3 rounded-lg border text-left transition font-bold ${
                  selectedAction === "MARK_FALSE_POSITIVE"
                    ? "bg-emerald-600/30 text-emerald-200 border-emerald-500"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">MARK AS FALSE POSITIVE</div>
                <div className="text-[10px] text-slate-400 font-normal">Retrain model on animal/environmental noise</div>
              </button>

              <button
                onClick={() => handleSelectAction("LOG_MONITORED")}
                disabled={hasSubmitted}
                className={`p-3 rounded-lg border text-left transition font-bold ${
                  selectedAction === "LOG_MONITORED"
                    ? "bg-purple-600/30 text-purple-200 border-purple-500"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">CONTINUE PASSIVE MONITORING</div>
                <div className="text-[10px] text-slate-400 font-normal">Log incident to ledger without dispatch</div>
              </button>
            </div>
          </div>

          {/* Submission and Debrief Screen */}
          {!hasSubmitted ? (
            <div className="pt-2">
              <button
                onClick={handleSubmitTriage}
                disabled={!selectedAction}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider transition"
              >
                CONFIRM TRIAGE DECISION
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                {selectedAction === scenario.correctAction ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>CORRECT DECISION (+100 PTS)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>INCORRECT DECISION // CORRECT ACTION: {scenario.correctAction}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-300 font-sans leading-relaxed">
                <strong>Instructor Debrief:</strong> {scenario.learningTakeaway}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handleResetTraining}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[10px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart Drills</span>
                </button>

                {currentScenarioIndex < TRAINING_SCENARIOS.length - 1 ? (
                  <button
                    onClick={handleNextScenario}
                    className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs flex items-center gap-1"
                  >
                    <span>Next Drill</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="px-3 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold text-xs flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>TRAINING CERTIFICATE UNLOCKED</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
