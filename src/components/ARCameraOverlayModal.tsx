import React, { useRef, useEffect, useState } from "react";
import {
  Camera,
  Compass,
  Crosshair,
  MapPin,
  X,
  Eye,
  ShieldAlert,
  Radio,
  Sliders,
  Maximize2,
  Navigation,
  Layers,
  Zap,
  Target,
  Shield,
  ZoomIn,
  Video,
} from "lucide-react";
import { ARMarker, ThreatTier } from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface ARCameraOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAlertCount: number;
}

const DEFAULT_AR_MARKERS: ARMarker[] = [
  {
    id: "ar-cctv-04",
    title: "CAM 04-ALPHA (Main Fence)",
    type: "CCTV_NODE",
    bearingDeg: 38,
    pitchDeg: -4,
    distanceMeters: 85,
    coordinates: "31.7824° N, 106.4428° W",
    cctvNodeId: "cam_04_alpha",
    description: "Tower mount 12m, 80° FOV IR thermal coverage sector",
  },
  {
    id: "ar-alert-breach",
    title: "INCURSION BREACH #182",
    type: "ALERT",
    bearingDeg: 44,
    pitchDeg: -2,
    distanceMeters: 110,
    tier: "LEVEL_3_CRITICAL",
    riskScore: 94,
    coordinates: "31.7828° N, 106.4421° W",
    description: "Group of 2 in dark camouflage traversing outer wire at 02:44 AM",
  },
  {
    id: "ar-patrol-echo",
    title: "PATROL ECHO-2 (BSF QRF)",
    type: "PATROL_UNIT",
    bearingDeg: 62,
    pitchDeg: 1,
    distanceMeters: 220,
    coordinates: "31.7810° N, 106.4405° W",
    description: "4-man quick reaction patrol unit mounted on all-terrain vehicle",
  },
  {
    id: "ar-fence-marker",
    title: "SECTOR 4 PERIMETER WIRE",
    type: "PERIMETER_FENCE",
    bearingDeg: 28,
    pitchDeg: -6,
    distanceMeters: 65,
    coordinates: "31.7820° N, 106.4435° W",
    description: "Sensorized concertina wire barrier with optical tripwire fiber",
  },
];

export const ARCameraOverlayModal: React.FC<ARCameraOverlayModalProps> = ({
  isOpen,
  onClose,
  activeAlertCount,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [heading, setHeading] = useState<number>(40); // User heading degrees
  const [pitch, setPitch] = useState<number>(0);
  const [rangeFilterMeters, setRangeFilterMeters] = useState<number>(300);
  const [selectedMarker, setSelectedMarker] = useState<ARMarker | null>(DEFAULT_AR_MARKERS[1]);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean>(false);
  const [hudScale, setHudScale] = useState<"standard" | "large">("large");

  // Attempt real device camera access, fallback to synthetic tactical scene if denied/unavailable
  useEffect(() => {
    if (!isOpen) return;

    let mediaStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "environment", // rear camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((stream) => {
          mediaStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setHasCameraAccess(true);
          }
        })
        .catch(() => {
          setHasCameraAccess(false);
        });
    }

    // Device orientation for AR compass if supported
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHeading(Math.round(e.alpha));
      }
      if (e.beta !== null) {
        setPitch(Math.round(e.beta - 45));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [isOpen]);

  // Canvas HUD rendering loop for AR overlay graphics
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;
      const scaleMultiplier = hudScale === "large" ? 1.25 : 1.0;

      ctx.clearRect(0, 0, w, h);

      // If no physical camera, draw synthetic tactical dark night terrain backdrop
      if (!hasCameraAccess) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#060b13");
        grad.addColorStop(0.55, "#0b1526");
        grad.addColorStop(1, "#020408");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Ground perspective grid
        ctx.strokeStyle = "rgba(14, 165, 233, 0.22)";
        ctx.lineWidth = 1.5;
        const horizonY = h * 0.55 + pitch * 3;

        for (let i = -12; i <= 12; i++) {
          ctx.beginPath();
          ctx.moveTo(w / 2 + i * 48, horizonY);
          ctx.lineTo(w / 2 + i * 190, h);
          ctx.stroke();
        }

        // Horizon line
        ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(w, horizonY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 1. Center Crosshair Reticle & Range Ring
      const cx = w / 2;
      const cy = h / 2;
      const reticleRadius = 40 * scaleMultiplier;

      // Outer Target Halo
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, reticleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Precision Dot
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair Lines with Mil-dots
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.lineWidth = 2;
      const crosshairSpan = 52 * scaleMultiplier;
      const innerGap = 14 * scaleMultiplier;

      ctx.beginPath();
      // Horizontal
      ctx.moveTo(cx - crosshairSpan, cy);
      ctx.lineTo(cx - innerGap, cy);
      ctx.moveTo(cx + innerGap, cy);
      ctx.lineTo(cx + crosshairSpan, cy);
      // Vertical
      ctx.moveTo(cx, cy - crosshairSpan);
      ctx.lineTo(cx, cy - innerGap);
      ctx.moveTo(cx, cy + innerGap);
      ctx.lineTo(cx, cy + crosshairSpan);
      ctx.stroke();

      // Reticle Azimuth Indicator
      ctx.font = `bold ${Math.round(12 * scaleMultiplier)}px "Geist Mono", monospace`;
      ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
      ctx.textAlign = "center";
      ctx.fillText(`FOV CENTER: ${heading}°`, cx, cy + reticleRadius + 22);

      // 2. Enhanced High-Legibility Compass Tape at Top
      const compassTapeWidth = Math.min(520 * scaleMultiplier, w - 80);
      const compassTapeHeight = 52 * scaleMultiplier;
      const compassY = 48 * scaleMultiplier;
      const compassBoxX = cx - compassTapeWidth / 2;
      const compassBoxY = 14;

      // Background plate
      ctx.fillStyle = "rgba(10, 15, 29, 0.92)";
      ctx.fillRect(compassBoxX, compassBoxY, compassTapeWidth, compassTapeHeight);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(compassBoxX, compassBoxY, compassTapeWidth, compassTapeHeight);

      // Current Heading Badge in Center
      const headingBoxWidth = 86 * scaleMultiplier;
      ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
      ctx.fillRect(cx - headingBoxWidth / 2, compassBoxY + compassTapeHeight - 1, headingBoxWidth, 24);
      ctx.strokeStyle = "#38bdf8";
      ctx.strokeRect(cx - headingBoxWidth / 2, compassBoxY + compassTapeHeight - 1, headingBoxWidth, 24);
      ctx.font = `bold ${Math.round(13 * scaleMultiplier)}px "Geist Mono", monospace`;
      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "center";
      ctx.fillText(`${heading}°`, cx, compassBoxY + compassTapeHeight + 16);

      // Compass ticks & labels
      for (let deg = heading - 45; deg <= heading + 45; deg += 5) {
        const normDeg = (deg + 360) % 360;
        const xOffset = cx + (deg - heading) * (5.5 * scaleMultiplier);
        if (xOffset >= compassBoxX + 16 && xOffset <= compassBoxX + compassTapeWidth - 16) {
          const isMajor = normDeg % 15 === 0;
          const isCardinal = normDeg % 45 === 0;

          ctx.strokeStyle = isCardinal
            ? "#38bdf8"
            : isMajor
            ? "rgba(56, 189, 248, 0.85)"
            : "rgba(148, 163, 184, 0.55)";
          ctx.lineWidth = isCardinal ? 2.5 : isMajor ? 1.8 : 1;

          ctx.beginPath();
          ctx.moveTo(xOffset, compassY - (isMajor ? 18 : 10));
          ctx.lineTo(xOffset, compassY);
          ctx.stroke();

          if (isMajor) {
            let label = `${normDeg}°`;
            let isTextCardinal = false;
            if (normDeg === 0) { label = "N"; isTextCardinal = true; }
            else if (normDeg === 45) { label = "NE"; isTextCardinal = true; }
            else if (normDeg === 90) { label = "E"; isTextCardinal = true; }
            else if (normDeg === 135) { label = "SE"; isTextCardinal = true; }
            else if (normDeg === 180) { label = "S"; isTextCardinal = true; }
            else if (normDeg === 225) { label = "SW"; isTextCardinal = true; }
            else if (normDeg === 270) { label = "W"; isTextCardinal = true; }
            else if (normDeg === 315) { label = "NW"; isTextCardinal = true; }

            ctx.font = isTextCardinal
              ? `bold ${Math.round(15 * scaleMultiplier)}px "Geist Mono", monospace`
              : `bold ${Math.round(11 * scaleMultiplier)}px "Geist Mono", monospace`;
            ctx.fillStyle = isTextCardinal ? "#38bdf8" : "#94a3b8";
            ctx.fillText(label, xOffset, compassY - 22);
          }
        }
      }

      // Compass center cursor arrow
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(cx, compassBoxY + 3);
      ctx.lineTo(cx - 8 * scaleMultiplier, compassBoxY + 16 * scaleMultiplier);
      ctx.lineTo(cx + 8 * scaleMultiplier, compassBoxY + 16 * scaleMultiplier);
      ctx.closePath();
      ctx.fill();

      // 3. Render Enhanced AR Markers in Field of View
      DEFAULT_AR_MARKERS.forEach((marker) => {
        if (marker.distanceMeters > rangeFilterMeters) return;

        // Calculate angular delta from current heading
        let deltaAzimuth = marker.bearingDeg - heading;
        while (deltaAzimuth > 180) deltaAzimuth -= 360;
        while (deltaAzimuth < -180) deltaAzimuth += 360;

        // Projection mapping: horizontal FOV ~60 degrees
        const px = cx + deltaAzimuth * 13;
        const py = cy + (marker.pitchDeg - pitch) * 9 + (marker.distanceMeters > 100 ? -20 : 20);

        // Check if marker is on screen
        if (px >= 60 && px <= w - 60 && py >= 80 && py <= h - 60) {
          const isSelected = selectedMarker?.id === marker.id;
          const isCritical = marker.tier === "LEVEL_3_CRITICAL";

          ctx.save();
          // Draw connecting anchor line down to terrain
          ctx.strokeStyle = isCritical ? "rgba(239, 68, 68, 0.9)" : "rgba(14, 165, 233, 0.7)";
          ctx.lineWidth = isSelected ? 2.5 : 1.8;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + 55);
          ctx.stroke();
          ctx.setLineDash([]);

          // Anchor base dot
          ctx.fillStyle = isCritical ? "#ef4444" : "#0ea5e9";
          ctx.beginPath();
          ctx.arc(px, py + 55, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Significantly Enhanced Marker Card Box
          const cardWidth = 220 * scaleMultiplier;
          const cardHeight = 72 * scaleMultiplier;
          const cardX = px - cardWidth / 2;
          const cardY = py - cardHeight - 8;

          // High contrast drop-shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(cardX + 4, cardY + 4, cardWidth, cardHeight);

          // Card Background
          ctx.fillStyle = isSelected
            ? "rgba(15, 23, 42, 0.97)"
            : "rgba(11, 19, 38, 0.92)";
          ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

          // Border & Highlighting
          ctx.strokeStyle = isCritical
            ? "#ef4444"
            : isSelected
            ? "#38bdf8"
            : "rgba(56, 189, 248, 0.6)";
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

          // Header accent banner
          ctx.fillStyle = isCritical
            ? "rgba(239, 68, 68, 0.25)"
            : isSelected
            ? "rgba(14, 165, 233, 0.25)"
            : "rgba(15, 23, 42, 0.6)";
          ctx.fillRect(cardX + 1, cardY + 1, cardWidth - 2, 24 * scaleMultiplier);

          // Marker Title
          ctx.font = `bold ${Math.round(12.5 * scaleMultiplier)}px "Geist Mono", monospace`;
          ctx.fillStyle = isCritical ? "#fca5a5" : "#ffffff";
          ctx.textAlign = "left";
          ctx.fillText(marker.title.slice(0, 22), cardX + 8, cardY + 17 * scaleMultiplier);

          // Details Row 1: Distance & Bearing with large high-contrast numbers
          ctx.font = `bold ${Math.round(11 * scaleMultiplier)}px "Geist Mono", monospace`;
          ctx.fillStyle = "#cbd5e1";
          ctx.fillText(`DIST: `, cardX + 8, cardY + 39 * scaleMultiplier);
          ctx.fillStyle = "#38bdf8";
          ctx.fillText(`${marker.distanceMeters}m`, cardX + 48 * scaleMultiplier, cardY + 39 * scaleMultiplier);

          ctx.fillStyle = "#cbd5e1";
          ctx.fillText(`BRG: `, cardX + 118 * scaleMultiplier, cardY + 39 * scaleMultiplier);
          ctx.fillStyle = "#38bdf8";
          ctx.fillText(`${marker.bearingDeg}°`, cardX + 152 * scaleMultiplier, cardY + 39 * scaleMultiplier);

          // Details Row 2: Status & Classification
          ctx.font = `bold ${Math.round(11 * scaleMultiplier)}px "Geist Mono", monospace`;
          if (isCritical) {
            ctx.fillStyle = "#ef4444";
            ctx.fillText(`CRITICAL INTRUSION (${marker.riskScore}/100)`, cardX + 8, cardY + 59 * scaleMultiplier);
          } else if (marker.type === "PATROL_UNIT") {
            ctx.fillStyle = "#10b981";
            ctx.fillText(`FRIENDLY PATROL [BSF]`, cardX + 8, cardY + 59 * scaleMultiplier);
          } else if (marker.type === "CCTV_NODE") {
            ctx.fillStyle = "#0ea5e9";
            ctx.fillText(`CCTV THERMAL NODE`, cardX + 8, cardY + 59 * scaleMultiplier);
          } else {
            ctx.fillStyle = "#f59e0b";
            ctx.fillText(`PERIMETER BARRIER WIRE`, cardX + 8, cardY + 59 * scaleMultiplier);
          }

          // Pulsing Ping Ring around Active Breach Marker
          if (isCritical) {
            const pulse = (Math.sin(tick * 0.12) + 1) * 10;
            ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(px, py - 30, 24 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Additional warning triangle icon
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(cardX + cardWidth - 16, cardY + 14 * scaleMultiplier, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      });

      // 4. Tactical HUD Telemetry Footer Banner
      const footerHeight = 36 * scaleMultiplier;
      ctx.fillStyle = "rgba(10, 15, 29, 0.9)";
      ctx.fillRect(0, h - footerHeight, w, footerHeight);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h - footerHeight);
      ctx.lineTo(w, h - footerHeight);
      ctx.stroke();

      ctx.font = `bold ${Math.round(13 * scaleMultiplier)}px "Geist Mono", monospace`;
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "left";
      ctx.fillText(
        `HEADING: ${heading}° // PITCH: ${pitch}° // FOV: 68° // MODE: TACTICAL HUD`,
        24,
        h - 13 * scaleMultiplier
      );
      ctx.textAlign = "right";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(
        `GPS: 31.7824° N, 106.4428° W // RANGE GATE: ${rangeFilterMeters}m`,
        w - 24,
        h - 13 * scaleMultiplier
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, heading, pitch, rangeFilterMeters, selectedMarker, hasCameraAccess, hudScale]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Hidden physical video element for rear camera feed */}
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />

        {/* Top Header Bar with Larger Icons & Enhanced Typography */}
        <div className="p-3.5 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-950/90 border border-sky-500/60 text-sky-400 shadow-sm">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-slate-100 text-base sm:text-lg tracking-wide">
                  TACTICAL AR CAMERA OVERLAY // FIELD-OF-VIEW
                </h3>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 shadow-sm ${
                    hasCameraAccess
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                      : "bg-amber-950 text-amber-300 border-amber-500"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${hasCameraAccess ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  {hasCameraAccess ? "LIVE REAR CAMERA FEED" : "SYNTHETIC AR NIGHT MATRIX"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Overlays real-time CCTV coverage cones, live alert markers, and patrol units onto physical camera view
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* HUD Scale Toggle */}
            <button
              onClick={() => {
                setHudScale((prev) => (prev === "large" ? "standard" : "large"));
                audioAnnunciator.playSonarPing();
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                hudScale === "large"
                  ? "bg-sky-600/30 text-sky-300 border-sky-400"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
              title="Toggle HUD Text & Icon Scale"
            >
              <ZoomIn className="w-4 h-4" />
              <span>{hudScale === "large" ? "HUD: ENLARGED (1.25x)" : "HUD: STANDARD"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Center AR Visualizer Canvas */}
        <div className="relative flex-1 bg-black overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
          />

          {/* Floating Selected Target Details Card (Larger, High-Contrast, Clear Icons) */}
          {selectedMarker && (
            <div className="absolute bottom-6 left-6 z-20 w-80 sm:w-96 p-4 rounded-xl bg-slate-900/98 border-2 border-sky-500/80 shadow-2xl backdrop-blur-md text-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  {selectedMarker.type === "ALERT" ? (
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                  ) : selectedMarker.type === "PATROL_UNIT" ? (
                    <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : selectedMarker.type === "CCTV_NODE" ? (
                    <Video className="w-5 h-5 text-sky-400 shrink-0" />
                  ) : (
                    <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-bold text-white text-base truncate">{selectedMarker.title}</span>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider shrink-0 ${
                    selectedMarker.tier === "LEVEL_3_CRITICAL"
                      ? "bg-red-950 text-red-200 border border-red-500"
                      : selectedMarker.type === "PATROL_UNIT"
                      ? "bg-emerald-950 text-emerald-200 border border-emerald-500"
                      : "bg-sky-950 text-sky-200 border border-sky-500"
                  }`}
                >
                  {selectedMarker.type}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedMarker.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 pt-1.5 border-t border-slate-800">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block uppercase">Distance</span>
                  <strong className="text-sky-300 text-sm">{selectedMarker.distanceMeters} meters</strong>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block uppercase">Bearing</span>
                  <strong className="text-sky-300 text-sm">{selectedMarker.bearingDeg}° Azimuth</strong>
                </div>
                <div className="col-span-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block uppercase">GPS Coordinates</span>
                  <strong className="text-slate-200 font-mono text-xs">{selectedMarker.coordinates}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Quick Heading Scrubber for manual rotation on desktop */}
          <div className="absolute top-5 right-5 z-20 flex flex-col items-end gap-2 bg-slate-950/90 p-3 rounded-xl border border-slate-700 text-xs shadow-xl backdrop-blur-sm">
            <span className="text-slate-200 font-bold uppercase flex items-center gap-1.5 text-xs">
              <Navigation className="w-4 h-4 text-sky-400" />
              Pan Heading: <strong className="text-sky-300 font-mono text-sm">{heading}°</strong>
            </span>
            <input
              type="range"
              min="0"
              max="359"
              value={heading}
              onChange={(e) => setHeading(parseInt(e.target.value))}
              className="w-44 accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Bottom Toolbar & Range Slider with Larger Controls */}
        <div className="p-3.5 bg-slate-900/98 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-sm shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 text-xs sm:text-sm uppercase font-bold flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              Range Gate:
            </span>
            <input
              type="range"
              min="50"
              max="500"
              step="25"
              value={rangeFilterMeters}
              onChange={(e) => setRangeFilterMeters(parseInt(e.target.value))}
              className="w-32 sm:w-40 accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <span className="font-bold text-amber-300 font-mono text-sm">{rangeFilterMeters}m</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-xs uppercase font-bold mr-1 hidden sm:inline">Focus Target:</span>
            {DEFAULT_AR_MARKERS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMarker(m);
                  setHeading(m.bearingDeg);
                  audioAnnunciator.playSonarPing();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                  selectedMarker?.id === m.id
                    ? "bg-sky-600/40 text-white border-sky-400 shadow-md ring-1 ring-sky-400"
                    : "bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white hover:border-slate-600"
                }`}
              >
                {m.type === "ALERT" ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                ) : m.type === "PATROL_UNIT" ? (
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{m.title.split(" ")[0]} ({m.distanceMeters}m)</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              audioAnnunciator.playSnapshotSound();
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg"
          >
            <Camera className="w-4.5 h-4.5" />
            <span>CAPTURE AR FRAME</span>
          </button>
        </div>
      </div>
    </div>
  );
};

