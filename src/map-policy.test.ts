import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  minimumWorldZoom,
  WORLD_BOUNDS,
  TILE_URL,
  TILE_MAX_NATIVE_ZOOM,
} from "./map-policy";
describe("single-world English map", () => {
  it("keeps the viewport no wider than one world at minimum zoom", () => {
    for (const width of [320, 768, 1024, 1440, 2560, 3840]) {
      expect(256 * 2 ** minimumWorldZoom(width)).toBeGreaterThanOrEqual(width);
    }
    expect(WORLD_BOUNDS[0][1]).toBe(-180);
    expect(WORLD_BOUNDS[1][1]).toBe(180);
  });
  it("requests label-free tiles and bundles English country/city names", () => {
    expect(new URL(TILE_URL).hostname).toBe("gibs.earthdata.nasa.gov");
    expect(TILE_URL).toContain("/BlueMarble_ShadedRelief_Bathymetry/");
    expect(TILE_URL).toContain("/{z}/{y}/{x}.jpeg");
    expect(TILE_MAX_NATIVE_ZOOM).toBe(8);
    const labels = JSON.parse(
      readFileSync("public/data/map-labels.en.json", "utf8"),
    ) as { name: string; lat: number; lon: number; kind: string }[];
    for (const name of [
      "Russia",
      "United States of America",
      "Beijing",
      "Cairo",
      "Moscow",
      "London",
    ]) {
      expect(labels.some((label) => label.name === name)).toBe(true);
    }
    for (const label of labels) {
      expect(label.name).toBeTruthy();
      expect(label.lat).toBeGreaterThanOrEqual(-90);
      expect(label.lat).toBeLessThanOrEqual(90);
      expect(label.lon).toBeGreaterThanOrEqual(-180);
      expect(label.lon).toBeLessThanOrEqual(180);
    }
  });
});
