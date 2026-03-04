"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer, LineLayer, IconLayer, TextLayer, ScatterplotLayer } from "@deck.gl/layers";
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
  const [previewData, setPreviewData] = useState<{ dataUrl: string; format: DownloadFormat } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deckSnapshotRef = useRef<HTMLCanvasElement | null>(null);

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

    const lineLayer = is3D
      ? new ArcLayer<ArcDatum>({
          id: "desire-lines-arc",
          data: arcs,
          pickable: true,
          getWidth: (d) => resolveWidth(d),
          getSourcePosition: (d) => d.from.coordinates,
          getTargetPosition: (d) => d.to.coordinates,
          getSourceColor: (d) => resolveColor(d),
          getTargetColor: (d) => resolveColor(d),
          onHover: hoverHandler,
          updateTriggers: {
            getWidth: trigger,
            getSourceColor: trigger,
            getTargetColor: trigger,
          },
        })
      : new LineLayer<ArcDatum>({
          id: "desire-lines-flat",
          data: arcs,
          pickable: true,
          getWidth: (d) => resolveWidth(d),
          getSourcePosition: (d) => d.from.coordinates,
          getTargetPosition: (d) => d.to.coordinates,
          getColor: (d) => resolveColor(d),
          onHover: hoverHandler,
          updateTriggers: {
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
            iconAtlas: ARROW_ICON_URL,
            iconMapping: ARROW_ICON_MAPPING,
            getIcon: () => "arrow",
            getPosition: (d) => d.to.coordinates,
            getSize: lineWeightMode === "weighted"
              ? (d) => Math.max(10, rankWeight(d.rank, d.direction ?? "NONE") * 28)
              : 14,
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
        })
      : null;

    return [lineLayer, arrowLayer, nodeCircleLayer, labelLayer].filter(Boolean);
  }, [arcs, maxPassengers, maxRankByDir, maxArcWidth, is3D, lineWeightMode, arrowStyle, showLabels, cityNodes]);

  function captureComposite(format: DownloadFormat): string | null {
    const container = containerRef.current;
    if (!container) return null;
    const mapCanvas = container.querySelector<HTMLCanvasElement>(".maplibregl-canvas");
    if (!mapCanvas) return null;
    const w = mapCanvas.width;
    const h = mapCanvas.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(mapCanvas, 0, 0);
    if (deckSnapshotRef.current) ctx.drawImage(deckSnapshotRef.current, 0, 0);
    const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    return out.toDataURL(mime, 0.95);
  }

  function requestPreview(format: DownloadFormat): void {
    setShowDownloadMenu(false);
    const dataUrl = captureComposite(format);
    if (dataUrl) setPreviewData({ dataUrl, format });
  }

  function savePreview(): void {
    if (!previewData) return;
    const a = document.createElement("a");
    a.href = previewData.dataUrl;
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

      {previewData && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewData(null)}
        >
          <div
            className="bg-panel border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxWidth: "80vw", maxHeight: "80vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div>
                <span className="text-sm font-semibold text-white">Export Preview</span>
                <span className="ml-2 text-xs text-muted uppercase tracking-wider">{previewData.format}</span>
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="text-muted hover:text-white transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-auto flex-1 p-4 scrollbar-themed">
              <img
                src={previewData.dataUrl}
                alt="Map export preview"
                className="rounded-lg border border-border/50 block"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 gap-3">
              <div className="flex gap-1 p-0.5 bg-surface rounded-lg">
                {(["png", "jpg", "webp"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => requestPreview(fmt)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors uppercase tracking-wider ${
                      previewData.format === fmt
                        ? "bg-accent text-white font-semibold"
                        : "text-muted hover:text-white"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreview}
                  className="px-4 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors flex items-center gap-1.5"
                >
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
      )}

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
