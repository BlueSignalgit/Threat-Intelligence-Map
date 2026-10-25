export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-85.05112878, -180],
  [85.05112878, 180],
];
export const TILE_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";
// Blue Marble provides native zoom levels 0–8; Leaflet scales those tiles above 8.
export const TILE_MAX_NATIVE_ZOOM = 8;
export function minimumWorldZoom(width: number) {
  return Math.max(2, Math.ceil(Math.log2(Math.max(256, width) / 256)));
}
