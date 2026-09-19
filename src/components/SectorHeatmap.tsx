import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Map,
  Layers,
  Flame,
  Filter,
  Eye,
  Crosshair,
  Sliders,
  RotateCcw,
  Zap,
  Info,
  Maximize2,
  Compass,
  Play,
  Pause,
  FastForward,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { SectorEvent, Point, ThreatTier, DispatchAsset } from "../types";

interface SectorHeatmapProps {
  events: SectorEvent[];
  restrictedPolygon: Point[];
  activeDispatches?: DispatchAsset[];
  onAddSimulatedEvent?: (event: SectorEvent) => void;
  onClearEvents?: () => void;
}

// Zone definitions for probability calculation across the sector
interface SectorZone {
  id: string;
  name: string;
  centroid: Point;
  radius: number;
  baseRisk: number;
  peakStartHour: number;
  peakEndHour: number;
  peakMultiplier: number;
  description: string;
}

const SECTOR_ZONES: SectorZone[] = [
  {
    id: "zone-fence",
    name: "Sector 4-Alpha Main Fence",
    centroid: { x: 420, y: 230 },
    radius: 95,
    baseRisk: 25,
    peakStartHour: 1.5, // 01:30 AM
    peakEndHour: 4.5,   // 04:30 AM
    peakMultiplier: 3.6,
    description: "Nocturnal stealth crossing hotspot along barbed wire fence",
  },
  {
    id: "zone-river",
    name: "River Basin / Shallow Ford",
    centroid: { x: 180, y: 320 },
    radius: 80,
    baseRisk: 20,
    peakStartHour: 19.5, // 07:30 PM
    peakEndHour: 22.5,   // 10:30 PM
    peakMultiplier: 3.4,
    description: "Dusk shift-change water incursion & riverbed ford",
  },
  {
    id: "zone-crest",
    name: "East Mountain Ridge / Pass",
    centroid: { x: 640, y: 130 },
    radius: 75,
    baseRisk: 15,
    peakStartHour: 4.5, // 04:30 AM
    peakEndHour: 7.5,   // 07:30 AM
    peakMultiplier: 3.2,
    description: "Dawn mountain fog infiltration corridor",
  },
  {
    id: "zone-highway",
    name: "Highway 9 Culvert Approach",
    centroid: { x: 580, y: 350 },
    radius: 70,
    baseRisk: 18,
    peakStartHour: 22.0, // 10:00 PM
    peakEndHour: 1.5,    // 01:30 AM
    peakMultiplier: 3.5,
    description: "Late-night vehicular drops & drainage culvert traverse",
  },
  {
    id: "zone-buffer",
    name: "North Grassland Buffer",
    centroid: { x: 260, y: 110 },
    radius: 85,
    baseRisk: 12,
    peakStartHour: 11.0, // 11:00 AM
    peakEndHour: 15.0,   // 03:00 PM
    peakMultiplier: 2.2,
    description: "Open daylight buffer corridor (high visual surveillance)",
  },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({
  events,
  restrictedPolygon,
  activeDispatches = [],
  onAddSimulatedEvent,
  onClearEvents,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Heatmap controls
  const [minRiskFilter, setMinRiskFilter] = useState<number>(40);
  const [blurRadius, setBlurRadius] = useState<number>(36);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showPolygon, setShowPolygon] = useState<boolean>(true);
  const [hoveredEvent, setHoveredEvent] = useState<SectorEvent | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // REPLAY SLIDER STATE
  const [replayHour, setReplayHour] = useState<number>(2.75); // 02:45 AM (Peak nocturnal)
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1); // 1x, 2x, 4x
  const [selectedDay, setSelectedDay] = useState<string>("Wed");

  // Replay animation loop
  useEffect(() => {
    if (!isPlayingReplay) return;
    const interval = setInterval(() => {
      setReplayHour((prev) => {
        const step = 0.08 * replaySpeed;
        const next = prev + step;
        return next >= 24 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlayingReplay, replaySpeed]);

  // Compute intrusion probability for each zone based on replayHour & day
  const zoneProbabilities = useMemo(() => {
    // Weekend slightly higher activity factor
    const isWeekend = selectedDay === "Sat" || selectedDay === "Sun" || selectedDay === "Fri";
    const dayFactor = isWeekend ? 1.15 : 1.0;

    return SECTOR_ZONES.map((zone) => {
      let timeProximity = 0;
      const h = replayHour;

      if (zone.peakStartHour < zone.peakEndHour) {
        if (h >= zone.peakStartHour && h <= zone.peakEndHour) {
          const mid = (zone.peakStartHour + zone.peakEndHour) / 2;
          const dist = Math.abs(h - mid);
          const maxDist = (zone.peakEndHour - zone.peakStartHour) / 2;
          timeProximity = 1 - dist / maxDist;
        } else {
          const distFromStart = Math.min(Math.abs(h - zone.peakStartHour), Math.abs(h - 24 - zone.peakStartHour));
          const distFromEnd = Math.min(Math.abs(h - zone.peakEndHour), Math.abs(h - 24 - zone.peakEndHour));
          const closest = Math.min(distFromStart, distFromEnd);
          timeProximity = Math.max(0, 0.3 - closest * 0.1);
        }
      } else {
        // Wraps over midnight (e.g. 22.0 to 1.5)
        const inWindow = h >= zone.peakStartHour || h <= zone.peakEndHour;
        if (inWindow) {
          timeProximity = 0.85;
        } else {
          timeProximity = 0.15;
        }
      }

      const calculatedRisk = Math.min(
        98,
        Math.round(zone.baseRisk + timeProximity * (zone.baseRisk * (zone.peakMultiplier - 1)) * dayFactor)
      );

      return {
        ...zone,
        currentProbability: calculatedRisk,
        isPeakActive: calculatedRisk >= 70,
      };
    });
  }, [replayHour, selectedDay]);

  // Format Replay Hour to HH:MM String
  const formatTimeStr = (hourVal: number) => {
    const totalMinutes = Math.floor(hourVal * 60);
    const hrs = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    const ampm = hrs >= 12 ? "PM" : "AM";
    const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} (${displayHrs}:${mins.toString().padStart(2, "0")} ${ampm})`;
  };

  // Filter events based on risk threshold
  const filteredEvents = useMemo(() => {
    return events.filter((e) => e.riskScore >= minRiskFilter);
  }, [events, minRiskFilter]);

  // Analytics summary
  const analytics = useMemo(() => {
    if (filteredEvents.length === 0) {
      return { count: 0, avgRisk: 0, peakQuadrant: "None", avgSpeed: 0 };
    }
    let totalRisk = 0;
    let totalSpeed = 0;
    const quadrantCounts: { [key: string]: number } = {
      "NW (North-West)": 0,
      "NE (North-East)": 0,
      "SW (South-West)": 0,
      "SE (South-East)": 0,
    };

    filteredEvents.forEach((ev) => {
      totalRisk += ev.riskScore;
      totalSpeed += ev.speedPxS || 45;
      const isEast = ev.x > 400;
      const isSouth = ev.y > 225;
      if (!isSouth && !isEast) quadrantCounts["NW (North-West)"]++;
      else if (!isSouth && isEast) quadrantCounts["NE (North-East)"]++;
      else if (isSouth && !isEast) quadrantCounts["SW (South-West)"]++;
      else quadrantCounts["SE (South-East)"]++;
    });

    let peakQuadrant = "NE (North-East)";
    let maxCount = -1;
    for (const [q, c] of Object.entries(quadrantCounts)) {
      if (c > maxCount) {
        maxCount = c;
        peakQuadrant = q;
      }
    }

    return {
      count: filteredEvents.length,
      avgRisk: Math.round(totalRisk / filteredEvents.length),
      avgSpeed: Math.round(totalSpeed / filteredEvents.length),
      peakQuadrant,
    };
  }, [filteredEvents]);

  // Draw Heatmap Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Clear background to deep tactical night slate
    ctx.fillStyle = "#070c14";
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Coordinate Grid if enabled
    if (showGrid) {
      ctx.strokeStyle = "rgba(30, 41, 59, 0.7)";
      ctx.lineWidth = 1;

      // Minor grid lines (every 50px)
      ctx.beginPath();
      for (let x = 50; x < w; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 50; y < h; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Major grid lines (every 100px)
      ctx.strokeStyle = "rgba(51, 65, 85, 0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 100; x < w; x += 100) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 100; y < h; y += 100) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Sector dividing crosshairs (X=400, Y=225)
      ctx.strokeStyle = "rgba(14, 165, 233, 0.25)";
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axis Labels
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(100, 116, 139, 0.8)";
      for (let x = 100; x < w; x += 100) {
        ctx.fillText(`${x}m`, x + 4, 14);
        ctx.fillText(`${x}m`, x + 4, h - 4);
      }
      for (let y = 100; y < h; y += 100) {
        ctx.fillText(`${y}m`, 4, y - 4);
        ctx.fillText(`${y}m`, w - 32, y - 4);
      }
    }

    // 3. Draw Restricted Perimeter Polygon
    if (showPolygon && restrictedPolygon.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(restrictedPolygon[0].x, restrictedPolygon[0].y);
      for (let i = 1; i < restrictedPolygon.length; i++) {
        ctx.lineTo(restrictedPolygon[i].x, restrictedPolygon[i].y);
      }
      ctx.closePath();

      // Subtle red perimeter zone tint
      ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
      ctx.fill();

      // Dashed restricted perimeter line
      ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label on perimeter
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.font = "9px monospace";
      ctx.fillText(
        "RESTRICTED ZONE 4-ALPHA BOUNDARY",
        restrictedPolygon[0].x + 8,
        restrictedPolygon[0].y - 6
      );
    }

    // 4. Render Heatmap Density Layer using offscreen gradient accumulation
    const heatCanvas = document.createElement("canvas");
    heatCanvas.width = w;
    heatCanvas.height = h;
    const heatCtx = heatCanvas.getContext("2d");

    if (heatCtx) {
      // 4a. RENDER DYNAMIC REPLAY TIMELINE PROBABILITY BLOBS
      zoneProbabilities.forEach((zp) => {
        const prob = zp.currentProbability;
        const radius = zp.radius * (0.8 + (prob / 100) * 0.7);
        const grad = heatCtx.createRadialGradient(zp.centroid.x, zp.centroid.y, 4, zp.centroid.x, zp.centroid.y, radius);

        const alpha = Math.min(Math.max((prob - 10) / 90, 0.15), 0.88);

        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.25, `rgba(255, 60, 0, ${alpha * 0.85})`);
        grad.addColorStop(0.55, `rgba(255, 180, 0, ${alpha * 0.55})`);
        grad.addColorStop(0.85, `rgba(14, 165, 233, ${alpha * 0.25})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        heatCtx.fillStyle = grad;
        heatCtx.beginPath();
        heatCtx.arc(zp.centroid.x, zp.centroid.y, radius, 0, Math.PI * 2);
        heatCtx.fill();
      });

      // 4b. Also accumulate real events
      filteredEvents.forEach((ev) => {
        const radius = blurRadius * (0.8 + (ev.riskScore / 100) * 0.6);
        const grad = heatCtx.createRadialGradient(ev.x, ev.y, 2, ev.x, ev.y, radius);
        const alpha = Math.min(Math.max((ev.riskScore - 30) / 70, 0.25), 0.9);

        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.2, `rgba(255, 80, 0, ${alpha * 0.85})`);
        grad.addColorStop(0.5, `rgba(255, 200, 0, ${alpha * 0.5})`);
        grad.addColorStop(0.8, `rgba(0, 180, 255, ${alpha * 0.2})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        heatCtx.fillStyle = grad;
        heatCtx.beginPath();
        heatCtx.arc(ev.x, ev.y, radius, 0, Math.PI * 2);
        heatCtx.fill();
      });

      // Colorize the heat accumulation map using tactical thermal palette
      const imgData = heatCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a > 0) {
          const norm = a / 255;
          if (norm < 0.25) {
            const t = norm / 0.25;
            data[i] = Math.round(10 * (1 - t) + 14 * t);
            data[i + 1] = Math.round(140 * (1 - t) + 165 * t);
            data[i + 2] = Math.round(230 * (1 - t) + 255 * t);
            data[i + 3] = Math.round(a * 0.5);
          } else if (norm < 0.55) {
            const t = (norm - 0.25) / 0.3;
            data[i] = Math.round(14 * (1 - t) + 245 * t);
            data[i + 1] = Math.round(165 * (1 - t) + 190 * t);
            data[i + 2] = Math.round(255 * (1 - t) + 15 * t);
            data[i + 3] = Math.round(a * 0.7);
          } else if (norm < 0.85) {
            const t = (norm - 0.55) / 0.3;
            data[i] = Math.round(245 * (1 - t) + 239 * t);
            data[i + 1] = Math.round(190 * (1 - t) + 40 * t);
            data[i + 2] = Math.round(15 * (1 - t) + 40 * t);
            data[i + 3] = Math.round(a * 0.85);
          } else {
            const t = (norm - 0.85) / 0.15;
            data[i] = Math.round(239 * (1 - t) + 255 * t);
            data[i + 1] = Math.round(40 * (1 - t) + 245 * t);
            data[i + 2] = Math.round(40 * (1 - t) + 235 * t);
            data[i + 3] = Math.round(a * 0.95);
          }
        }
      }

      heatCtx.putImageData(imgData, 0, 0);

      // Composite onto main canvas with 'screen' blending
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(heatCanvas, 0, 0);
      ctx.restore();
    }

    // 5. Draw Zone Centers & Real-Time Probability HUD Markers
    zoneProbabilities.forEach((zp) => {
      ctx.save();
      const isPeak = zp.currentProbability >= 70;
      const ringColor = isPeak ? "rgba(239, 68, 68, 0.8)" : "rgba(14, 165, 233, 0.6)";

      // Dashed zone border
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = isPeak ? 1.5 : 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(zp.centroid.x, zp.centroid.y, zp.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center crosshair
      ctx.fillStyle = isPeak ? "#ef4444" : "#0ea5e9";
      ctx.beginPath();
      ctx.arc(zp.centroid.x, zp.centroid.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Zone Name & Probability Tag
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(zp.centroid.x - 55, zp.centroid.y - 20, 110, 16);
      ctx.fillStyle = isPeak ? "#fca5a5" : "#bae6fd";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${zp.name.split(" ")[0]} ${zp.currentProbability}%`, zp.centroid.x, zp.centroid.y - 8);
      ctx.restore();
    });

    // 6. Draw Individual Incident Event Pings & Reticles
    filteredEvents.forEach((ev) => {
      const isHighRisk = ev.riskScore >= 70;
      const isCritical = ev.riskScore >= 85;

      ctx.strokeStyle = isCritical
        ? "rgba(239, 68, 68, 0.7)"
        : isHighRisk
        ? "rgba(245, 158, 11, 0.6)"
        : "rgba(16, 185, 129, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isCritical ? "#ef4444" : isHighRisk ? "#f59e0b" : "#10b981";
      ctx.beginPath();
      ctx.arc(ev.x, ev.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. Render Active Dispatch Asset Flight Vectors on Sector Grid
    if (activeDispatches && activeDispatches.length > 0) {
      activeDispatches.forEach((d) => {
        if (d.status === "STANDBY") return;
        const color = d.type === "UAV_DRONE" ? "#38bdf8" : "#22c55e";

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(d.currentCoords.x, d.currentCoords.y);
        ctx.lineTo(d.targetCoords.x, d.targetCoords.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(d.currentCoords.x, d.currentCoords.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(d.currentCoords.x, d.currentCoords.y, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(d.currentCoords.x + 8, d.currentCoords.y - 12, 60, 14);
        ctx.fillStyle = color;
        ctx.font = "bold 9px monospace";
        ctx.fillText(`${d.callsign} (${d.etaSeconds}s)`, d.currentCoords.x + 10, d.currentCoords.y - 2);
        ctx.restore();
      });
    }

    // 8. Highlight hovered event if any
    if (hoveredEvent) {
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoveredEvent.x, hoveredEvent.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoveredEvent.x - 20, hoveredEvent.y);
      ctx.lineTo(hoveredEvent.x + 20, hoveredEvent.y);
      ctx.moveTo(hoveredEvent.x, hoveredEvent.y - 20);
      ctx.lineTo(hoveredEvent.x, hoveredEvent.y + 20);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Replay Timeline Timestamp Watermark on Canvas
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(`REPLAY TIMELINE: ${selectedDay} ${formatTimeStr(replayHour)}`, 14, h - 14);

    if (mousePos) {
      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "right";
      ctx.fillText(`CURSOR: [${mousePos.x}m, ${mousePos.y}m]`, w - 14, h - 14);
    }
  }, [
    filteredEvents,
    restrictedPolygon,
    showGrid,
    showPolygon,
    blurRadius,
    hoveredEvent,
    mousePos,
    activeDispatches,
    zoneProbabilities,
    replayHour,
    selectedDay,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    setMousePos({ x, y });

    let closest: SectorEvent | null = null;
    let minDist = 18;
    for (const ev of filteredEvents) {
      const dist = Math.hypot(ev.x - x, ev.y - y);
      if (dist < minDist) {
        minDist = dist;
        closest = ev;
      }
    }
    setHoveredEvent(closest);
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
    setMousePos(null);
  };

  // Add sample breach ping
  const handleTriggerSampleBreach = () => {
    if (!onAddSimulatedEvent) return;
    const randomAngle = Math.random() * Math.PI * 2;
    const baseCenterX = 420;
    const baseCenterY = 240;
    const randRadius = 40 + Math.random() * 110;

    const x = Math.round(baseCenterX + Math.cos(randomAngle) * randRadius);
    const y = Math.round(baseCenterY + Math.sin(randomAngle) * randRadius * 0.7);
    const riskScore = Math.floor(75 + Math.random() * 24);

    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];

    const sampleEvent: SectorEvent = {
      id: `EVT-${Date.now().toString().slice(-5)}`,
      timestamp: timeStr,
      x: Math.max(20, Math.min(780, x)),
      y: Math.max(20, Math.min(430, y)),
      riskScore,
      tier: riskScore >= 70 ? "LEVEL_3_CRITICAL" : "LEVEL_2_ELEVATED",
      trackId: Math.floor(100 + Math.random() * 900),
      speedPxS: Math.round(70 + Math.random() * 60),
      label: "person",
      inRestrictedZone: true,
    };

    onAddSimulatedEvent(sampleEvent);
  };

  return (
    <div className="flex flex-col gap-2.5 font-mono text-xs">
      {/* 1. HEATMAP REPLAY TIMELINE SLIDER (KEY USER REQUIREMENT) */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  HEATMAP REPLAY SLIDER // TEMPORAL INTRUSION EVOLUTION
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/60 font-bold text-[10px]">
                  {selectedDay} {formatTimeStr(replayHour)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Drag slider to view how incursion probability density shifts across sectors by hour & day
              </p>
            </div>
          </div>

          {/* Days of week picker */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
            <Calendar className="w-3 h-3 text-slate-400 ml-1" />
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                  selectedDay === day
                    ? "bg-amber-600 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* The Interactive Slider Bar & Playback Controls */}
        <div className="flex items-center gap-3">
          {/* Play / Pause Toggle Button */}
          <button
            id="btn-replay-play-pause"
            onClick={() => setIsPlayingReplay(!isPlayingReplay)}
            className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition ${
              isPlayingReplay
                ? "bg-amber-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
            }`}
          >
            {isPlayingReplay ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>PLAY REPLAY</span>
              </>
            )}
          </button>

          {/* Speed Toggle */}
          <button
            id="btn-replay-speed"
            onClick={() => setReplaySpeed(replaySpeed === 1 ? 2 : replaySpeed === 2 ? 4 : 1)}
            className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1"
            title="Cycle replay playback speed"
          >
            <FastForward className="w-3 h-3 text-amber-400" />
            <span>{replaySpeed}x</span>
          </button>

          {/* Timeline Slider Input */}
          <div className="flex-1 flex flex-col gap-1">
            <input
              id="heatmap-timeline-slider"
              type="range"
              min="0"
              max="23.9"
              step="0.1"
              value={replayHour}
              onChange={(e) => {
                setReplayHour(parseFloat(e.target.value));
              }}
              className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer transition"
            />
            {/* Hour tick labels */}
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>00:00 (Midnight)</span>
              <span className="text-red-400 font-bold">03:00 (Curfew Peak)</span>
              <span>06:00 (Dawn Fog)</span>
              <span>12:00 (Noon)</span>
              <span className="text-amber-400 font-bold">20:00 (Dusk)</span>
              <span>23:59</span>
            </div>
          </div>
        </div>

        {/* Zone Intrusion Probability Scorecards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {zoneProbabilities.map((zp) => (
            <div
              key={zp.id}
              className={`p-2 rounded border text-[10px] transition-all ${
                zp.isPeakActive
                  ? "bg-red-950/40 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  : "bg-slate-900/80 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-300 truncate">{zp.name.split(" ")[0]}</span>
                <span className={zp.isPeakActive ? "text-red-400" : "text-sky-300"}>
                  {zp.currentProbability}%
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    zp.isPeakActive ? "bg-red-500" : zp.currentProbability >= 40 ? "bg-amber-500" : "bg-sky-500"
                  }`}
                  style={{ width: `${zp.currentProbability}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500 block truncate mt-1">
                {zp.isPeakActive ? "PEAK INTRUSION" : "MONITORED"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Top Toolbar & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-amber-400" />
            Risk Filter:
          </span>
          <button
            id="btn-filter-all"
            onClick={() => setMinRiskFilter(40)}
            className={`px-2 py-1 rounded text-[10px] transition ${
              minRiskFilter === 40
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            All Incidents (40+)
          </button>
          <button
            id="btn-filter-high"
            onClick={() => setMinRiskFilter(70)}
            className={`px-2 py-1 rounded text-[10px] transition ${
              minRiskFilter === 70
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            High Risk (70+)
          </button>
          <button
            id="btn-filter-critical"
            onClick={() => setMinRiskFilter(85)}
            className={`px-2 py-1 rounded text-[10px] transition ${
              minRiskFilter === 85
                ? "bg-red-600/20 text-red-300 border border-red-500/40 font-bold"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            Critical Breach (85+)
          </button>
        </div>

        {/* Right: Grid, Perimeter, and Simulation Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-toggle-grid"
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 transition ${
              showGrid ? "bg-slate-800 text-sky-300 border border-sky-500/30" : "bg-slate-900 text-slate-500"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{showGrid ? "GRID ON" : "GRID OFF"}</span>
          </button>

          <button
            id="btn-toggle-poly"
            onClick={() => setShowPolygon(!showPolygon)}
            className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 transition ${
              showPolygon ? "bg-slate-800 text-red-300 border border-red-500/30" : "bg-slate-900 text-slate-500"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>{showPolygon ? "ZONE ON" : "ZONE OFF"}</span>
          </button>

          <button
            id="btn-sim-breach-ping"
            onClick={handleTriggerSampleBreach}
            className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 flex items-center gap-1 text-[10px] font-bold transition"
            title="Inject a high-risk incursion ping to observe real-time heatmap intensification"
          >
            <Zap className="w-3 h-3 text-red-400" />
            <span>+ SIMULATE BREACH PING</span>
          </button>

          {onClearEvents && (
            <button
              id="btn-clear-heatmap-events"
              onClick={onClearEvents}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[10px]"
              title="Reset heatmap events"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Coordinate Heatmap Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-video shadow-2xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full object-contain cursor-crosshair"
        />

        {/* Top-Right HUD Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
          <div className="px-2.5 py-1 rounded bg-black/70 backdrop-blur border border-slate-700 text-slate-300 text-[10px] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>SECTOR 4-ALPHA // 800m × 450m</span>
          </div>
        </div>

        {/* Floating Tooltip when hovering over a hotspot event */}
        {hoveredEvent && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-sky-500/60 rounded-lg p-2.5 shadow-2xl backdrop-blur text-xs min-w-[200px]"
            style={{
              left: `${Math.min(Math.max((hoveredEvent.x / 800) * 100, 15), 75)}%`,
              top: `${Math.min(Math.max((hoveredEvent.y / 450) * 100, 15), 70)}%`,
              transform: "translate(-50%, -115%)",
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1.5">
              <span className="font-bold text-slate-200">
                INCIDENT {hoveredEvent.id}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  hoveredEvent.riskScore > 80
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 risk-pulse-critical"
                    : hoveredEvent.riskScore >= 70
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                RISK {hoveredEvent.riskScore}/100
              </span>
            </div>

            <div className="space-y-0.5 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>Sector Coordinate:</span>
                <strong className="text-sky-300">
                  [{hoveredEvent.x}m, {hoveredEvent.y}m]
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Target Track:</span>
                <strong className="text-slate-200">#{hoveredEvent.trackId || "101"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estimated Speed:</span>
                <strong className="text-slate-200">{hoveredEvent.speedPxS || 45} px/s</strong>
              </div>
              <div className="flex justify-between">
                <span>Restricted Zone:</span>
                <strong className={hoveredEvent.inRestrictedZone ? "text-red-400" : "text-emerald-400"}>
                  {hoveredEvent.inRestrictedZone ? "BREACHED" : "OUTER BUFFER"}
                </strong>
              </div>
              <div className="flex justify-between pt-0.5 text-slate-500">
                <span>Logged At:</span>
                <span>{hoveredEvent.timestamp}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Heatmap Thermal Scale & Analytics HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Events Plotted</span>
            <span className="text-base font-bold text-slate-200">{analytics.count}</span>
          </div>
          <Crosshair className="w-5 h-5 text-sky-400 opacity-60" />
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Avg Incursion Risk</span>
            <span className={`text-base font-bold ${analytics.avgRisk > 80 ? "text-red-400 risk-pulse-critical" : "text-amber-300"}`}>
              {analytics.avgRisk}/100
            </span>
          </div>
          <Flame className="w-5 h-5 text-amber-400 opacity-60" />
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Highest Density Hotspot</span>
            <span className="text-xs font-bold text-red-400">{analytics.peakQuadrant}</span>
          </div>
          <Map className="w-5 h-5 text-red-400 opacity-60" />
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase block mb-1">Thermal Density Legend</span>
          <div className="w-full h-2.5 rounded-full overflow-hidden flex" style={{
            background: "linear-gradient(to right, #0ea5e9, #10b981, #f59e0b, #ef4444, #ffffff)"
          }} />
          <div className="flex justify-between text-[9px] text-slate-500 mt-1">
            <span>Low (Cyan)</span>
            <span>Med (Yellow)</span>
            <span>High (Red)</span>
            <span>Hot (White)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
