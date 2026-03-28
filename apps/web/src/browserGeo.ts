/** Geolocation works in a secure context or on http://localhost only. */
export function canUseBrowserGeolocation(): boolean {
  if (typeof navigator === "undefined" || !navigator.geolocation) return false;
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export const BROWSER_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 25_000,
  maximumAge: 300_000,
};
