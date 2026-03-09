export type FlowDirection = "KELUAR" | "MASUK" | "NONE";
export type LineWeightMode = "weighted" | "uniform";
export type ArrowStyle = "none" | "arrowhead";
export type AppMode = "launcher" | "desire-lines" | "train-processor";

export interface DesireLineRecord {
  id: string;
  rank: number;
  origin: string;
  destination: string;
  totalPassengers: number;
  direction: FlowDirection;
}

export interface CityCoordinate {
  name: string;
  longitude: number;
  latitude: number;
}

export interface ArcDatum {
  from: { name: string; coordinates: [number, number] };
  to: { name: string; coordinates: [number, number] };
  totalPassengers: number;
  rank: number;
  direction: FlowDirection;
}

export type DirectionMode = "KELUAR" | "MASUK" | "BOTH";

export interface AppState {
  records: DesireLineRecord[];
  directionMode: DirectionMode;
  maxArcWidth: number;
  showLabels: boolean;
  unknownCities: string[];
}

export interface StationRecord {
  singkatan: string;
  daop: number;
  kab_kota: string;
  stasiun: string;
}

export interface TrainDataRow {
  trainNum: string;
  trainName: string;
  departTime: string;
  arrivalTime: string;
  businessArea: string;
  org: string;
  des: string;
  trainClass: string;
  capacity: number;
  wagon: number;
  totalPassengers: number;
  tanggal: string;
  daopAsal: string;
  kelas: string;
  ket: string;
  psgKm: string;
  occupancy: string;
  revenue: string;
  pointRevenue: string;
  nettRevenue: string;
  daerahAsal: string;
  daopTujuan: string;
  daerahTujuan: string;
}
