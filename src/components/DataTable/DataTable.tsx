"use client";

import { useState } from "react";
import type { DesireLineRecord, FlowDirection } from "@/types";
import { generateId } from "@/utils/arcBuilder";

const DIRECTION_DOT: Record<FlowDirection, string> = {
  KELUAR: "#fb923c",
  MASUK:  "#34d399",
  NONE:   "#6366f1",
};

interface DataTableProps {
  records: DesireLineRecord[];
  onRecordsChange: (records: DesireLineRecord[]) => void;
}

interface EditingCell {
  id: string;
  field: keyof DesireLineRecord;
}

export default function DataTable({ records, onRecordsChange }: DataTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  function addRow(): void {
    const maxRank = records.reduce((m, r) => Math.max(m, r.rank), 0);
    const newRecord: DesireLineRecord = {
      id: generateId(),
      rank: maxRank + 1,
      origin: "",
      destination: "",
      totalPassengers: 0,
      direction: "NONE",
    };
    onRecordsChange([...records, newRecord]);
  }

  function deleteRow(id: string): void {
    onRecordsChange(records.filter((r) => r.id !== id));
  }

  function clearAll(): void {
    onRecordsChange([]);
  }

  function startEdit(id: string, field: keyof DesireLineRecord, currentValue: string | number): void {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  }

  function commitEdit(id: string, field: keyof DesireLineRecord): void {
    const updated = records.map((r) => {
      if (r.id !== id) return r;
      if (field === "totalPassengers" || field === "rank") {
        const parsed = parseInt(editValue, 10);
        return { ...r, [field]: isNaN(parsed) ? r[field] : parsed };
      }
      return { ...r, [field]: editValue.toUpperCase().trim() };
    });
    onRecordsChange(updated);
    setEditingCell(null);
  }

  function handleKeyDown(
    e: React.KeyboardEvent,
    id: string,
    field: keyof DesireLineRecord
  ): void {
    if (e.key === "Enter") commitEdit(id, field);
    if (e.key === "Escape") setEditingCell(null);
  }

  const EditableCell = ({
    record,
    field,
    align = "left",
  }: {
    record: DesireLineRecord;
    field: keyof DesireLineRecord;
    align?: "left" | "right" | "center";
  }) => {
    const isEditing =
      editingCell?.id === record.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-full bg-surface border border-accent rounded px-2 py-0.5 text-xs text-white focus:outline-none"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(record.id, field)}
          onKeyDown={(e) => handleKeyDown(e, record.id, field)}
        />
      );
    }

    return (
      <span
        className={`block w-full cursor-pointer hover:text-accent transition-colors text-${align}`}
        onClick={() => startEdit(record.id, field, record[field])}
      >
        {field === "totalPassengers"
          ? Number(record[field]).toLocaleString()
          : String(record[field]) || <span className="text-muted/40">—</span>}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-xs text-muted">
          {records.length} records
        </span>
        <div className="flex gap-2">
          {records.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-danger/70 hover:text-danger transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={addRow}
            className="text-xs bg-accent hover:bg-accent-hover text-white rounded px-2 py-0.5 transition-colors"
          >
            + Add row
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-border scrollbar-themed">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-panel z-10">
            <tr className="border-b border-border">
              <th className="text-left px-2 py-2 text-muted font-medium w-10">
                #
              </th>
              <th className="text-left px-2 py-2 text-muted font-medium">
                Asal
              </th>
              <th className="text-left px-2 py-2 text-muted font-medium">
                Tujuan
              </th>
              <th className="text-right px-2 py-2 text-muted font-medium">
                Penumpang
              </th>
              <th className="w-6 px-2" />
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr
                key={record.id}
                className="border-b border-border/50 hover:bg-white/5 transition-colors"
              >
                <td className="px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: DIRECTION_DOT[record.direction ?? "NONE"] }}
                      title={record.direction ?? "NONE"}
                    />
                    <span className="text-muted">{idx + 1}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-white">
                  <EditableCell record={record} field="origin" />
                </td>
                <td className="px-2 py-1.5 text-white">
                  <EditableCell record={record} field="destination" />
                </td>
                <td className="px-2 py-1.5 text-white text-right">
                  <EditableCell
                    record={record}
                    field="totalPassengers"
                    align="right"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => deleteRow(record.id)}
                    className="text-muted/40 hover:text-danger transition-colors leading-none"
                    title="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {records.length === 0 && (
          <div className="py-8 text-center text-muted/50 text-xs">
            No data. Add rows or upload a CSV.
          </div>
        )}
      </div>
    </div>
  );
}
