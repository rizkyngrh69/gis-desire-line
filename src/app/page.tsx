"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { DesireLineRecord } from "@/types";
import { buildArcData } from "@/utils/arcBuilder";
import ControlPanel from "@/components/ControlPanel/ControlPanel";

const DesireLineMap = dynamic(
  () => import("@/components/Map/DesireLineMap"),
  { ssr: false }
);

export default function HomePage() {
  const [records, setRecords] = useState<DesireLineRecord[]>([]);
  const [maxArcWidth, setMaxArcWidth] = useState<number>(12);
  const [lineWeightMode, setLineWeightMode] = useState<import("@/types").LineWeightMode>("weighted");
  const [arrowStyle, setArrowStyle] = useState<import("@/types").ArrowStyle>("none");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const { arcs, unknownCities } = useMemo(
    () => buildArcData(records),
    [records]
  );

  const stats = useMemo(() => {
    const keluar = arcs.filter((a) => a.direction === "KELUAR");
    const masuk  = arcs.filter((a) => a.direction === "MASUK");
    const none   = arcs.filter((a) => a.direction === "NONE");
    return {
      total: arcs.length,
      keluarCount: keluar.length,
      masukCount:  masuk.length,
      noneCount:   none.length,
      keluarPax:   keluar.reduce((s, a) => s + a.totalPassengers, 0),
      masukPax:    masuk.reduce((s, a) => s + a.totalPassengers, 0),
      nonePax:     none.reduce((s, a) => s + a.totalPassengers, 0),
      totalPax:    arcs.reduce((s, a) => s + a.totalPassengers, 0),
    };
  }, [arcs]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-white">
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
          sidebarOpen ? "w-80" : "w-0"
        }`}
      >
        <ControlPanel
          records={records}
          onRecordsChange={setRecords}
          maxArcWidth={maxArcWidth}
          onMaxArcWidthChange={setMaxArcWidth}
          lineWeightMode={lineWeightMode}
          onLineWeightModeChange={setLineWeightMode}
          arrowStyle={arrowStyle}
          onArrowStyleChange={setArrowStyle}
          unknownCities={unknownCities}
        />
      </div>

      <main className="flex-1 relative h-full">
        <DesireLineMap arcs={arcs} maxArcWidth={maxArcWidth} lineWeightMode={lineWeightMode} arrowStyle={arrowStyle} />

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-4 left-4 z-20 bg-panel/90 border border-border rounded-lg w-8 h-8 flex items-center justify-center text-muted hover:text-white hover:border-accent transition-colors backdrop-blur-sm shadow-lg"
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {sidebarOpen ? (
              <>
                <line x1="1" y1="2" x2="1" y2="12" />
                <polyline points="9,4 5,7 9,10" />
              </>
            ) : (
              <>
                <line x1="1" y1="2" x2="1" y2="12" />
                <polyline points="5,4 9,7 5,10" />
              </>
            )}
          </svg>
        </button>

        {arcs.length > 0 && (
          <div className="absolute top-4 right-4 bg-panel/90 border border-border rounded-xl px-4 py-3 backdrop-blur-sm pointer-events-none min-w-[160px]">
            <div className="text-xs text-muted mb-1">Visualized</div>
            <div className="text-2xl font-bold text-white tabular-nums leading-none">
              {stats.total}
            </div>
            <div className="text-xs text-muted mb-2">desire lines</div>

            <div className="space-y-1.5 border-t border-border pt-2">
              {stats.keluarCount > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#fb923c" }} />
                    <span className="text-xs text-muted">KELUAR</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-white tabular-nums">{stats.keluarCount}</span>
                    <span className="text-xs text-muted/60 ml-1">lines</span>
                  </div>
                </div>
              )}
              {stats.masukCount > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#34d399" }} />
                    <span className="text-xs text-muted">MASUK</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-white tabular-nums">{stats.masukCount}</span>
                    <span className="text-xs text-muted/60 ml-1">lines</span>
                  </div>
                </div>
              )}
              {stats.noneCount > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#6366f1" }} />
                    <span className="text-xs text-muted">Untagged</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-white tabular-nums">{stats.noneCount}</span>
                    <span className="text-xs text-muted/60 ml-1">lines</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-border space-y-1">
              {stats.keluarCount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted/70">KELUAR pax</span>
                  <span style={{ color: "#fb923c" }} className="font-semibold tabular-nums">
                    {stats.keluarPax.toLocaleString()}
                  </span>
                </div>
              )}
              {stats.masukCount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted/70">MASUK pax</span>
                  <span style={{ color: "#34d399" }} className="font-semibold tabular-nums">
                    {stats.masukPax.toLocaleString()}
                  </span>
                </div>
              )}
              {stats.nonePax > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted/70">Other pax</span>
                  <span className="text-accent font-semibold tabular-nums">
                    {stats.nonePax.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs border-t border-border/50 pt-1 mt-1">
                <span className="text-muted">Total pax</span>
                <span className="text-white font-bold tabular-nums">
                  {stats.totalPax.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
