import type { CityCoordinate } from "@/types";

/** Station-grade coordinate table — Java rail + KAI network cities */
export const CITY_COORDINATES: Record<string, CityCoordinate> = {
  // ── West Java / Banten / Jakarta ─────────────────────────────────────────
  JAKARTA:     { name: "Jakarta",     longitude: 106.8456, latitude: -6.2088 },
  BEKASI:      { name: "Bekasi",      longitude: 106.9896, latitude: -6.2349 },
  CIKAMPEK:    { name: "Cikampek",    longitude: 107.4610, latitude: -6.4013 },
  KARAWANG:    { name: "Karawang",    longitude: 107.3014, latitude: -6.3216 },
  PURWAKARTA:  { name: "Purwakarta",  longitude: 107.4355, latitude: -6.5561 },
  SUBANG:      { name: "Subang",      longitude: 107.7584, latitude: -6.5706 },
  BANDUNG:     { name: "Bandung",     longitude: 107.6191, latitude: -6.9175 },
  CIMAHI:      { name: "Cimahi",      longitude: 107.5427, latitude: -6.8841 },
  GARUT:       { name: "Garut",       longitude: 107.9061, latitude: -7.2158 },
  TASIKMALAYA: { name: "Tasikmalaya", longitude: 108.2207, latitude: -7.3274 },
  CIAMIS:      { name: "Ciamis",      longitude: 108.3540, latitude: -7.3297 },
  BANJAR:      { name: "Banjar",      longitude: 108.5416, latitude: -7.3704 },
  CIREBON:     { name: "Cirebon",     longitude: 108.5570, latitude: -6.7063 },
  INDRAMAYU:   { name: "Indramayu",   longitude: 108.3215, latitude: -6.3276 },

  // ── Central Java / Banyumas ───────────────────────────────────────────────
  BREBES:      { name: "Brebes",      longitude: 109.0344, latitude: -6.8722 },
  TEGAL:       { name: "Tegal",       longitude: 109.1256, latitude: -6.8694 },
  PEMALANG:    { name: "Pemalang",    longitude: 109.3756, latitude: -6.8935 },
  PEKALONGAN:  { name: "Pekalongan",  longitude: 109.6753, latitude: -6.8969 },
  BATANG:      { name: "Batang",      longitude: 109.7297, latitude: -6.9082 },
  KENDAL:      { name: "Kendal",      longitude: 110.2018, latitude: -6.9218 },
  SEMARANG:    { name: "Semarang",    longitude: 110.4203, latitude: -6.9932 },
  GROBOGAN:    { name: "Grobogan",    longitude: 110.9162, latitude: -7.0082 },
  BLORA:       { name: "Blora",       longitude: 111.4143, latitude: -6.9647 },
  BANYUMAS:    { name: "Banyumas",    longitude: 109.2313, latitude: -7.5264 },
  CILACAP:     { name: "Cilacap",     longitude: 108.8382, latitude: -7.7298 },
  KEBUMEN:     { name: "Kebumen",     longitude: 109.6527, latitude: -7.6826 },
  PURWOREJO:   { name: "Purworejo",   longitude: 110.0267, latitude: -7.7148 },

  // ── DIY Yogyakarta ────────────────────────────────────────────────────────
  YOGYAKARTA:  { name: "Yogyakarta",  longitude: 110.3688, latitude: -7.7971 },
  KULON_PROGO: { name: "Kulon Progo", longitude: 110.1616, latitude: -7.8269 },

  // ── Solo / Surakarta corridor ─────────────────────────────────────────────
  KLATEN:      { name: "Klaten",      longitude: 110.6107, latitude: -7.7069 },
  // SOLO and SURAKARTA resolve to the same station
  SOLO:        { name: "Surakarta",   longitude: 110.8243, latitude: -7.5657 },
  SURAKARTA:   { name: "Surakarta",   longitude: 110.8243, latitude: -7.5657 },
  SRAGEN:      { name: "Sragen",      longitude: 110.9875, latitude: -7.4257 },
  NGAWI:       { name: "Ngawi",       longitude: 111.4415, latitude: -7.4007 },

  // ── East Java ─────────────────────────────────────────────────────────────
  BOJONEGORO:  { name: "Bojonegoro",  longitude: 111.8815, latitude: -7.1503 },
  LAMONGAN:    { name: "Lamongan",    longitude: 112.3922, latitude: -7.1168 },
  NGANJUK:     { name: "Nganjuk",     longitude: 111.9015, latitude: -7.6044 },
  MADIUN:      { name: "Madiun",      longitude: 111.5203, latitude: -7.6298 },
  KEDIRI:      { name: "Kediri",      longitude: 112.0164, latitude: -7.8274 },
  BLITAR:      { name: "Blitar",      longitude: 112.1595, latitude: -8.0957 },
  TULUNGAGUNG: { name: "Tulungagung", longitude: 111.9032, latitude: -8.0656 },
  MOJOKERTO:   { name: "Mojokerto",   longitude: 112.4312, latitude: -7.4722 },
  JOMBANG:     { name: "Jombang",     longitude: 112.2238, latitude: -7.5483 },
  SURABAYA:    { name: "Surabaya",    longitude: 112.7521, latitude: -7.2575 },
  SIDOARJO:    { name: "Sidoarjo",    longitude: 112.7180, latitude: -7.4458 },
  MALANG:      { name: "Malang",      longitude: 112.6304, latitude: -7.9803 },
  PASURUAN:    { name: "Pasuruan",    longitude: 112.9083, latitude: -7.6458 },
  PROBOLINGGO: { name: "Probolinggo", longitude: 113.2189, latitude: -7.7543 },
  LUMAJANG:    { name: "Lumajang",    longitude: 113.2226, latitude: -8.1342 },
  JEMBER:      { name: "Jember",      longitude: 113.7278, latitude: -8.1724 },
  BANYUWANGI:  { name: "Banyuwangi",  longitude: 114.3699, latitude: -8.2197 },
};

export function resolveCityCoordinate(
  cityName: string
): CityCoordinate | null {
  const normalized = cityName.trim().toUpperCase().replace(/\s+/g, "_");
  return CITY_COORDINATES[normalized] ?? null;
}

export function getAllCityNames(): string[] {
  return Object.values(CITY_COORDINATES).map((c) => c.name);
}
