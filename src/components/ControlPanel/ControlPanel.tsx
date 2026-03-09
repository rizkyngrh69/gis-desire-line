"use client";

import type { DesireLineRecord, LineWeightMode, ArrowStyle } from "@/types";
import DataTable from "@/components/DataTable/DataTable";
import CsvUpload from "@/components/CsvUpload/CsvUpload";
import { useState } from "react";

interface ControlPanelProps {
  records: DesireLineRecord[];
  onRecordsChange: (records: DesireLineRecord[]) => void;
  maxArcWidth: number;
  onMaxArcWidthChange: (v: number) => void;
  lineWeightMode: LineWeightMode;
  onLineWeightModeChange: (v: LineWeightMode) => void;
  arrowStyle: ArrowStyle;
  onArrowStyleChange: (v: ArrowStyle) => void;
  unknownCities: string[];
  onSwitchMode: () => void;
}

export default function ControlPanel({
  records,
  onRecordsChange,
  maxArcWidth,
  onMaxArcWidthChange,
  lineWeightMode,
  onLineWeightModeChange,
  arrowStyle,
  onArrowStyleChange,
  unknownCities,
  onSwitchMode,
}: ControlPanelProps) {
  const [importMode, setImportMode] = useState<"replace" | "append">(
    "replace"
  );

  function handleImport(imported: DesireLineRecord[]): void {
    if (importMode === "replace") {
      onRecordsChange(imported);
    } else {
      onRecordsChange([...records, ...imported]);
    }
  }

  function loadSampleData(): void {
    const sample: DesireLineRecord[] = [
      { id: "s1",  rank: 1,  origin: "BANDUNG",    destination: "JAKARTA",    totalPassengers: 2631, direction: "KELUAR" },
      { id: "s2",  rank: 2,  origin: "CIREBON",    destination: "JAKARTA",    totalPassengers: 2044, direction: "KELUAR" },
      { id: "s3",  rank: 3,  origin: "BANDUNG",    destination: "YOGYAKARTA", totalPassengers: 1751, direction: "KELUAR" },
      { id: "s4",  rank: 4,  origin: "GARUT",      destination: "BANDUNG",    totalPassengers: 757,  direction: "KELUAR" },
      { id: "s5",  rank: 5,  origin: "INDRAMAYU",  destination: "JAKARTA",    totalPassengers: 741,  direction: "KELUAR" },
      { id: "s6",  rank: 1,  origin: "JAKARTA",    destination: "BANDUNG",    totalPassengers: 2511, direction: "MASUK"  },
      { id: "s7",  rank: 2,  origin: "YOGYAKARTA", destination: "BANDUNG",    totalPassengers: 2185, direction: "MASUK"  },
      { id: "s8",  rank: 3,  origin: "JAKARTA",    destination: "CIREBON",    totalPassengers: 1637, direction: "MASUK"  },
      { id: "s9",  rank: 4,  origin: "JAKARTA",    destination: "INDRAMAYU",  totalPassengers: 650,  direction: "MASUK"  },
      { id: "s10", rank: 5,  origin: "SURABAYA",   destination: "BANDUNG",    totalPassengers: 607,  direction: "MASUK"  },
    ];
    onRecordsChange(sample);
  }

  return (
    <aside className="w-80 shrink-0 h-full bg-panel border-r border-border flex flex-col overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <h1 className="text-sm font-semibold text-white tracking-tight">
              Desire Lines Mapper
            </h1>
          </div>
          <button
            onClick={onSwitchMode}
            title="Back to App Home"
            className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors border border-border hover:border-border rounded-md px-2 py-0.5"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 7 L7 2 L13 7" />
              <path d="M3 6.5 L3 13 L6 13 L6 9.5 L8 9.5 L8 13 L11 13 L11 6.5" />
            </svg>
            Home
          </button>
        </div>
        <p className="text-xs text-muted/70 ml-4">
          Origin–Destination flow visualizer
        </p>
      </div>

      <div className="overflow-y-auto shrink-0 border-b border-border scrollbar-themed" style={{ maxHeight: "50%" }}>

      <div className="px-4 py-2 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            Import
          </span>
          <button
            onClick={loadSampleData}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Load sample
          </button>
        </div>
        <CsvUpload
          onImport={handleImport}
          mode={importMode}
          onModeChange={setImportMode}
        />
      </div>

      <div className="px-4 py-2 border-b border-border space-y-2">
        <span className="text-xs font-medium text-muted uppercase tracking-wider block">
          Visual
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted mb-1">Line style</div>
            <div className="flex gap-0.5 p-0.5 bg-surface rounded-lg">
              {(["weighted", "uniform"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onLineWeightModeChange(m)}
                  className={`flex-1 text-xs py-1 rounded-md transition-colors capitalize ${
                    lineWeightMode === m
                      ? "bg-accent text-white"
                      : "text-muted hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Arrow</div>
            <div className="flex gap-0.5 p-0.5 bg-surface rounded-lg">
              {(["none", "arrowhead"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onArrowStyleChange(s)}
                  className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                    arrowStyle === s
                      ? "bg-accent text-white"
                      : "text-muted hover:text-white"
                  }`}
                >
                  {s === "none" ? "Off" : "On"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={lineWeightMode === "uniform" ? "opacity-40 pointer-events-none" : ""}>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Max line width</span>
            <span className="text-white">{maxArcWidth}px</span>
          </div>
          <input
            type="range"
            min={2}
            max={30}
            step={1}
            value={maxArcWidth}
            onChange={(e) => onMaxArcWidthChange(Number(e.target.value))}
            className="w-full accent-indigo-500 h-1.5"
          />
        </div>
      </div>

      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Legend</span>
          <div className="h-1 w-20 rounded-full" style={{ background: "linear-gradient(to right, rgba(99,102,241,0.3), rgba(99,102,241,1))" }} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#fb923c" }} />
            <span className="text-xs text-muted">Keluar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#34d399" }} />
            <span className="text-xs text-muted">Masuk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#6366f1" }} />
            <span className="text-xs text-muted">Untagged</span>
          </div>
        </div>
      </div>

      {unknownCities.length > 0 && (
        <div className="mx-4 my-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30">
          <div className="text-xs font-medium text-danger mb-1">Unrecognized cities</div>
          <div className="text-xs text-danger/70 leading-relaxed">{unknownCities.join(", ")}</div>
          <div className="text-xs text-muted/50 mt-1">These cities have no coordinates and will be skipped.</div>
        </div>
      )}

      </div>

      {/* Data Table — fills all remaining space */}
      <div className="flex-1 min-h-0 px-4 py-2 flex flex-col">
        <span className="text-xs font-medium text-muted uppercase tracking-wider block mb-2 shrink-0">
          Data
        </span>
        <DataTable records={records} onRecordsChange={onRecordsChange} />
      </div>
    </aside>
  );
}
