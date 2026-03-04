import Papa from "papaparse";
import type { DesireLineRecord, FlowDirection } from "@/types";
import { generateId } from "@/utils/arcBuilder";

interface RawCsvRow {
  [key: string]: string;
}

function normalizeRow(
  row: RawCsvRow,
  index: number
): DesireLineRecord | null {
  const keys = Object.keys(row).map((k) => k.trim().toUpperCase());
  const values = Object.values(row).map((v) => v.trim());

  function get(candidates: string[]): string {
    for (const candidate of candidates) {
      const idx = keys.findIndex((k) => k.includes(candidate));
      if (idx !== -1) return values[idx] ?? "";
    }
    return "";
  }

  const origin = get(["ASAL", "ORIGIN", "FROM", "DARI"]);
  const destination = get([
    "TUJUAN",
    "DESTINATION",
    "TO",
    "DEST",
    "MENUJU",
  ]);
  const totalRaw = get([
    "TOTAL",
    "PENUMPANG",
    "PASSENGER",
    "JUMLAH",
    "COUNT",
    "VALUE",
  ]);
  const rankRaw = get(["PERINGKAT", "RANK", "NO", "NOMOR"]);

  if (!origin || !destination) return null;

  const totalPassengers = parseInt(totalRaw.replace(/[^0-9]/g, ""), 10);
  const rank = rankRaw ? parseInt(rankRaw, 10) : index + 1;

  if (isNaN(totalPassengers) || totalPassengers <= 0) return null;

  return {
    id: generateId(),
    rank: isNaN(rank) ? index + 1 : rank,
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    totalPassengers,
    direction: "NONE" as FlowDirection,
  };
}

export function parseMultiSectionPaste(raw: string): {
  records: DesireLineRecord[];
  errors: string[];
} {
  const SECTION_RE = /^(KELUAR|MASUK)$/i;
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  const hasHeaders = lines.some((l) => SECTION_RE.test(l));

  if (!hasHeaders) {
    return parsePastedText(raw);
  }

  const allRecords: DesireLineRecord[] = [];
  const allErrors: string[] = [];
  let currentDirection: FlowDirection = "NONE";
  let sectionLines: string[] = [];

  function flushSection(): void {
    if (sectionLines.length === 0) return;
    const { records, errors } = parsePastedText(sectionLines.join("\n"));
    records.forEach((r) => allRecords.push({ ...r, direction: currentDirection }));
    errors.forEach((e) => allErrors.push(e));
    sectionLines = [];
  }

  for (const line of lines) {
    if (SECTION_RE.test(line)) {
      flushSection();
      currentDirection = line.toUpperCase() as FlowDirection;
    } else if (line) {
      sectionLines.push(line);
    }
  }
  flushSection();

  return { records: allRecords, errors: allErrors };
}

export function parsePastedText(raw: string): {
  records: DesireLineRecord[];
  errors: string[];
} {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { records: [], errors: [] };

  const errors: string[] = [];
  const records: DesireLineRecord[] = [];

  const delimiter = lines[0].includes("\t") ? "\t" : ";";
  const split = (line: string) => line.split(delimiter).map((c) => c.trim());

  const firstCols = split(lines[0]).map((c) => c.toUpperCase());

  const hasHeader =
    firstCols.some((c) =>
      ["ASAL", "ORIGIN", "TUJUAN", "DESTINATION", "TOTAL", "PENUMPANG", "PERINGKAT", "RANK"].includes(c)
    );

  let originIdx = -1;
  let destIdx = -1;
  let totalIdx = -1;
  let rankIdx = -1;
  let dataStartLine = 0;

  if (hasHeader) {
    dataStartLine = 1;
    firstCols.forEach((col, i) => {
      if (["ASAL", "ORIGIN", "FROM", "DARI"].includes(col)) originIdx = i;
      else if (["TUJUAN", "DESTINATION", "TO", "DEST", "MENUJU"].includes(col)) destIdx = i;
      else if (col.includes("TOTAL") || col.includes("PENUMPANG") || col.includes("PASSENGER") || col.includes("JUMLAH")) totalIdx = i;
      else if (["PERINGKAT", "RANK", "NO", "NOMOR"].includes(col)) rankIdx = i;
    });
  } else {
    const cols = split(lines[0]);
    if (cols.length >= 4) {
      rankIdx = 0; originIdx = 1; destIdx = 2; totalIdx = 3;
    } else if (cols.length === 3) {
      originIdx = 0; destIdx = 1; totalIdx = 2;
    }
  }

  if (originIdx === -1 || destIdx === -1 || totalIdx === -1) {
    return {
      records: [],
      errors: ["Could not detect columns. Expected: Asal, Tujuan, Total Penumpang."],
    };
  }

  lines.slice(dataStartLine).forEach((line, i) => {
    const cols = split(line);
    const origin = cols[originIdx]?.toUpperCase() ?? "";
    const destination = cols[destIdx]?.toUpperCase() ?? "";
    const totalRaw = cols[totalIdx]?.replace(/[^0-9]/g, "") ?? "";
    const rankRaw = rankIdx >= 0 ? cols[rankIdx] : "";

    if (!origin || !destination) {
      errors.push(`Row ${i + 1} skipped: missing origin or destination.`);
      return;
    }

    const totalPassengers = parseInt(totalRaw, 10);
    if (isNaN(totalPassengers) || totalPassengers <= 0) {
      errors.push(`Row ${i + 1} skipped: invalid passenger count.`);
      return;
    }

    const rank = rankRaw ? parseInt(rankRaw, 10) : records.length + 1;

    records.push({
      id: generateId(),
      rank: isNaN(rank) ? records.length + 1 : rank,
      origin,
      destination,
      totalPassengers,
      direction: "NONE" as FlowDirection,
    });
  });

  return { records, errors };
}

export function parseCsvToRecords(file: File): Promise<{
  records: DesireLineRecord[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const errors: string[] = [];
        const records: DesireLineRecord[] = [];

        results.data.forEach((row, i) => {
          const record = normalizeRow(row, i);
          if (record) {
            records.push(record);
          } else {
            errors.push(`Row ${i + 1} skipped: missing required fields.`);
          }
        });

        resolve({ records, errors });
      },
      error(err) {
        resolve({ records: [], errors: [err.message] });
      },
    });
  });
}
