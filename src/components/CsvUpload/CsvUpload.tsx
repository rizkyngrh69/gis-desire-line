"use client";

import { useRef, useState } from "react";
import type { DesireLineRecord } from "@/types";
import { parseCsvToRecords, parseMultiSectionPaste } from "@/utils/csvParser";

interface CsvUploadProps {
  onImport: (records: DesireLineRecord[]) => void;
  mode: "replace" | "append";
  onModeChange: (mode: "replace" | "append") => void;
}

export default function CsvUpload({
  onImport,
  mode,
  onModeChange,
}: CsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const { records, errors } = await parseCsvToRecords(file);
    if (errors.length > 0) console.warn("CSV parse warnings:", errors);
    onImport(records);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handlePasteImport(): void {
    const { records, errors } = parseMultiSectionPaste(pasteText);
    if (records.length === 0) {
      setPasteError(
        errors[0] ?? "No valid rows found. Check column format."
      );
      return;
    }
    setPasteError(null);
    setPasteText("");
    setPasteOpen(false);
    onImport(records);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-0.5 bg-surface rounded-lg">
        {(["replace", "append"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex-1 text-xs py-1 rounded-md transition-colors capitalize ${
              mode === m
                ? "bg-accent text-white"
                : "text-muted hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 border border-dashed border-border hover:border-accent/60 rounded-lg py-2 text-xs text-muted hover:text-accent transition-colors"
        >
          Upload CSV
        </button>
        <button
          onClick={() => { setPasteOpen((v) => !v); setPasteError(null); }}
          className={`flex-1 border border-dashed rounded-lg py-2 text-xs transition-colors ${
            pasteOpen
              ? "border-accent text-accent"
              : "border-border text-muted hover:border-accent/60 hover:text-accent"
          }`}
        >
          Paste data
        </button>
      </div>

      {pasteOpen && (
        <div className="space-y-1.5">
          <textarea
            autoFocus
            rows={7}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Peringkat\tAsal\tTujuan\tTotal Penumpang\n1\tBANDUNG\tJAKARTA\t2631\n2\tCIREBON\tJAKARTA\t2044`}
            className="w-full bg-surface border border-border rounded-lg p-2 text-xs text-white font-mono placeholder:text-muted/30 focus:outline-none focus:border-accent resize-none"
          />
          {pasteError && (
            <div className="text-xs text-danger">{pasteError}</div>
          )}
          <button
            disabled={!pasteText.trim()}
            onClick={handlePasteImport}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg py-1.5 transition-colors"
          >
            Import
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
