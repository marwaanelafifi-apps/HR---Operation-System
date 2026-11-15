// Office location and browser geolocation helpers for the attendance prototype.
// Stored in this browser only. A real backend phase moves this server-side.

export type OfficeLocation = { name: string; radius: string; lat?: number; lng?: number; mapsLink?: string };
export type Fix = { lat: number; lng: number; accuracy: number };
export type GeoFailure = "denied" | "unavailable" | "timeout" | "unsupported";

export const officeKey = "opshub-demo-company-location";
export const unlockKey = "opshub-demo-attendance-unlocks";
export const defaultOffice: OfficeLocation = { name: "B Investment For Real Estate, المجاورة ٢, عمارة ٢٨١, First 6th of October, 6th of October City (2), Giza 3225715", radius: "150" };

export function loadOffice(): OfficeLocation {
  try {
    return { ...defaultOffice, ...JSON.parse(window.localStorage.getItem(officeKey) ?? "{}") };
  } catch {
    return defaultOffice;
  }
}

export function saveOffice(office: OfficeLocation) {
  try { window.localStorage.setItem(officeKey, JSON.stringify(office)); } catch { /* storage unavailable */ }
}

export function loadUnlocks(): Record<string, boolean> {
  try { return JSON.parse(window.localStorage.getItem(unlockKey) ?? "{}"); } catch { return {}; }
}

export function saveUnlocks(unlocks: Record<string, boolean>) {
  try { window.localStorage.setItem(unlockKey, JSON.stringify(unlocks)); } catch { /* storage unavailable */ }
}

/** Great-circle distance in metres (haversine). */
export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** One-shot, foreground location read. Only call it from a click handler. */
export function getPosition(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject("unsupported" as GeoFailure);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject((e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable") as GeoFailure),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/** True for share links like maps.app.goo.gl/xyz that hide the coordinates behind a redirect. */
export function isShortMapsLink(input: string) {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(input);
}

/** Reads coordinates from a Google Maps URL or a plain "lat, lng" pair. Returns null when none are found. */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  let text = input.trim();
  if (!text) return null;
  try { text = decodeURIComponent(text); } catch { /* keep the raw text */ }
  const n = "(-?\\d+(?:\\.\\d+)?)";
  const patterns = [
    new RegExp(`!3d${n}!4d${n}`), // the dropped pin, most exact
    new RegExp(`@${n},${n}`), // map centre
    new RegExp(`[?&](?:q|ll|query|destination|center)=${n}\\s*,\\s*${n}`),
    new RegExp(`/place/${n},${n}`),
    new RegExp(`^${n}\\s*[,\\s]\\s*${n}$`), // plain "29.9285, 30.9188"
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

export function formatDistance(metres: number) {
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}
