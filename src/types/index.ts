export type FlowDirection = "KELUAR" | "MASUK" | "NONE";
export type LineWeightMode = "weighted" | "uniform";
export type ArrowStyle = "none" | "arrowhead";

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
