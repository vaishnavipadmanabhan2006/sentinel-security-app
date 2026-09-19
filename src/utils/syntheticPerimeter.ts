import { Detection, Point, TimeOfDay, SpectralVisionMode, PerimeterStationId, DispatchAsset } from "../types";

export interface SimulatedEntity {
  id: number;
  label: "person" | "vehicle" | "backpack";
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  confidence: number;
  isFriendly?: boolean;
}

export class SyntheticBorderStream {
  private width: number;
  private height: number;
  private entities: SimulatedEntity[] = [];
  private scenario: string = "night_incursion";
  private frameCount: number = 0;
  private stationId: PerimeterStationId = "cam_04_alpha";
  private spectralMode: SpectralVisionMode = "optical";

  constructor(width: number = 800, height: number = 450) {
    this.width = width;
    this.height = height;
    this.setScenario("night_incursion");
  }

  public setStation(stationId: PerimeterStationId) {
    this.stationId = stationId;
  }

  public setSpectralMode(mode: SpectralVisionMode) {
    this.spectralMode = mode;
  }

  public setScenario(scenario: string) {
    this.scenario = scenario;
    this.frameCount = 0;
    this.entities = [];

    if (scenario === "night_incursion") {
      // Infiltrator entering restricted zone
      this.entities = [
        {
          id: 101,
          label: "person",
          x: this.width * 0.15,
          y: this.height * 0.55,
          vx: 2.2,
          vy: 0.4,
          width: 42,
          height: 94,
          confidence: 0.94,
        },
        {
          id: 102,
          label: "backpack",
          x: this.width * 0.17,
          y: this.height * 0.58,
          vx: 2.2,
          vy: 0.4,
          width: 22,
          height: 28,
          confidence: 0.88,
        },
      ];
    } else if (scenario === "friendly_patrol") {
      // Authorized Patrol Officer (ID 201)
      this.entities = [
        {
          id: 201,
          label: "person",
          x: this.width * 0.8,
          y: this.height * 0.5,
          vx: -1.4,
          vy: 0.1,
          width: 44,
          height: 98,
          confidence: 0.96,
          isFriendly: true,
        },
      ];
    } else if (scenario === "group_breach") {
      // Coordinated 3-person incursion group
      this.entities = [
        {
          id: 105,
          label: "person",
          x: this.width * 0.2,
          y: this.height * 0.45,
          vx: 3.5,
          vy: 0.5,
          width: 40,
          height: 90,
          confidence: 0.93,
        },
        {
          id: 106,
          label: "person",
          x: this.width * 0.16,
          y: this.height * 0.52,
          vx: 3.5,
          vy: 0.4,
          width: 42,
          height: 92,
          confidence: 0.95,
        },
        {
          id: 107,
          label: "person",
          x: this.width * 0.11,
          y: this.height * 0.58,
          vx: 3.4,
          vy: 0.35,
          width: 44,
          height: 96,
          confidence: 0.91,
        },
      ];
    } else if (scenario === "vehicle_approach") {
      // High-speed off-road vehicle approaching perimeter
      this.entities = [
        {
          id: 104,
          label: "vehicle",
          x: this.width * 0.05,
          y: this.height * 0.58,
          vx: 5.2,
          vy: 0.15,
          width: 140,
          height: 70,
          confidence: 0.97,
        },
        {
          id: 108,
          label: "person",
          x: this.width * 0.02,
          y: this.height * 0.65,
          vx: 4.6,
          vy: 0.2,
          width: 38,
          height: 85,
          confidence: 0.92,
        },
      ];
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    timeOfDay: TimeOfDay,
    isTampered: boolean = false,
    activeDispatches: DispatchAsset[] = []
  ): Detection[] {
    this.frameCount++;
    const w = this.width;
    const h = this.height;

    // Tamper simulation: blackout or frozen noise
    if (isTampered) {
      ctx.fillStyle = "#020408";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for (let i = 0; i < 500; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      return [];
    }

    // 1. RENDER TERRAIN BASED ON PERIMETER STATION
    this.renderStationTerrain(ctx, timeOfDay, w, h);

    // 2. RENDER ACTIVE DISPATCH ASSET VECTORS (UAV / GROUND PATROL)
    if (activeDispatches && activeDispatches.length > 0) {
      this.renderDispatchVectors(ctx, activeDispatches);
    }

    // 3. UPDATE & DRAW SIMULATED ENTITIES
    const activeDetections: Detection[] = [];

    this.entities.forEach((entity) => {
      // Move entity
      entity.x += entity.vx;
      entity.y += entity.vy;

      // Wrap around screen
      if (entity.x > w + 60) entity.x = -60;
      if (entity.x < -70) entity.x = w + 50;

      // Draw silhouette according to active Spectral Vision Mode
      ctx.save();
      if (entity.label === "person") {
        this.drawPersonSilhouette(ctx, entity.x, entity.y, entity.width, entity.height, entity.isFriendly, timeOfDay);
      } else if (entity.label === "vehicle") {
        this.drawVehicleSilhouette(ctx, entity.x, entity.y, entity.width, entity.height, timeOfDay);
      } else {
        ctx.fillStyle = this.spectralMode === "flir_white_hot" ? "#ffffff" : "#1e293b";
        ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
      }
      ctx.restore();

      const cx = Math.round(entity.x + entity.width / 2);
      const cy = Math.round(entity.y + entity.height / 2);
      const speed = Math.hypot(entity.vx, entity.vy) * 28;

      activeDetections.push({
        id: entity.id,
        label: entity.label,
        confidence: entity.confidence,
        bbox: [Math.round(entity.x), Math.round(entity.y), Math.round(entity.x + entity.width), Math.round(entity.y + entity.height)],
        center: [cx, cy],
        isPerson: entity.label === "person",
        velocityPxS: speed,
      });
    });

    // 4. APPLY SPECTRAL POST-PROCESSING SHADER OVERLAYS
    this.applySpectralOverlay(ctx, w, h);

    return activeDetections;
  }

  private renderStationTerrain(ctx: CanvasRenderingContext2D, timeOfDay: TimeOfDay, w: number, h: number) {
    if (this.stationId === "cam_08_drone") {
      // Aerial Top-Down Drone loiter view
      this.renderDroneAerialView(ctx, timeOfDay, w, h);
    } else if (this.stationId === "cam_01_ridge") {
      // High Mountain Valley Lookout
      this.renderMountainRidgeView(ctx, timeOfDay, w, h);
    } else if (this.stationId === "cam_02_river") {
      // Rio Bravo Lowland Crossing
      this.renderRiverBasinView(ctx, timeOfDay, w, h);
    } else {
      // Standard Cam 04 Alpha - North Perimeter Fence & Tower
      this.renderPerimeterFenceView(ctx, timeOfDay, w, h);
    }
  }

  private renderPerimeterFenceView(ctx: CanvasRenderingContext2D, timeOfDay: TimeOfDay, w: number, h: number) {
    // Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    if (timeOfDay === "night") {
      skyGradient.addColorStop(0, "#030712");
      skyGradient.addColorStop(1, "#0f172a");
    } else if (timeOfDay === "twilight") {
      skyGradient.addColorStop(0, "#1e1b4b");
      skyGradient.addColorStop(0.6, "#431407");
      skyGradient.addColorStop(1, "#7c2d12");
    } else {
      skyGradient.addColorStop(0, "#38bdf8");
      skyGradient.addColorStop(1, "#bae6fd");
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h * 0.55);

    // Stars at night
    if (timeOfDay === "night") {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 99 + 1) * 10000) % w;
        const sy = (Math.cos(i * 33 + 1) * 10000) % (h * 0.4);
        ctx.fillRect(Math.abs(sx), Math.abs(sy), 1.5, 1.5);
      }
    }

    // Mountain silhouettes in background
    ctx.fillStyle = timeOfDay === "night" ? "#090d16" : timeOfDay === "twilight" ? "#1f1d2b" : "#475569";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.2, h * 0.38);
    ctx.lineTo(w * 0.45, h * 0.48);
    ctx.lineTo(w * 0.7, h * 0.34);
    ctx.lineTo(w * 0.9, h * 0.45);
    ctx.lineTo(w, h * 0.4);
    ctx.lineTo(w, h * 0.55);
    ctx.closePath();
    ctx.fill();

    // Ground terrain / desert & border road
    const groundGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    if (timeOfDay === "night") {
      groundGrad.addColorStop(0, "#0b121f");
      groundGrad.addColorStop(1, "#030712");
    } else if (timeOfDay === "twilight") {
      groundGrad.addColorStop(0, "#331a15");
      groundGrad.addColorStop(1, "#180e0c");
    } else {
      groundGrad.addColorStop(0, "#d97706");
      groundGrad.addColorStop(1, "#78350f");
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // Border security fence line with posts
    ctx.strokeStyle = timeOfDay === "night" ? "#1e293b" : "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    ctx.lineTo(w, h * 0.6);
    ctx.stroke();

    for (let x = 10; x < w; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.52);
      ctx.lineTo(x, h * 0.68);
      ctx.stroke();
      if (x + 35 < w) {
        ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
        ctx.beginPath();
        ctx.moveTo(x, h * 0.53);
        ctx.lineTo(x + 35, h * 0.67);
        ctx.moveTo(x, h * 0.67);
        ctx.lineTo(x + 35, h * 0.53);
        ctx.stroke();
      }
    }

    // Border Surveillance Sensor Tower on left
    ctx.fillStyle = timeOfDay === "night" ? "#0f172a" : "#1e293b";
    ctx.fillRect(30, h * 0.25, 14, h * 0.45);
    ctx.fillStyle = timeOfDay === "night" ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)";
    ctx.beginPath();
    ctx.arc(37, h * 0.25, 4, 0, Math.PI * 2);
    ctx.fill();

    // Night surveillance spotlight / thermal scan cone
    if (timeOfDay === "night") {
      const cone = ctx.createRadialGradient(37, h * 0.25, 10, w * 0.45, h * 0.7, 240);
      cone.addColorStop(0, "rgba(56, 189, 248, 0.15)");
      cone.addColorStop(0.7, "rgba(56, 189, 248, 0.03)");
      cone.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(37, h * 0.25);
      ctx.lineTo(w * 0.15, h);
      ctx.lineTo(w * 0.75, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderMountainRidgeView(ctx: CanvasRenderingContext2D, timeOfDay: TimeOfDay, w: number, h: number) {
    // Rocky Canyon / Ridge elevation
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    skyGrad.addColorStop(0, timeOfDay === "night" ? "#020617" : "#0284c7");
    skyGrad.addColorStop(1, timeOfDay === "night" ? "#0f172a" : "#7dd3fc");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Jagged Crags & Mountain Bluffs
    ctx.fillStyle = timeOfDay === "night" ? "#0a0f1d" : "#334155";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.lineTo(w * 0.3, h * 0.2);
    ctx.lineTo(w * 0.5, h * 0.3);
    ctx.lineTo(w * 0.8, h * 0.15);
    ctx.lineTo(w, h * 0.3);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Forefront Valley floor
    ctx.fillStyle = timeOfDay === "night" ? "#050914" : "#1e293b";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.4, h * 0.5);
    ctx.lineTo(w, h * 0.58);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Thermal beacon at ridge post
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.15, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderRiverBasinView(ctx: CanvasRenderingContext2D, timeOfDay: TimeOfDay, w: number, h: number) {
    // Distant bank
    ctx.fillStyle = timeOfDay === "night" ? "#020617" : "#0369a1";
    ctx.fillRect(0, 0, w, h * 0.45);

    // River Water with ripples
    const waterGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
    if (timeOfDay === "night") {
      waterGrad.addColorStop(0, "#091e3a");
      waterGrad.addColorStop(0.6, "#040d1a");
      waterGrad.addColorStop(1, "#020617");
    } else {
      waterGrad.addColorStop(0, "#0284c7");
      waterGrad.addColorStop(0.5, "#0369a1");
      waterGrad.addColorStop(1, "#075985");
    }
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    // River Buoy Boundary Line (Floating International Border Barrier)
    ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.lineTo(w, h * 0.62);
    ctx.stroke();
    ctx.setLineDash([]);

    // Water Buoy Spheres
    for (let bx = 30; bx < w; bx += 70) {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(bx, h * 0.62, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderDroneAerialView(ctx: CanvasRenderingContext2D, timeOfDay: TimeOfDay, w: number, h: number) {
    // Top-down Orthomosaic grid view
    ctx.fillStyle = timeOfDay === "night" ? "#030712" : "#1e293b";
    ctx.fillRect(0, 0, w, h);

    // Top-down road network
    ctx.fillStyle = timeOfDay === "night" ? "#0f172a" : "#334155";
    ctx.fillRect(w * 0.45, 0, 70, h); // North-south patrol road
    ctx.fillRect(0, h * 0.6, w, 50); // East-west buffer track

    // Perimeter boundary line
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    ctx.lineTo(w, h * 0.45);
    ctx.stroke();

    // Rotating UAV compass rose reticle
    const angle = this.frameCount * 0.008;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.stroke();

    // Heading needle
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 120, cy + Math.sin(angle) * 120);
    ctx.stroke();
  }

  private renderDispatchVectors(ctx: CanvasRenderingContext2D, dispatches: DispatchAsset[]) {
    dispatches.forEach((d) => {
      if (d.status === "STANDBY") return;

      const isUav = d.type === "UAV_DRONE";
      const color = isUav ? "#38bdf8" : "#22c55e";

      // Draw dashed vector trajectory line
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(d.currentCoords.x, d.currentCoords.y);
      ctx.lineTo(d.targetCoords.x, d.targetCoords.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Asset Icon (Drone quadcopter or ground humvee)
      const ax = d.currentCoords.x;
      const ay = d.currentCoords.y;

      if (isUav) {
        // Drone quadcopter icon
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ax, ay, 6, 0, Math.PI * 2);
        ctx.fill();

        // Propellers
        const propPhase = (this.frameCount * 0.4) % (Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1.5;
        [-10, 10].forEach((dx) => {
          [-8, 8].forEach((dy) => {
            ctx.beginPath();
            ctx.arc(ax + dx, ay + dy, 4, 0, Math.PI * 2);
            ctx.stroke();
          });
        });
      } else {
        // Ground QRF Vehicle
        ctx.fillStyle = color;
        ctx.fillRect(ax - 12, ay - 6, 24, 12);
      }

      // Tag Label
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(ax - 28, ay - 24, 60, 15);
      ctx.fillStyle = color;
      ctx.font = "bold 9px monospace";
      ctx.fillText(`${d.callsign} (${d.etaSeconds}s)`, ax - 24, ay - 13);

      ctx.restore();
    });
  }

  private drawPersonSilhouette(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isFriendly: boolean = false,
    timeOfDay: TimeOfDay
  ) {
    const cx = x + w / 2;
    const legPhase = Math.sin(this.frameCount * 0.18);

    // Color based on spectral mode
    if (this.spectralMode === "flir_thermal") {
      // Ironbow heat signature: Body glows bright orange/white hot
      ctx.fillStyle = isFriendly ? "#38bdf8" : "#ffedd5";
    } else if (this.spectralMode === "flir_white_hot") {
      // White hot thermal: intense pure white luminescence
      ctx.fillStyle = isFriendly ? "#93c5fd" : "#ffffff";
    } else if (this.spectralMode === "nvg_green") {
      // Night vision: phosphorescent green
      ctx.fillStyle = isFriendly ? "#4ade80" : "#22c55e";
    } else {
      // Optical standard
      ctx.fillStyle = isFriendly
        ? "#1e40af"
        : timeOfDay === "night"
        ? "rgba(15, 23, 42, 0.95)"
        : "#334155";
    }

    // Head
    ctx.beginPath();
    ctx.arc(cx, y + 14, 10, 0, Math.PI * 2);
    ctx.fill();

    // Friendly beret/helmet tag
    if (isFriendly) {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(cx, y + 8, 5, 0, Math.PI);
      ctx.fill();
    }

    // Torso / tactical vest
    ctx.fillRect(cx - 10, y + 24, 20, 36);

    // Arms
    ctx.fillRect(cx - 16, y + 26, 6, 28);
    ctx.fillRect(cx + 10, y + 26, 6, 28);

    // Legs with running animation
    ctx.beginPath();
    ctx.moveTo(cx - 5, y + 60);
    ctx.lineTo(cx - 8 + legPhase * 8, y + h);
    ctx.lineWidth = 5;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 5, y + 60);
    ctx.lineTo(cx + 8 - legPhase * 8, y + h);
    ctx.stroke();
  }

  private drawVehicleSilhouette(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    timeOfDay: TimeOfDay
  ) {
    if (this.spectralMode === "flir_thermal") {
      ctx.fillStyle = "#fb923c"; // engine hot
    } else if (this.spectralMode === "flir_white_hot") {
      ctx.fillStyle = "#ffffff";
    } else if (this.spectralMode === "nvg_green") {
      ctx.fillStyle = "#16a34a";
    } else {
      ctx.fillStyle = timeOfDay === "night" ? "#0f172a" : "#334155";
    }

    // Body
    ctx.fillRect(x, y + h * 0.35, w, h * 0.45);
    // Cabin
    ctx.fillRect(x + w * 0.25, y, w * 0.45, h * 0.4);
    // Wheels
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(x + w * 0.25, y + h * 0.8, 14, 0, Math.PI * 2);
    ctx.arc(x + w * 0.75, y + h * 0.8, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  private applySpectralOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.spectralMode === "flir_thermal") {
      // Ironbow thermal gradient wash
      ctx.fillStyle = "rgba(79, 70, 229, 0.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(249, 115, 22, 0.08)";
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
    } else if (this.spectralMode === "flir_white_hot") {
      // High contrast monochrome thermal
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, w, h);
    } else if (this.spectralMode === "nvg_green") {
      // Phosphor green wash + CRT raster scanlines
      ctx.fillStyle = "rgba(34, 197, 94, 0.16)";
      ctx.fillRect(0, 0, w, h);

      // Raster scanlines
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1.5);
      }
    } else if (this.spectralMode === "lidar_depth") {
      // LIDAR wireframe contour mesh
      ctx.strokeStyle = "rgba(6, 182, 212, 0.22)";
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // LIDAR range tags
      ctx.font = "9px monospace";
      ctx.fillStyle = "#22d3ee";
      ctx.fillText("LIDAR DEPTH: 142m // RANGE RESOLUTION: 0.05m", 14, h - 35);
      ctx.fillText("AZIMUTH: 318.4° // ELEV: +14.2m", 14, h - 22);
    }
  }
}
