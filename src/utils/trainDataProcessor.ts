import Papa from "papaparse";
import type { StationRecord, TrainDataRow } from "@/types";

type RawRow = Record<string, string>;

export type CsvSchema = "daop2" | "daop3";

export function detectCsvSchema(normalizedHeaders: string[]): CsvSchema {
  return normalizedHeaders.some((h) =>
    h === "PSG KM" || h === "PSGKM" || h === "OCCUPANCY" || h === "REVENUE"
  ) ? "daop3" : "daop2";
}

function normalizeHeaders(rawHeaders: string[]): string[] {
  return rawHeaders.map((h) => h.trim().toUpperCase());
}

function findColumnIndex(normalizedHeaders: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = normalizedHeaders.findIndex((k) => k === candidate);
    if (idx !== -1) return idx;
  }
  for (const candidate of candidates) {
    const idx = normalizedHeaders.findIndex((k) => k.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

function buildStationLookup(stations: StationRecord[]): Map<string, StationRecord> {
  const map = new Map<string, StationRecord>();
  for (const s of stations) {
    map.set(s.singkatan.toUpperCase().trim(), s);
  }
  return map;
}

export function parseStationCsvFile(file: File): Promise<StationRecord[]> {
  return new Promise((resolve) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const records = results.data
          .map((row) => {
            const singkatan = (row["SINGKATAN"] ?? row["singkatan"] ?? "").trim().toUpperCase();
            const kab_kota  = (row["Daerah"] ?? row["kab_kota"] ?? "").trim();
            const stasiun   = (row["stasiun"] ?? "").trim();
            const daop      = parseInt(row["daop"] ?? "0", 10);
            return { singkatan, daop, kab_kota, stasiun };
          })
          .filter((s) => s.singkatan.length > 0 && !isNaN(s.daop));
        resolve(records);
      },
    });
  });
}

type ColIdx = {
  trainNum: number; trainName: number; depart: number; arrival: number;
  business: number; org: number; des: number; trainClass: number;
  capacity: number; wagon: number; total: number; tanggal: number;
  daopAsal: number; kelas: number; ket: number;
  psgKm: number; occupancy: number; revenue: number; pointRevenue: number; nettRevenue: number;
};

function buildColIdx(normalized: string[]): ColIdx {
  return {
    trainNum:   findColumnIndex(normalized, ["TRAIN NUM", "NO KA", "TRAIN_NUM", "NOKA", "NO"]),
    trainName:  findColumnIndex(normalized, ["TRAIN NAME", "NAMA KA", "TRAIN_NAME", "NAMAKA", "NAME"]),
    depart:     findColumnIndex(normalized, ["DEPART TIME", "JAM BERANGKAT", "DEPART_TIME", "DEPART"]),
    arrival:    findColumnIndex(normalized, ["ARRIVAL TIME", "JAM TIBA", "ARRIVAL_TIME", "ARRIVAL"]),
    business:   findColumnIndex(normalized, ["BUSINESS AREA", "BUSINESS_AREA", "BUSINESS", "BA"]),
    org:        findColumnIndex(normalized, ["ORG", "ORIGIN", "STASIUN ASAL", "ASAL"]),
    des:        findColumnIndex(normalized, ["DES", "DEST", "DESTINATION", "TUJUAN", "STASIUN TUJUAN"]),
    trainClass: findColumnIndex(normalized, ["CLASS"]),
    capacity:   findColumnIndex(normalized, ["CAPACITY", "CAPACIT", "KAPASITAS"]),
    wagon:      findColumnIndex(normalized, ["WAGON", "GERBONG"]),
    total:      findColumnIndex(normalized, ["TOTAL PASSENGERS", "TOTAL P", "TOTAL_P", "TOTAL", "PENUMPANG", "JUMLAH"]),
    tanggal:    findColumnIndex(normalized, ["TANGGAL", "TGGL", "DATE", "TGL"]),
    daopAsal:     findColumnIndex(normalized, ["DAOP ASAL", "DAOP_ASAL", "DAOP AS", "DAOP A"]),
    kelas:        findColumnIndex(normalized, ["KELAS"]),
    ket:          findColumnIndex(normalized, ["KET", "KETERANGAN", "CATATAN"]),
    psgKm:        findColumnIndex(normalized, ["PSG KM", "PSG_KM", "PSGKM", "PASSENGER KM"]),
    occupancy:    findColumnIndex(normalized, ["OCCUPANCY", "OCCUPAN", "LOAD FACTOR", "LOAD_FACTOR", "OCC"]),
    revenue:      findColumnIndex(normalized, ["REVENUE"]),
    pointRevenue: findColumnIndex(normalized, ["POINT REVENUE", "POINT REV", "POINT_REVENUE", "POINT_REV"]),
    nettRevenue:  findColumnIndex(normalized, ["NETT REVENUE", "NETT REVE", "NETT_REVENUE", "NET REVENUE", "NET_REVENUE"]),
  };
}

function mapRawRow(
  rawRow: RawRow,
  rawHeaders: string[],
  colIdx: ColIdx,
  lookup: Map<string, StationRecord>,
  rowIndex: number,
  errors: string[]
): TrainDataRow {
  const vals = rawHeaders.map((h) => (rawRow[h] ?? "").trim());
  const val = (idx: number): string => (idx >= 0 ? (vals[idx] ?? "") : "");

  const org = val(colIdx.org).toUpperCase();
  const des = val(colIdx.des).toUpperCase();

  if (!org && !des) errors.push(`Row ${rowIndex + 1} skipped: missing ORG and DES.`);

  const orgStation = lookup.get(org);
  const desStation = lookup.get(des);
  const totalRaw    = val(colIdx.total).replace(/[^0-9]/g, "");
  const totalPax    = totalRaw ? parseInt(totalRaw, 10) : 0;
  const rawDaopAsal = val(colIdx.daopAsal);

  return {
    trainNum:        val(colIdx.trainNum),
    trainName:       val(colIdx.trainName),
    departTime:      val(colIdx.depart),
    arrivalTime:     val(colIdx.arrival),
    businessArea:    val(colIdx.business),
    org,
    des,
    trainClass:      val(colIdx.trainClass),
    capacity:        parseInt(val(colIdx.capacity).replace(/[^0-9]/g, "") || "0", 10),
    wagon:           parseInt(val(colIdx.wagon).replace(/[^0-9]/g, "") || "0", 10),
    totalPassengers: isNaN(totalPax) ? 0 : totalPax,
    tanggal:         val(colIdx.tanggal),
    daopAsal:        rawDaopAsal || (orgStation ? String(orgStation.daop) : ""),
    kelas:           val(colIdx.kelas),
    ket:             val(colIdx.ket),
    psgKm:           val(colIdx.psgKm),
    occupancy:       val(colIdx.occupancy),
    revenue:         val(colIdx.revenue),
    pointRevenue:    val(colIdx.pointRevenue),
    nettRevenue:     val(colIdx.nettRevenue),
    daerahAsal:      orgStation?.kab_kota ?? "",
    daopTujuan:      desStation ? String(desStation.daop) : "",
    daerahTujuan:    desStation?.kab_kota ?? "",
  };
}

export function parseTrainCsvFile(
  file: File,
  stations: StationRecord[],
  onProgress?: (pct: number) => void
): Promise<{ rows: TrainDataRow[]; errors: string[]; schema: CsvSchema }> {
  return new Promise((resolve) => {
    const lookup      = buildStationLookup(stations);
    const accumRows: TrainDataRow[] = [];
    const accumErrors: string[]     = [];
    let colIdx: ColIdx | null = null;
    let rawHeaders: string[]  = [];
    let rowIndex = 0;
    let schema: CsvSchema     = "daop2";

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 64, 
      chunk(results) {
        if (results.data.length === 0) return;
        if (colIdx === null) {
          rawHeaders       = Object.keys(results.data[0]);
          const normalized = normalizeHeaders(rawHeaders);
          colIdx = buildColIdx(normalized);
          schema = detectCsvSchema(normalized);
        }

        for (const rawRow of results.data) {
          accumRows.push(mapRawRow(rawRow, rawHeaders, colIdx, lookup, rowIndex, accumErrors));
          rowIndex++;
        }
        if (onProgress && results.meta.cursor !== undefined) {
          onProgress(Math.min(99, Math.round((results.meta.cursor / file.size) * 100)));
        }
      },
      complete() {
        onProgress?.(100);
        resolve({ rows: accumRows, errors: accumErrors, schema });
      },
      error(err) {
        resolve({ rows: accumRows, errors: [err.message, ...accumErrors], schema });
      },
    });
  });
}

export function filterTrainData(
  rows: TrainDataRow[],
  targetDaop: string
): { internal: TrainDataRow[]; incoming: TrainDataRow[] } {
  const internal = rows.filter((r) => String(r.daopAsal) === targetDaop);
  const incoming = rows.filter(
    (r) => String(r.daopTujuan) === targetDaop && String(r.daopAsal) !== targetDaop
  );
  return { internal, incoming };
}

const CSV_EXPORT_DAOP2: ReadonlyArray<string> = [
  "TRAIN NUMBER", "TRAIN NAME", "DEPART TIME", "ARRIVAL TIME", "BUSINESS AREA",
  "ORG", "DES", "CLASS", "CAPACITY", "WAGON", "TOTAL PSG",
  "TANGGAL", "DAOP ASAL", "KELAS 2", "KET",
  "DAERAH ASAL", "DAOP TUJUAN", "DAERAH TUJUAN",
];

const CSV_EXPORT_DAOP3: ReadonlyArray<string> = [
  "TRAIN NUMBER", "TRAIN NAME", "DEPART TIME", "ARRIVAL TIME", "BUSINESS AREA",
  "ORG", "DES", "CLASS", "CAPACITY", "WAGON", "TOTAL PSG",
  "PSG KM", "OCCUPANCY", "REVENUE", "POINT REVENUE", "NETT REVENUE",
  "DAERAH ASAL", "DAOP TUJUAN", "DAERAH TUJUAN",
];

function escapeField(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function rowsToCsvString(rows: TrainDataRow[], schema: CsvSchema = "daop2"): string {
  const headers = schema === "daop3" ? CSV_EXPORT_DAOP3 : CSV_EXPORT_DAOP2;
  const body = rows
    .map((r) => {
      const fields = schema === "daop3"
        ? [
            r.trainNum, r.trainName, r.departTime, r.arrivalTime, r.businessArea,
            r.org, r.des, r.trainClass, r.capacity, r.wagon, r.totalPassengers,
            r.psgKm, r.occupancy, r.revenue, r.pointRevenue, r.nettRevenue,
            r.daerahAsal, r.daopTujuan, r.daerahTujuan,
          ]
        : [
            r.trainNum, r.trainName, r.departTime, r.arrivalTime, r.businessArea,
            r.org, r.des, r.trainClass, r.capacity, r.wagon, r.totalPassengers,
            r.tanggal, r.daopAsal, r.kelas, r.ket,
            r.daerahAsal, r.daopTujuan, r.daerahTujuan,
          ];
      return fields.map(escapeField).join(",");
    })
    .join("\n");
  return `${headers.join(",")}\n${body}`;
}

export function triggerCsvDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
