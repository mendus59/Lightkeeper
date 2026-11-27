import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Lighthouse } from "./types";

interface Props {
  lights: Lighthouse[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function FlyTo({ target }: { target: Lighthouse | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 6), { duration: 0.8 });
  }, [target, map]);
  return null;
}

// Leaflet paints markers with SVG attributes, so read the theme colours from CSS once.
function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function LighthouseMap({ lights, selected, onSelect }: Props) {
  const target = lights.find((l) => l.id === selected);
  const colors = {
    lamp: cssVar("--lamp", "#d98a0b"),
    stay: cssVar("--stay", "#1c6e6a"),
    paper: cssVar("--paper", "#ffffff"),
    ink: cssVar("--ink", "#14212b"),
  };
  return (
    <div className="mapbox">
      <MapContainer center={[39.5, -98.35]} zoom={4} minZoom={2} scrollWheelZoom={false} preferCanvas className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lights.map((l) => {
          const sel = l.id === selected;
          return (
            <CircleMarker
              key={l.id}
              center={[l.lat, l.lon]}
              radius={sel ? 9 : 6}
              pathOptions={{
                color: sel ? colors.ink : colors.paper,
                fillColor: l.stay ? colors.stay : colors.lamp,
                weight: sel ? 3 : 1.5,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(l.id) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {l.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
        <FlyTo target={target} />
      </MapContainer>
      <div className="legend">
        <span>
          <i className="dot-lamp" />
          Lighthouse
        </span>
        <span>
          <i className="dot-stay" />
          Overnight stays
        </span>
      </div>
    </div>
  );
}
