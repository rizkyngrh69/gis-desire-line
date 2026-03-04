"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer, PathLayer, IconLayer, TextLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "react-map-gl/maplibre";
import type { MapViewState, PickingInfo } from "@deck.gl/core";
import type { ArcDatum, ArrowStyle, FlowDirection, LineWeightMode } from "@/types";

const VIEW_STATE_3D: MapViewState = {
  longitude: 112.0,
  latitude: -6.8,
  zoom: 5.5,
  pitch: 45,
  bearing: 0,
  transitionDuration: 600,
};

const VIEW_STATE_2D: MapViewState = {
  longitude: 112.0,
  latitude: -6.8,
  zoom: 5.5,
  pitch: 0,
  bearing: 0,
  transitionDuration: 600,
};

const BASEMAPS = [
  { id: "dark",       label: "Dark",         url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  { id: "dark-clean", label: "Dark Clean",   url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json" },
  { id: "light",      label: "Light",        url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  { id: "light-clean",label: "Light Clean",  url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json" },
  { id: "voyager",    label: "Voyager",      url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
  { id: "blank",      label: "Blank",        url: "https://demotiles.maplibre.org/style.json" },
] as const;
type BasemapId = (typeof BASEMAPS)[number]["id"];
type DownloadFormat = "png" | "jpg" | "webp";

interface TooltipData {
  x: number;
  y: number;
  from: string;
  to: string;
  passengers: number;
  rank: number;
  direction: FlowDirection;
}

const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><polygon points="32,4 56,60 32,46 8,60" fill="white"/></svg>`;
const ARROW_ICON_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ARROW_SVG)}`;
const ARROW_ICON_MAPPING = { arrow: { x: 0, y: 0, width: 64, height: 64, mask: true } };

const DIRECTION_COLORS: Record<FlowDirection, [number, number, number]> = {
  KELUAR: [251, 146, 60],   // orange
  MASUK:  [52, 211, 153],   // emerald
  NONE:   [99, 102, 241],   // indigo
};

function getBearing(from: [number, number], to: [number, number]): number {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return -(Math.atan2(dx, dy) * (180 / Math.PI));
}

function perpOffset(
  from: [number, number],
  to: [number, number],
  scale: number
): [number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return [(-dy / len) * scale, (dx / len) * scale];
}

function buildCurvedPath(
  from: [number, number],
  to: [number, number],
  side: number,
  segments = 20
): [number, number][] {
  const cFrom = from[0] <= to[0] ? from : to;
  const cTo = from[0] <= to[0] ? to : from;
  const mx = (cFrom[0] + cTo[0]) / 2;
  const my = (cFrom[1] + cTo[1]) / 2;
  const dist = Math.sqrt((cTo[0] - cFrom[0]) ** 2 + (cTo[1] - cFrom[1]) ** 2);
  const bulge = Math.max(0.08, dist * 0.15) * side;
  const [px, py] = perpOffset(cFrom, cTo, bulge);
  const cx = mx + px;
  const cy = my + py;
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const x = u * u * from[0] + 2 * u * t * cx + t * t * to[0];
    const y = u * u * from[1] + 2 * u * t * cy + t * t * to[1];
    pts.push([x, y]);
  }
  return pts;
}

interface DesireLineMapProps {
  arcs: ArcDatum[];
  maxArcWidth: number;
  lineWeightMode: LineWeightMode;
  arrowStyle: ArrowStyle;
}

export default function DesireLineMap({ arcs, maxArcWidth, lineWeightMode, arrowStyle }: DesireLineMapProps) {
  const [mounted, setMounted] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [viewState, setViewState] = useState<MapViewState>(VIEW_STATE_3D);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [basemapId, setBasemapId] = useState<BasemapId>("dark");
  const mapStyle = BASEMAPS.find((b) => b.id === basemapId)!.url;
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [previewData, setPreviewData] = useState<{ mapUrl: string; format: DownloadFormat; canvasW: number; canvasH: number } | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, { x: number; y: number; scale: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const deckSnapshotRef = useRef<HTMLCanvasElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const sectionDragRef = useRef<{ key: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const sectionResizeRef = useRef<{ key: string; sx: number; os: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!showDownloadMenu) return;
    const timer = setTimeout(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-download-menu]")) return;
        setShowDownloadMenu(false);
      };
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }, 0);
    return () => clearTimeout(timer);
  }, [showDownloadMenu]);

  function toggleView(): void {
    const next = !is3D;
    setIs3D(next);
    setViewState((prev) => ({
      ...prev,
      ...(next ? VIEW_STATE_3D : VIEW_STATE_2D),
    }));
  }

  const maxPassengers = useMemo(
    () => Math.max(...arcs.map((a) => a.totalPassengers), 1),
    [arcs]
  );

  const maxRankByDir = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of arcs) {
      const dir = a.direction ?? "NONE";
      map[dir] = Math.max(map[dir] ?? 0, a.rank);
    }
    return map;
  }, [arcs]);

  const cityNodes = useMemo(() => {
    const seen: Record<string, { name: string; coordinates: [number, number] }> = {};
    for (const arc of arcs) {
      if (!seen[arc.from.name]) seen[arc.from.name] = arc.from;
      if (!seen[arc.to.name])   seen[arc.to.name]   = arc.to;
    }
    return Object.values(seen);
  }, [arcs]);

  const hoverHandler = (info: PickingInfo) => {
    if (info.object) {
      setTooltip({
        x: info.x,
        y: info.y,
        from: info.object.from.name,
        to: info.object.to.name,
        passengers: info.object.totalPassengers,
        rank: info.object.rank,
        direction: info.object.direction ?? "NONE",
      });
    } else {
      setTooltip(null);
    }
  };

  const rankWeight = (rank: number, dir: string): number => {
    const maxR = maxRankByDir[dir] ?? rank;
    if (maxR <= 1) return 1;
    return 1 - ((rank - 1) / (maxR - 1)) * 0.85;
  };

  const resolveWidth = (d: ArcDatum) =>
    lineWeightMode === "weighted"
      ? Math.max(1, rankWeight(d.rank, d.direction ?? "NONE") * maxArcWidth)
      : 2;

  const resolveAlpha = (d: ArcDatum) =>
    lineWeightMode === "weighted"
      ? Math.round(60 + rankWeight(d.rank, d.direction ?? "NONE") * 185)
      : 180;

  const resolveColor = (
    d: ArcDatum
  ): [number, number, number, number] => {
    const [r, g, b] = DIRECTION_COLORS[d.direction ?? "NONE"];
    return [r, g, b, resolveAlpha(d)];
  };

  const layers = useMemo(() => {
    const trigger = { lineWeightMode, maxArcWidth, maxPassengers };

    const dirSide = (d: ArcDatum) => d.direction === "KELUAR" ? 1 : d.direction === "MASUK" ? -1 : 0;

    const lineLayer = is3D
      ? new ArcLayer<ArcDatum>({
          id: "desire-lines-arc",
          data: arcs,
          pickable: true,
          getWidth: (d) => resolveWidth(d),
          getSourcePosition: (d) => d.from.coordinates,
          getTargetPosition: (d) => d.to.coordinates,
          getHeight: (d) => d.direction === "KELUAR" ? 1.0 : d.direction === "MASUK" ? 0.6 : 0.8,
          getSourceColor: (d) => resolveColor(d),
          getTargetColor: (d) => resolveColor(d),
          onHover: hoverHandler,
          updateTriggers: {
            getWidth: trigger,
            getSourceColor: trigger,
            getTargetColor: trigger,
          },
        })
      : new PathLayer<ArcDatum>({
          id: "desire-lines-curved",
          data: arcs,
          pickable: true,
          getPath: (d) => buildCurvedPath(d.from.coordinates, d.to.coordinates, dirSide(d)),
          getWidth: (d) => resolveWidth(d),
          getColor: (d) => resolveColor(d),
          widthUnits: "pixels",
          widthMinPixels: 1,
          jointRounded: true,
          capRounded: true,
          onHover: hoverHandler,
          updateTriggers: {
            getPath: trigger,
            getWidth: trigger,
            getColor: trigger,
          },
        });

    const arrowLayer =
      arrowStyle === "arrowhead"
        ? new IconLayer<ArcDatum>({
            id: "desire-lines-arrows",
            data: arcs,
            pickable: false,
            billboard: true,
            iconAtlas: ARROW_ICON_URL,
            iconMapping: ARROW_ICON_MAPPING,
            getIcon: () => "arrow",
            getPosition: (d) => d.to.coordinates,
            getSize: lineWeightMode === "weighted"
              ? (d) => Math.max(18, rankWeight(d.rank, d.direction ?? "NONE") * 40)
              : 22,
            sizeMinPixels: 16,
            getColor: (d) => resolveColor(d),
            getAngle: (d) => getBearing(d.from.coordinates, d.to.coordinates),
            updateTriggers: {
              getSize: trigger,
              getColor: trigger,
              getAngle: {},
            },
          })
        : null;

    const nodeCircleLayer = cityNodes.length > 0
      ? new ScatterplotLayer({
          id: "city-nodes",
          data: cityNodes,
          getPosition: (d) => d.coordinates,
          getRadius: 6000,
          radiusUnits: "meters",
          radiusMinPixels: 5,
          radiusMaxPixels: 22,
          getFillColor: [255, 240, 180, 60],
          getLineColor: [255, 235, 160, 220],
          stroked: true,
          filled: true,
          lineWidthMinPixels: 1.5,
          pickable: false,
        })
      : null;

    const labelLayer = showLabels && cityNodes.length > 0
      ? new TextLayer({
          id: "city-labels",
          data: cityNodes,
          getPosition: (d) => d.coordinates,
          getText: (d) => d.name,
          getSize: 12,
          getColor: [255, 255, 255, 210],
          getBackgroundColor: [15, 17, 23, 180],
          background: true,
          backgroundPadding: [3, 2, 3, 2],
          getBorderColor: [42, 45, 62, 200],
          getBorderWidth: 1,
          fontFamily: '"Inter", system-ui, sans-serif',
          fontWeight: 600,
          getTextAnchor: "middle",
          getAlignmentBaseline: "bottom",
          getPixelOffset: [0, -6],
          pickable: false,
          billboard: true,
          parameters: { depthTest: false },
        })
      : null;

    return [lineLayer, arrowLayer, nodeCircleLayer, labelLayer].filter(Boolean);
  }, [arcs, maxPassengers, maxRankByDir, maxArcWidth, is3D, lineWeightMode, arrowStyle, showLabels, cityNodes]);

  function drawExportTable(
    ctx: CanvasRenderingContext2D,
    sections: Record<string, { x: number; y: number; scale: number }>
  ): void {
    const isLight = basemapId === "light" || basemapId === "light-clean" || basemapId === "voyager";
    const theme = isLight
      ? { bg: "rgba(255,255,255,0.93)", border: "rgba(200,205,220,0.9)", headerBg: "rgba(0,0,0,0.04)", headerText: "#1e1f2e", rankText: "#6b7280", bodyText: "#111827", rowAlt: "rgba(240,242,250,0.7)", divider: "rgba(200,205,220,0.5)" }
      : { bg: "rgba(26,29,46,0.92)", border: "rgba(42,45,62,0.9)", headerBg: "rgba(255,255,255,0.04)", headerText: "rgba(255,255,255,0.9)", rankText: "rgba(139,143,168,0.9)", bodyText: "rgba(255,255,255,0.85)", rowAlt: "rgba(255,255,255,0.03)", divider: "rgba(42,45,62,0.6)" };

    const allRows: Record<string, ArcDatum[]> = {
      KELUAR: [...arcs].filter(a => a.direction === "KELUAR").sort((a, b) => a.rank - b.rank).slice(0, 10),
      MASUK:  [...arcs].filter(a => a.direction === "MASUK").sort((a, b) => a.rank - b.rank).slice(0, 10),
      NONE:   [...arcs].filter(a => !a.direction || a.direction === "NONE").sort((a, b) => a.rank - b.rank).slice(0, 10),
    };

    function drawOneSection(rows: ArcDatum[], dir: FlowDirection, pos: { x: number; y: number; scale: number }): void {
      if (rows.length === 0) return;
      const { x, y, scale } = pos;
      const COL_W = [36, 100, 100, 80].map(w => w * scale);
      const tableW = COL_W.reduce((s, w) => s + w, 0);
      const ROW_H = 22 * scale;
      const SEC_H = 24 * scale;
      const HDR_H = 20 * scale;
      const TOTAL_HDR = SEC_H + HDR_H;
      const PADDING = 8 * scale;
      const tableH = TOTAL_HDR + rows.length * ROW_H + PADDING;
      const dirColor = dir === "KELUAR" ? "#fb923c" : dir === "MASUK" ? "#34d399" : "#6366f1";
      const secBg    = dir === "KELUAR" ? "rgba(251,146,60,0.18)"  : dir === "MASUK" ? "rgba(52,211,153,0.18)"  : "rgba(99,102,241,0.18)";
      const secBdr   = dir === "KELUAR" ? "rgba(251,146,60,0.5)"   : dir === "MASUK" ? "rgba(52,211,153,0.5)"   : "rgba(99,102,241,0.5)";

      ctx.save();
      ctx.fillStyle = theme.bg;
      ctx.beginPath();
      ctx.roundRect(x, y, tableW, tableH, 6 * scale);
      ctx.fill();
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = scale;
      ctx.stroke();

      ctx.fillStyle = secBg;
      ctx.beginPath();
      ctx.roundRect(x, y, tableW, SEC_H, [6 * scale, 6 * scale, 0, 0]);
      ctx.fill();
      ctx.font = `bold ${12 * scale}px system-ui, sans-serif`;
      ctx.fillStyle = dirColor;
      ctx.textBaseline = "middle";
      ctx.fillText(dir, x + 8 * scale, y + SEC_H / 2);

      ctx.fillStyle = theme.headerBg;
      ctx.fillRect(x, y + SEC_H, tableW, HDR_H);
      ctx.strokeStyle = secBdr;
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.moveTo(x, y + TOTAL_HDR);
      ctx.lineTo(x + tableW, y + TOTAL_HDR);
      ctx.stroke();

      const colHdrs = ["#", "Asal", "Tujuan", "Total"];
      ctx.font = `bold ${10 * scale}px system-ui, sans-serif`;
      ctx.fillStyle = theme.headerText;
      let cx = x;
      colHdrs.forEach((h, i) => { ctx.fillText(h, cx + 6 * scale, y + SEC_H + HDR_H / 2); cx += COL_W[i]; });

      rows.forEach((arc, rowIdx) => {
        const ry = y + TOTAL_HDR + rowIdx * ROW_H;
        if (rowIdx % 2 === 0) { ctx.fillStyle = theme.rowAlt; ctx.fillRect(x, ry, tableW, ROW_H); }
        ctx.fillStyle = dirColor;
        ctx.beginPath();
        ctx.arc(x + 8 * scale, ry + ROW_H / 2, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        const cells = [String(arc.rank), arc.from.name, arc.to.name, arc.totalPassengers.toLocaleString()];
        ctx.textBaseline = "middle";
        cx = x;
        cells.forEach((cell, i) => {
          ctx.font = i === 3 ? `bold ${10*scale}px system-ui, sans-serif` : `${10*scale}px system-ui, sans-serif`;
          ctx.fillStyle = i === 3 ? dirColor : i === 0 ? theme.rankText : theme.bodyText;
          ctx.fillText(cell, cx + (i === 0 ? 16 * scale : 6 * scale), ry + ROW_H / 2, COL_W[i] - 8 * scale);
          cx += COL_W[i];
        });
        ctx.strokeStyle = theme.divider;
        ctx.lineWidth = 0.5 * scale;
        ctx.beginPath();
        ctx.moveTo(x, ry + ROW_H);
        ctx.lineTo(x + tableW, ry + ROW_H);
        ctx.stroke();
      });
      ctx.restore();
    }

    (["KELUAR", "MASUK", "NONE"] as FlowDirection[]).forEach(dir => {
      const pos = sections[dir];
      const rows = allRows[dir];
      if (pos && rows.length > 0) drawOneSection(rows, dir, pos);
    });
  }

  function captureMapOnly(): { url: string; w: number; h: number } | null {
    const container = containerRef.current;
    if (!container) return null;
    const mapCanvas = container.querySelector<HTMLCanvasElement>(".maplibregl-canvas");
    if (!mapCanvas) return null;
    const w = mapCanvas.width;
    const h = mapCanvas.height;
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(mapCanvas, 0, 0);
    if (deckSnapshotRef.current) ctx.drawImage(deckSnapshotRef.current, 0, 0);
    return { url: out.toDataURL("image/png", 0.95), w, h };
  }

  function captureWithTable(format: DownloadFormat): string | null {
    if (!previewData || !previewImgRef.current) return null;
    const container = containerRef.current;
    if (!container) return null;
    const mapCanvas = container.querySelector<HTMLCanvasElement>(".maplibregl-canvas");
    if (!mapCanvas) return null;
    const imgEl = previewImgRef.current;
    const scaleX = previewData.canvasW / (imgEl.clientWidth || 1);
    const scaleY = previewData.canvasH / (imgEl.clientHeight || 1);
    const out = document.createElement("canvas");
    out.width = previewData.canvasW; out.height = previewData.canvasH;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(mapCanvas, 0, 0);
    if (deckSnapshotRef.current) ctx.drawImage(deckSnapshotRef.current, 0, 0);
    const canvasSections: Record<string, { x: number; y: number; scale: number }> = {};
    Object.entries(sectionStates).forEach(([key, s]) => {
      canvasSections[key] = { x: s.x * scaleX, y: s.y * scaleY, scale: s.scale * scaleX };
    });
    drawExportTable(ctx, canvasSections);
    const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    return out.toDataURL(mime, 0.95);
  }

  function requestPreview(format: DownloadFormat): void {
    setShowDownloadMenu(false);
    const result = captureMapOnly();
    if (!result) return;
    const dpr = window.devicePixelRatio || 1;
    const approxImgH = result.h / dpr;
    const maxRows = (dir: string) => Math.min(10, arcs.filter(a => (a.direction ?? "NONE") === dir).length);
    const approxTableH = (dir: string) => 44 + maxRows(dir) * 22 + 8;
    const TABLE_W = 316 + 10;
    const newStates: Record<string, { x: number; y: number; scale: number }> = {};
    let xOff = 16;
    (["KELUAR", "MASUK", "NONE"] as FlowDirection[]).forEach(dir => {
      const count = dir === "NONE"
        ? arcs.filter(a => !a.direction || a.direction === "NONE").length
        : arcs.filter(a => a.direction === dir).length;
      if (count > 0) {
        newStates[dir] = { x: xOff, y: Math.max(16, approxImgH - approxTableH(dir) - 16), scale: 1 };
        xOff += TABLE_W;
      }
    });
    setSectionStates(newStates);
    setPreviewData({ mapUrl: result.url, format, canvasW: result.w, canvasH: result.h });
  }

  function savePreview(): void {
    if (!previewData) return;
    const dataUrl = captureWithTable(previewData.format);
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `desire-lines-${Date.now()}.${previewData.format}`;
    a.click();
    setPreviewData(null);
  }

  function handleAfterRender(): void {
    const container = containerRef.current;
    if (!container) return;
    const allCanvases = Array.from(container.querySelectorAll<HTMLCanvasElement>("canvas"));
    const deckCanvas = allCanvases.find((c) => !c.classList.contains("maplibregl-canvas"));
    if (!deckCanvas || deckCanvas.width === 0) return;
    if (!deckSnapshotRef.current) {
      deckSnapshotRef.current = document.createElement("canvas");
    }
    const snap = deckSnapshotRef.current;
    if (snap.width !== deckCanvas.width || snap.height !== deckCanvas.height) {
      snap.width = deckCanvas.width;
      snap.height = deckCanvas.height;
    }
    const ctx = snap.getContext("2d")!;
    ctx.clearRect(0, 0, snap.width, snap.height);
    ctx.drawImage(deckCanvas, 0, 0);
  }

  if (!mounted) return null;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) =>
          setViewState(vs as MapViewState)
        }
        controller={{ scrollZoom: { speed: 0.004, smooth: true } }}
        layers={layers}
        onAfterRender={handleAfterRender}
      >
        <Map mapStyle={mapStyle} preserveDrawingBuffer />
      </DeckGL>

      <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-1">
        <div className="text-xs text-white/40 px-1 mb-0.5 select-none">Basemap</div>
        <div className="flex flex-col gap-0.5">
          {BASEMAPS.map((bm) => (
            <button
              key={bm.id}
              onClick={() => setBasemapId(bm.id)}
              className={`text-left px-2.5 py-1 text-xs rounded-md transition-colors ${
                basemapId === bm.id
                  ? "bg-accent text-white font-semibold"
                  : "bg-panel/80 text-muted hover:text-white border border-border/60"
              }`}
            >
              {bm.label}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-16 right-4 z-10" data-download-menu>
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-panel border border-border rounded-lg text-muted hover:text-white hover:border-accent transition-colors shadow-lg"
            title="Download map"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" />
              <path d="M1 10h10" />
            </svg>
            Export
          </button>
          {showDownloadMenu && (
            <div className="absolute bottom-full mb-1.5 right-0 bg-panel border border-border rounded-lg shadow-xl overflow-hidden min-w-[100px]">
              <div className="px-2.5 py-1.5 text-xs text-muted/60 border-b border-border">Format</div>
              {(["png", "jpg", "webp"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => requestPreview(fmt)}
                  className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors shadow-lg ${
            showLabels
              ? "bg-accent border-accent text-white"
              : "bg-panel border-border text-muted hover:text-white"
          }`}
          title={showLabels ? "Hide city labels" : "Show city labels"}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="5.5" cy="4" r="2" />
            <line x1="5.5" y1="6" x2="5.5" y2="10" />
          </svg>
          Labels
        </button>

        <div className="flex rounded-lg overflow-hidden border border-border shadow-lg">
        {(["2D", "3D"] as const).map((label) => (
          <button
            key={label}
            onClick={toggleView}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              (label === "3D") === is3D
                ? "bg-accent text-white"
                : "bg-panel text-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        </div>
      </div>

      {previewData && (() => {
        const isLight = basemapId === "light" || basemapId === "light-clean" || basemapId === "voyager";
        const tBg      = isLight ? "rgba(255,255,255,0.93)" : "rgba(26,29,46,0.92)";
        const tBorder  = isLight ? "rgba(200,205,220,0.9)" : "rgba(42,45,62,0.9)";
        const tHdrTxt  = isLight ? "#1e1f2e" : "rgba(255,255,255,0.9)";
        const tBody    = isLight ? "#111827" : "rgba(255,255,255,0.85)";
        const tRowAlt  = isLight ? "rgba(240,242,250,0.7)" : "rgba(255,255,255,0.04)";
        const tDivider = isLight ? "rgba(200,205,220,0.5)" : "rgba(42,45,62,0.6)";
        const tHdrBg   = isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";

        const keluarRows = [...arcs].filter(a => a.direction === "KELUAR").sort((a,b) => a.rank - b.rank).slice(0, 10);
        const masukRows  = [...arcs].filter(a => a.direction === "MASUK").sort((a,b) => a.rank - b.rank).slice(0, 10);
        const noneRows   = [...arcs].filter(a => !a.direction || a.direction === "NONE").sort((a,b) => a.rank - b.rank).slice(0, 10);

        function renderSection(rows: ArcDatum[], dir: FlowDirection) {
          if (rows.length === 0) return null;
          const dc  = dir === "KELUAR" ? "#fb923c" : dir === "MASUK" ? "#34d399" : "#6366f1";
          const sBg = dir === "KELUAR" ? "rgba(251,146,60,0.15)" : dir === "MASUK" ? "rgba(52,211,153,0.15)" : "rgba(99,102,241,0.15)";
          const sBd = dir === "KELUAR" ? "rgba(251,146,60,0.45)" : dir === "MASUK" ? "rgba(52,211,153,0.45)" : "rgba(99,102,241,0.45)";
          return (
            <div key={dir} style={{ background: tBg, border: `1px solid ${tBorder}`, borderRadius: 6, overflow: "hidden", fontSize: 10, minWidth: 316 }}>
              <div style={{ background: sBg, borderBottom: `1px solid ${sBd}`, padding: "4px 8px", fontWeight: 700, fontSize: 11, color: dc }}>{dir}</div>
              <div style={{ display: "grid", gridTemplateColumns: "36px 100px 100px 80px", background: tHdrBg, borderBottom: `1px solid ${sBd}` }}>
                {["#", "Asal", "Tujuan", "Total"].map(h => (
                  <div key={h} style={{ padding: "2px 6px", fontWeight: 600, color: tHdrTxt }}>{h}</div>
                ))}
              </div>
              {rows.map((arc, i) => (
                <div key={arc.rank} style={{ display: "grid", gridTemplateColumns: "36px 100px 100px 80px", background: i % 2 === 0 ? tRowAlt : "transparent", borderBottom: `0.5px solid ${tDivider}` }}>
                  <div style={{ padding: "2px 4px", color: dc, fontWeight: 700 }}>{arc.rank}</div>
                  <div style={{ padding: "2px 4px", color: tBody, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{arc.from.name}</div>
                  <div style={{ padding: "2px 4px", color: tBody, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{arc.to.name}</div>
                  <div style={{ padding: "2px 4px", color: dc, fontWeight: 700 }}>{arc.totalPassengers.toLocaleString()}</div>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewData(null)}
          >
            <div
              className="bg-panel border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxWidth: "92vw", maxHeight: "90vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div>
                  <span className="text-sm font-semibold text-white">Export Preview</span>
                  <span className="ml-2 text-xs text-muted uppercase tracking-wider">{previewData.format}</span>
                  <span className="ml-3 text-xs text-muted/50">Drag each table individually · resize handle ↘</span>
                </div>
                <button onClick={() => setPreviewData(null)} className="text-muted hover:text-white transition-colors text-lg leading-none">×</button>
              </div>

              <div className="overflow-auto flex-1 p-4 scrollbar-themed">
                <div className="relative inline-block">
                  <img
                    ref={previewImgRef}
                    src={previewData.mapUrl}
                    alt="Map preview"
                    className="rounded-lg border border-border/50 block"
                    style={{ maxWidth: "100%", height: "auto", display: "block" }}
                  />
                  {(["KELUAR", "MASUK", "NONE"] as FlowDirection[]).map(dir => {
                    const rows = dir === "KELUAR" ? keluarRows : dir === "MASUK" ? masukRows : noneRows;
                    if (rows.length === 0) return null;
                    const s = sectionStates[dir] ?? { x: 16, y: 16, scale: 1 };
                    return (
                      <div
                        key={dir}
                        style={{
                          position: "absolute",
                          left: s.x,
                          top: s.y,
                          transform: `scale(${s.scale})`,
                          transformOrigin: "top left",
                          cursor: "grab",
                          userSelect: "none",
                          touchAction: "none",
                        }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const isResize = !!(e.target as HTMLElement).closest("[data-handle='resize']");
                          if (isResize) {
                            sectionResizeRef.current = { key: dir, sx: e.clientX, os: s.scale };
                          } else {
                            sectionDragRef.current = { key: dir, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y };
                          }
                        }}
                        onPointerMove={(e) => {
                          if (sectionDragRef.current?.key === dir) {
                            const d = sectionDragRef.current;
                            setSectionStates(prev => ({ ...prev, [dir]: { ...prev[dir], x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy } }));
                          }
                          if (sectionResizeRef.current?.key === dir) {
                            const r = sectionResizeRef.current;
                            setSectionStates(prev => ({ ...prev, [dir]: { ...prev[dir], scale: Math.max(0.4, Math.min(3, r.os + (e.clientX - r.sx) / 300)) } }));
                          }
                        }}
                        onPointerUp={() => { sectionDragRef.current = null; sectionResizeRef.current = null; }}
                      >
                        <div style={{ position: "relative", display: "inline-block" }}>
                          {renderSection(rows, dir)}
                          <div
                            data-handle="resize"
                            style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "se-resize", background: "rgba(99,102,241,0.6)", borderRadius: "0 0 4px 0", borderTop: "1px solid rgba(99,102,241,0.9)", borderLeft: "1px solid rgba(99,102,241,0.9)" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 gap-3">
                <div className="flex gap-1 p-0.5 bg-surface rounded-lg">
                  {(["png", "jpg", "webp"] as const).map((fmt) => (
                    <button key={fmt} onClick={() => requestPreview(fmt)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors uppercase tracking-wider ${
                        previewData.format === fmt ? "bg-accent text-white font-semibold" : "text-muted hover:text-white"
                      }`}>
                      {fmt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPreviewData(null)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button onClick={savePreview}
                    className="px-4 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" />
                      <path d="M1 10h10" />
                    </svg>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-panel border border-border rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="text-muted mb-0.5">Rank #{tooltip.rank}</div>
          <div className="font-semibold text-white">
            {tooltip.from} → {tooltip.to}
          </div>
          <div className="text-accent mt-0.5">
            {tooltip.passengers.toLocaleString()} passengers
          </div>
          {tooltip.direction && tooltip.direction !== "NONE" && (
            <div
              className="mt-1 text-xs font-semibold"
              style={{
                color:
                  tooltip.direction === "KELUAR" ? "#fb923c" : "#34d399",
              }}
            >
              {tooltip.direction}
            </div>
          )}
        </div>
      )}

      {arcs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-panel/80 border border-border rounded-xl px-6 py-4 text-center">
            <div className="text-muted text-sm">No desire lines to display.</div>
            <div className="text-muted/60 text-xs mt-1">
              Add data in the panel to visualize flows.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
