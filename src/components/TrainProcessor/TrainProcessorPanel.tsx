"use client";

import { useRef, useState, useMemo } from "react";
import type { TrainDataRow, StationRecord } from "@/types";
import {
  parseTrainCsvFile,
  parseStationCsvFile,
  filterTrainData,
  rowsToCsvString,
  triggerCsvDownload,
} from "@/utils/trainDataProcessor";
import type { CsvSchema } from "@/utils/trainDataProcessor";

interface TrainProcessorPanelProps {
  onBack: () => void;
}

type TableColumn = { key: keyof TrainDataRow; label: string; enriched?: true };

const TABLE_COLUMNS_DAOP2: TableColumn[] = [
  { key: "trainNum",        label: "TRAIN NUMBER" },
  { key: "trainName",       label: "TRAIN NAME" },
  { key: "departTime",      label: "DEPART TIME" },
  { key: "arrivalTime",     label: "ARRIVAL TIME" },
  { key: "businessArea",    label: "BUSINESS AREA" },
  { key: "org",             label: "ORG" },
  { key: "des",             label: "DES" },
  { key: "trainClass",      label: "CLASS" },
  { key: "capacity",        label: "CAPACITY" },
  { key: "wagon",           label: "WAGON" },
  { key: "totalPassengers", label: "TOTAL PSG" },
  { key: "tanggal",         label: "TANGGAL" },
  { key: "daopAsal",        label: "DAOP ASAL" },
  { key: "kelas",           label: "KELAS 2" },
  { key: "ket",             label: "KET" },
  { key: "daerahAsal",      label: "DAERAH ASAL",   enriched: true },
  { key: "daopTujuan",      label: "DAOP TUJUAN",   enriched: true },
  { key: "daerahTujuan",    label: "DAERAH TUJUAN", enriched: true },
];

const TABLE_COLUMNS_DAOP3: TableColumn[] = [
  { key: "trainNum",        label: "TRAIN NUMBER" },
  { key: "trainName",       label: "TRAIN NAME" },
  { key: "departTime",      label: "DEPART TIME" },
  { key: "arrivalTime",     label: "ARRIVAL TIME" },
  { key: "businessArea",    label: "BUSINESS AREA" },
  { key: "org",             label: "ORG" },
  { key: "des",             label: "DES" },
  { key: "trainClass",      label: "CLASS" },
  { key: "capacity",        label: "CAPACITY" },
  { key: "wagon",           label: "WAGON" },
  { key: "totalPassengers", label: "TOTAL PSG" },
  { key: "psgKm",           label: "PSG KM" },
  { key: "occupancy",       label: "OCCUPANCY" },
  { key: "revenue",         label: "REVENUE" },
  { key: "pointRevenue",    label: "POINT REVENUE" },
  { key: "nettRevenue",     label: "NETT REVENUE" },
  { key: "daerahAsal",      label: "DAERAH ASAL",   enriched: true },
  { key: "daopTujuan",      label: "DAOP TUJUAN",   enriched: true },
  { key: "daerahTujuan",    label: "DAERAH TUJUAN", enriched: true },
];

const SEARCH_FIELDS: ReadonlyArray<keyof TrainDataRow> = [
  "trainNum", "trainName", "org", "des", "businessArea",
  "trainClass", "kelas", "ket", "daerahAsal", "daerahTujuan",
  "daopAsal", "daopTujuan",
];

const PAGE_SIZE = 100;

type TrainNumParity = "all" | "odd" | "even";

interface FilterState {
  keyword:        string;
  businessArea:   string;
  daopAsal:       string;
  daopTujuan:     string;
  trainClass:     string;
  ket:            string;
  trainNumParity: TrainNumParity;
}

const EMPTY_FILTERS: FilterState = {
  keyword: "", businessArea: "", daopAsal: "", daopTujuan: "", trainClass: "", ket: "",
  trainNumParity: "all",
};

function collectUnique(rows: TrainDataRow[], key: keyof TrainDataRow): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = String(r[key]).trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

function applyFilters(rows: TrainDataRow[], f: FilterState): TrainDataRow[] {
  const kw = f.keyword.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.businessArea && r.businessArea !== f.businessArea) return false;
    if (f.daopAsal     && r.daopAsal     !== f.daopAsal)     return false;
    if (f.daopTujuan   && r.daopTujuan   !== f.daopTujuan)   return false;
    if (f.trainClass   && r.trainClass   !== f.trainClass)   return false;
    if (f.ket          && r.ket          !== f.ket)           return false;
    if (f.trainNumParity !== "all") {
      const num = parseInt(r.trainNum, 10);
      if (!isNaN(num)) {
        if (f.trainNumParity === "odd"  && num % 2 === 0) return false;
        if (f.trainNumParity === "even" && num % 2 !== 0) return false;
      }
    }
    if (kw) {
      return SEARCH_FIELDS.some((fld) =>
        String(r[fld]).toLowerCase().includes(kw)
      );
    }
    return true;
  });
}

export default function TrainProcessorPanel({ onBack }: TrainProcessorPanelProps) {
  const trainInputRef   = useRef<HTMLInputElement>(null);
  const stationInputRef = useRef<HTMLInputElement>(null);

  const [trainFile,    setTrainFile]    = useState<File | null>(null);
  const [stationFile,  setStationFile]  = useState<File | null>(null);
  const [stations,     setStations]     = useState<StationRecord[]>([]);
  const [processing,   setProcessing]   = useState(false);
  const [allRows,      setAllRows]      = useState<TrainDataRow[]>([]);
  const [parseErrors,  setParseErrors]  = useState<string[]>([]);
  const [stationError, setStationError] = useState<string | null>(null);
  const [progress,     setProgress]     = useState<number>(0);
  const [filters,      setFilters]      = useState<FilterState>(EMPTY_FILTERS);
  const [searchInput,  setSearchInput]  = useState<string>("");
  const [targetDaop,   setTargetDaop]   = useState<string>("2");
  const [page,         setPage]         = useState<number>(0);
  const [schema,       setSchema]       = useState<CsvSchema>("daop2");

  const hasResults = allRows.length > 0;
  const activeColumns = schema === "daop3" ? TABLE_COLUMNS_DAOP3 : TABLE_COLUMNS_DAOP2;

  const daopSets = useMemo(
    () => filterTrainData(allRows, targetDaop.trim()),
    [allRows, targetDaop]
  );

  const options = useMemo(() => ({
    businessArea: collectUnique(allRows, "businessArea"),
    daopAsal:     collectUnique(allRows, "daopAsal"),
    daopTujuan:   collectUnique(allRows, "daopTujuan"),
    trainClass:   collectUnique(allRows, "trainClass"),
    ket:          collectUnique(allRows, "ket"),
  }), [allRows]);

  const filteredRows = useMemo(() => applyFilters(allRows, filters), [allRows, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageRows   = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  async function handleStationFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setStationFile(file);
    setStationError(null);
    const records = await parseStationCsvFile(file);
    if (records.length === 0) {
      setStationError("No valid records. Ensure columns: singkatan, daop, kab_kota, stasiun.");
      return;
    }
    setStations(records);
    if (stationInputRef.current) stationInputRef.current.value = "";
  }

  async function handleProcess(): Promise<void> {
    if (!trainFile) return;
    setProcessing(true);
    setProgress(0);
    setParseErrors([]);
    setAllRows([]);
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setPage(0);

    const { rows, errors, schema: detectedSchema } = await parseTrainCsvFile(
      trainFile, stations, (pct) => setProgress(pct)
    );

    setAllRows(rows);
    setParseErrors(errors);
    setSchema(detectedSchema);
    setProcessing(false);
  }

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function commitSearch(): void {
    setFilters((prev) => ({ ...prev, keyword: searchInput }));
    setPage(0);
  }

  function clearFilters(): void {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setPage(0);
  }

  const activeFilterCount =
    Object.entries(filters).filter(([k, v]) => k === "trainNumParity" ? v !== "all" : Boolean(v)).length;

  function handleExport(): void {
    const csv = rowsToCsvString(filteredRows, schema);
    triggerCsvDownload(csv, `train_data_filtered_${Date.now()}.csv`);
  }

  function handleExportDataset(rows: TrainDataRow[], label: string): void {
    const csv = rowsToCsvString(rows, schema);
    const safeDaop = targetDaop.replace(/[^0-9a-zA-Z]/g, "");
    triggerCsvDownload(csv, `daop${safeDaop}_${label}.csv`);
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="w-72 shrink-0 h-full bg-panel border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <button
              onClick={onBack}
              className="text-muted hover:text-white transition-colors mr-1"
              title="Back to App Home"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8,2 4,7 8,12" />
                <line x1="13" y1="7" x2="4" y2="7" />
              </svg>
            </button>
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h1 className="text-sm font-semibold text-white tracking-tight">Ticket Data Processor</h1>
          </div>
          <p className="text-xs text-muted/70 ml-7">Enrich rail passenger CSV with station lookup</p>
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-themed">
          {/* Upload section */}
          <div className="px-4 py-3 border-b border-border space-y-3">
            <span className="text-xs font-medium text-muted uppercase tracking-wider block">
              1. Upload Files
            </span>

            {/* Train CSV */}
            <div>
              <div className="text-xs text-muted mb-1">Raw Train CSV</div>
              <button
                onClick={() => trainInputRef.current?.click()}
                className={`w-full border border-dashed rounded-lg py-2 px-3 text-xs text-left transition-colors ${
                  trainFile
                    ? "border-amber-400/60 text-amber-400"
                    : "border-border text-muted hover:border-amber-400/60 hover:text-amber-400"
                }`}
              >
                {trainFile ? (
                  <span className="truncate block">{trainFile.name}</span>
                ) : (
                  "Click to upload train CSV…"
                )}
              </button>
              <input
                ref={trainInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setTrainFile(f);
                  setAllRows([]);
                  setFilters(EMPTY_FILTERS);
                  if (trainInputRef.current) trainInputRef.current.value = "";
                }}
              />
            </div>

            {/* Station DB CSV */}
            <div>
              <div className="text-xs text-muted mb-1">
                Station Database CSV
                <span className="ml-1 text-muted/50">(optional)</span>
              </div>
              <button
                onClick={() => stationInputRef.current?.click()}
                className={`w-full border border-dashed rounded-lg py-2 px-3 text-xs text-left transition-colors ${
                  stations.length > 0
                    ? "border-green-400/60 text-green-400"
                    : "border-border text-muted hover:border-accent/60 hover:text-accent"
                }`}
              >
                {stations.length > 0 ? (
                  <span className="truncate block">
                    {stationFile?.name ?? "Station DB"} ({stations.length} stations)
                  </span>
                ) : (
                  "Click to upload station DB…"
                )}
              </button>
              {stationError && (
                <div className="text-xs text-danger mt-1">{stationError}</div>
              )}
              {stations.length === 0 && !stationError && (
                <div className="text-xs text-muted/50 mt-1">
                  Without station DB, enriched columns will be empty.
                </div>
              )}
              <input
                ref={stationInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleStationFileChange}
              />
            </div>
          </div>

          {/* Process button + progress bar */}
          <div className="px-4 py-3 border-b border-border space-y-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wider block">
              2. Process
            </span>
            <button
              disabled={!trainFile || processing}
              onClick={handleProcess}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs rounded-lg py-2 transition-colors"
            >
              {processing ? `Parsing… ${progress}%` : "Process Data"}
            </button>
            {processing && (
              <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Export */}
          {hasResults && (
            <div className="px-4 py-3 border-b border-border space-y-3">
              <span className="text-xs font-medium text-muted uppercase tracking-wider block">
                3. Export
              </span>
              <div className="space-y-1.5">
                <div className="text-xs text-muted/70">Target DAOP for datasets below</div>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={targetDaop}
                  onChange={(e) => setTargetDaop(e.target.value)}
                  className="w-16 bg-surface border border-border rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-accent"
                />
              </div>

              {/* Dataset ① — BUSINESS AREA = DAOP N */}
              <div className="space-y-1">
                <div className="text-xs text-muted/60 leading-tight">
                  <span className="text-amber-400/80">①</span> BUSINESS AREA contains &quot;DAOP {targetDaop}&quot;
                </div>
                <button
                  onClick={() => handleExportDataset(daopSets.internal, `internal`)}
                  disabled={daopSets.internal.length === 0}
                  className="w-full border border-amber-400/40 hover:border-amber-400/80 text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg py-1.5 text-xs transition-colors"
                >
                  ↓ Dataset ① ({daopSets.internal.length.toLocaleString()} rows)
                </button>
              </div>

              {/* Dataset ② — DAOP TUJUAN = N, exclude BUSINESS AREA */}
              <div className="space-y-1">
                <div className="text-xs text-muted/60 leading-tight">
                  <span className="text-accent/80">②</span> DAOP TUJUAN = {targetDaop}, excl. DAOP {targetDaop} area
                </div>
                <button
                  onClick={() => handleExportDataset(daopSets.incoming, `incoming`)}
                  disabled={daopSets.incoming.length === 0}
                  className="w-full border border-accent/40 hover:border-accent/80 text-accent hover:text-accent-hover disabled:opacity-30 disabled:cursor-not-allowed rounded-lg py-1.5 text-xs transition-colors"
                >
                  ↓ Dataset ② ({daopSets.incoming.length.toLocaleString()} rows)
                </button>
              </div>

              {/* General filtered export */}
              <button
                onClick={handleExport}
                className="w-full border border-border/60 hover:border-border text-muted/70 hover:text-white rounded-lg py-1.5 text-xs transition-colors"
              >
                ↓ Export view ({filteredRows.length.toLocaleString()} rows)
              </button>
            </div>
          )}

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-danger/10 border border-danger/30">
              <div className="text-xs font-medium text-danger mb-1">
                Parse warnings ({parseErrors.length})
              </div>
              <div className="max-h-24 overflow-y-auto scrollbar-themed space-y-0.5">
                {parseErrors.slice(0, 20).map((e, i) => (
                  <div key={i} className="text-xs text-danger/70">{e}</div>
                ))}
                {parseErrors.length > 20 && (
                  <div className="text-xs text-muted/50">…and {parseErrors.length - 20} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 h-full flex flex-col overflow-hidden bg-surface relative">
        {processing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-surface/90 backdrop-blur-sm">
            <div className="text-sm font-semibold text-white/90 tabular-nums">
              Parsing CSV… {progress}%
            </div>
            <div className="w-64 h-2 bg-panel rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted/60">Processing rows, please wait</div>
          </div>
        )}

        {!hasResults ? (
          <EmptyState hasTrainFile={!!trainFile} />
        ) : (
          <>
            {/* Stats bar */}
            <div className="shrink-0 px-6 py-2.5 border-b border-border flex items-center gap-4 flex-wrap">
              <StatCard label="Total rows" value={allRows.length} color="text-white" />
              <div className="h-5 w-px bg-border" />
              <StatCard label="Filtered rows" value={filteredRows.length} color="text-amber-400" />
              <div className="h-5 w-px bg-border" />
              <StatCard
                label="Total pax (filtered)"
                value={filteredRows.reduce((s, r) => s + r.totalPassengers, 0)}
                color="text-accent"
              />
              {activeFilterCount > 0 && (
                <>
                  <div className="h-5 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/30 rounded-md px-2 py-0.5">
                      {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                    </span>
                    <button onClick={clearFilters} className="text-xs text-muted/60 hover:text-danger transition-colors">✕</button>
                  </div>
                </>
              )}
            </div>

            {/* Filter bar */}
            <div className="shrink-0 px-6 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
              {/* Keyword search + button */}
              <div className="relative flex items-center">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/40 pointer-events-none" width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="6" cy="6" r="4.5" />
                  <line x1="9.7" y1="9.7" x2="13" y2="13" />
                </svg>
                <input
                  type="text"
                  placeholder="Search keywords…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitSearch(); }}
                  className="bg-panel border border-border rounded-l-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-muted/30 focus:outline-none focus:border-accent w-48"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); setFilter("keyword", ""); }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-muted/40 hover:text-white"
                    title="Clear search"
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={commitSearch}
                  className="bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold px-3 py-1.5 rounded-r-lg border border-amber-400 transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>

              <div className="h-5 w-px bg-border mx-1" />

              {/* Train number parity filter */}
              <div className="flex items-center gap-0.5 bg-panel border border-border rounded-lg px-1.5 py-1">
                {(["all", "odd", "even"] as TrainNumParity[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setFilters((f) => ({ ...f, trainNumParity: v })); setPage(0); }}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors capitalize ${
                      filters.trainNumParity === v
                        ? "bg-amber-400/20 text-amber-400 border border-amber-400/40"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {v === "all" ? "All" : v === "odd" ? "Ganjil" : "Genap"}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-border mx-1" />

              {/* Dropdown filters */}
              {([
                { key: "daopAsal"     as keyof FilterState, label: "DAOP Asal",    opts: options.daopAsal },
                { key: "daopTujuan"   as keyof FilterState, label: "DAOP Tujuan",  opts: options.daopTujuan },
                { key: "businessArea" as keyof FilterState, label: "Business",     opts: options.businessArea },
                { key: "trainClass"   as keyof FilterState, label: "Class",        opts: options.trainClass },
                { key: "ket"          as keyof FilterState, label: "KET",          opts: options.ket },
              ]).map(({ key, label, opts }) => (
                <select
                  key={key}
                  value={filters[key]}
                  onChange={(e) => setFilter(key, e.target.value)}
                  className={`bg-panel border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-accent appearance-none cursor-pointer ${
                    filters[key] ? "border-amber-400/60 text-amber-400" : "border-border text-muted"
                  }`}
                  title={label}
                >
                  <option value="">{label}: All</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="ml-1 text-xs text-danger/70 hover:text-danger transition-colors whitespace-nowrap"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Data table */}
            <div className="flex-1 min-h-0 px-6 pt-3 overflow-auto scrollbar-themed">
              {filteredRows.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <div className="text-muted text-sm">No rows match the current filters.</div>
                  <button onClick={clearFilters} className="text-xs text-accent hover:underline transition-colors">Clear filters</button>
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border sticky top-0 bg-surface z-10">
                      <th className="text-left font-medium text-muted py-2 pr-3 w-8">#</th>
                      {activeColumns.map((col) => (
                        <th
                          key={col.key}
                          className={`text-left font-medium py-2 pr-3 whitespace-nowrap ${
                            col.enriched ? "text-accent/70" : "text-muted"
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => {
                      const globalIndex = safePage * PAGE_SIZE + i;
                      return (
                        <tr
                          key={globalIndex}
                          className="border-b border-border/40 hover:bg-panel/50 transition-colors"
                        >
                          <td className="py-1.5 pr-3 text-muted/50 tabular-nums">{globalIndex + 1}</td>
                          {activeColumns.map((col) => {
                            const v = row[col.key];
                            return (
                              <td
                                key={col.key}
                                className={`py-1.5 pr-3 whitespace-nowrap ${
                                  col.enriched ? "text-accent/90" : "text-white/80"
                                } ${
                                  col.key === "totalPassengers" || col.key === "capacity" || col.key === "wagon"
                                    ? "tabular-nums"
                                    : ""
                                }`}
                              >
                                {v === "" ? <span className="text-muted/30">—</span> : String(v)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination bar */}
            {filteredRows.length > 0 && (
              <div className="shrink-0 px-6 py-2 border-t border-border flex items-center gap-3">
                <button
                  disabled={safePage === 0}
                  onClick={() => setPage(0)}
                  className="text-xs text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1.5"
                  title="First page"
                >
                  «
                </button>
                <button
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="text-xs text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1.5"
                  title="Previous page"
                >
                  ‹
                </button>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={safePage + 1}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setPage(Math.min(Math.max(0, v - 1), totalPages - 1));
                    }}
                    className="w-12 bg-surface border border-border rounded px-1.5 py-0.5 text-white text-center focus:outline-none focus:border-accent"
                  />
                  <span className="text-muted">of {totalPages.toLocaleString()}</span>
                </div>

                <button
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="text-xs text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1.5"
                  title="Next page"
                >
                  ›
                </button>
                <button
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(totalPages - 1)}
                  className="text-xs text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1.5"
                  title="Last page"
                >
                  »
                </button>

                <span className="ml-auto text-xs text-muted/60 tabular-nums">
                  {(safePage * PAGE_SIZE + 1).toLocaleString()}–{Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length).toLocaleString()} of {filteredRows.length.toLocaleString()} rows
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ hasTrainFile }: { hasTrainFile: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-12">
      <div className="w-12 h-12 rounded-full bg-panel border border-border flex items-center justify-center mb-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      </div>
      <div className="text-sm font-medium text-white/80">
        {hasTrainFile ? "Click \u201cProcess Data\u201d to continue" : "Upload your train CSV to get started"}
      </div>
      <div className="text-xs text-muted/60 max-w-xs leading-relaxed">
        Upload the raw train data CSV and optionally the station database CSV, then click Process.
        Each row is enriched with{" "}
        <span className="text-accent">DAERAH ASAL</span>,{" "}
        <span className="text-accent">DAOP TUJUAN</span>, and{" "}
        <span className="text-accent">DAERAH TUJUAN</span>{" "}
        via the station lookup. Use the filter panel to narrow results before exporting.
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums leading-none ${color}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-muted/70 mt-0.5">{label}</div>
    </div>
  );
}
