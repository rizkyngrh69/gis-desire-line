import type { ArcDatum, DesireLineRecord } from "@/types";
import { resolveCityCoordinate } from "@/data/cities";

export function buildArcData(records: DesireLineRecord[]): {
  arcs: ArcDatum[];
  unknownCities: string[];
} {
  const unknownSet = new Set<string>();
  const arcs: ArcDatum[] = [];

  for (const record of records) {
    const originCoord = resolveCityCoordinate(record.origin);
    const destCoord = resolveCityCoordinate(record.destination);

    if (!originCoord) unknownSet.add(record.origin);
    if (!destCoord) unknownSet.add(record.destination);
    if (!originCoord || !destCoord) continue;

    arcs.push({
      from: {
        name: originCoord.name,
        coordinates: [originCoord.longitude, originCoord.latitude],
      },
      to: {
        name: destCoord.name,
        coordinates: [destCoord.longitude, destCoord.latitude],
      },
      totalPassengers: record.totalPassengers,
      rank: record.rank,
      direction: record.direction ?? "NONE",
    });
  }

  return { arcs, unknownCities: Array.from(unknownSet) };
}

export function interpolateColor(
  t: number,
  startRgb: [number, number, number],
  endRgb: [number, number, number]
): [number, number, number] {
  return [
    Math.round(startRgb[0] + t * (endRgb[0] - startRgb[0])),
    Math.round(startRgb[1] + t * (endRgb[1] - startRgb[1])),
    Math.round(startRgb[2] + t * (endRgb[2] - startRgb[2])),
  ];
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}
