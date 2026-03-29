/**
 * High-contrast “field friendly” palette: light backgrounds, deep green actions,
 * and solid secondary text for older users and outdoor viewing.
 */
export const theme = {
  bg: "#eef2e8",
  fg: "#1b2319",
  fgMuted: "#3d5240",
  onAccent: "#ffffff",
  accent: "#1b6b36",
  accentSoft: "rgba(27, 107, 54, 0.14)",
  accentBorder: "rgba(27, 107, 54, 0.45)",
  surface: "#ffffff",
  surfaceAlt: "#f4f7f2",
  border: "rgba(27, 35, 25, 0.12)",
  borderStrong: "rgba(27, 35, 25, 0.18)",
  tabBarBg: "#dde5d8",
  tabBarBorder: "rgba(27, 35, 25, 0.12)",
  link: "#0d5c24",
  price: "#8a4b00",
  success: "#1b6b36",
  warn: "#b42318",
  chipInactiveFg: "#2a3d2c",
  placeholder: "rgba(61, 82, 64, 0.45)",
} as const;

/**
 * Line height for Myanmar script (stacked consonants / vowel signs need extra vertical room).
 * Use on mobile anywhere Burmese strings render so glyphs are not clipped.
 */
export function myLh(fontSize: number): number {
  return Math.round(fontSize * 1.52);
}
