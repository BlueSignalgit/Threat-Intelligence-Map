import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { Indicator } from "./data";

import {
  WORLD_BOUNDS,
  TILE_URL,
  TILE_MAX_NATIVE_ZOOM,
  minimumWorldZoom,
} from "./map-policy";

export interface MapLabel {
  name: string;
  lat: number;
  lon: number;
  rank: number;
  kind: "country" | "city";
}

function MapLayers({
  indicators,
  world,
  labels,
}: {
  indicators: Indicator[];
  world?: GeoJsonObject;
  labels: MapLabel[];
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  useEffect(() => {
    map
      .getContainer()
      .setAttribute(
        "aria-label",
        `Interactive global threat map in English, zoom ${zoom}`,
      );
  }, [map, zoom]);
  useEffect(() => {
    const resize = () => {
      map.invalidateSize({ pan: false });
      map.setMinZoom(minimumWorldZoom(map.getSize().x));
      map.panInsideBounds(WORLD_BOUNDS, { animate: false });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    resize();
    return () => observer.disconnect();
  }, [map]);
  return (
    <>
      <TileLayer
        url={TILE_URL}
        className="blue-marble-tiles"
        maxNativeZoom={TILE_MAX_NATIVE_ZOOM}
        noWrap
        bounds={WORLD_BOUNDS}
        maxZoom={18}
        attribution='Imagery: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS / Blue Marble</a> · English labels and boundaries: <a href="https://www.naturalearthdata.com/">Natural Earth</a>'
      />
      {world && (
        <GeoJSON
          data={world}
          interactive={false}
          style={{
            color: "#394e63",
            weight: 1,
            fillColor: "#172d40",
            fillOpacity: 0.35,
          }}
        />
      )}
      {labels
        .filter((label) =>
          label.kind === "country"
            ? label.rank <= Math.max(2, zoom)
            : zoom >= 4 && (zoom >= 6 || label.rank <= 2),
        )
        .map((label) => (
          <CircleMarker
            key={`${label.kind}:${label.name}:${label.lon}`}
            center={[label.lat, label.lon]}
            radius={label.kind === "city" ? 2 : 0}
            interactive={false}
            pathOptions={{
              color: "#8bacc2",
              weight: 0,
              fillOpacity: label.kind === "city" ? 0.8 : 0,
            }}
          >
            <Tooltip
              permanent
              direction={label.kind === "country" ? "center" : "top"}
              opacity={1}
              className={`english-map-label ${label.kind}-label`}
            >
              {label.name}
            </Tooltip>
          </CircleMarker>
        ))}
      {indicators.map((r) => (
        <CircleMarker
          className="threat-marker"
          key={`${r.ip}:${r.port}`}
          center={[r.location!.lat, r.location!.lon]}
          radius={6}
          pathOptions={{
            color: "#f97365",
            fillColor: "#fb6559",
            fillOpacity: 0.7,
            weight: 1,
          }}
        >
          <Popup>
            <strong>
              {r.ip}:{r.port}
            </strong>
            <br />
            {r.malware} · {r.status}
            <br />
            {r.location!.country}
            <br />
            Source: Feodo Tracker
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export function ThreatMap({ indicators }: { indicators: Indicator[] }) {
  const [world, setWorld] = useState<GeoJsonObject>();
  const [labels, setLabels] = useState<MapLabel[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}data/world.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Boundaries unavailable");
        return r.json();
      })
      .then(setWorld)
      .catch(() => {});
    void fetch(`${import.meta.env.BASE_URL}data/map-labels.en.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("English labels unavailable");
        return r.json();
      })
      .then(setLabels)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <MapContainer
      center={[22, 10]}
      zoom={2}
      minZoom={2}
      maxZoom={18}
      scrollWheelZoom={false}
      worldCopyJump={false}
      maxBounds={WORLD_BOUNDS}
      maxBoundsViscosity={1}
      style={{ height: "100%", width: "100%" }}
      aria-label="Interactive global threat map in English"
    >
      <MapLayers indicators={indicators} world={world} labels={labels} />
    </MapContainer>
  );
}
