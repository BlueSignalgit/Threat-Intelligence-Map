export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-85.05112878, -180],
  [85.05112878, 180],
];
export const TILE_URL =
  "https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png";
export function minimumWorldZoom(width: number) {
  return Math.max(2, Math.ceil(Math.log2(Math.max(256, width) / 256)));
}
