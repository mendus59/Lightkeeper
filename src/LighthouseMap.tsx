import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Lighthouse } from "./types";

interface Props {
  lights: Lighthouse[];
  selected: string | null;
  onSelect: (id: string) => void;
  /** False while the map is hidden behind another tab on a phone. */
  active: boolean;
  /** Opens the selected lighthouse's details (the preview card's button on phones). */
  onOpen: () => void;
}

function FlyTo({ target, active }: { target: Lighthouse | undefined; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    // A hidden map has no size, so measure again when it is shown, then jump (not fly) if it was hidden.
    const wasHidden = map.getSize().x === 0;
    map.invalidateSize();
    if (!target) return;
    const zoom = Math.max(map.getZoom(), 6);
    if (wasHidden) map.setView([target.lat, target.lon], zoom);
    else map.flyTo([target.lat, target.lon], zoom, { duration: 0.8 });
  }, [target, active, map]);
  return null;
}

// Leaflet paints markers with SVG attributes, so read the theme colours from CSS once.
function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function LighthouseMap({ lights, selected, onSelect, active, onOpen }: Props) {
  // Small dots are hard to hit with a finger, so widen the tap area on touch screens.
  const renderer = useMemo(() => L.canvas({ tolerance: window.matchMedia("(pointer: coarse)").matches ? 10 : 0 }), []);
  const target = lights.find((l) => l.id === selected);
  const colors = {
    lamp: cssVar("--lamp", "#d98a0b"),
    stay: cssVar("--stay", "#1c6e6a"),
    paper: cssVar("--paper", "#ffffff"),
    ink: cssVar("--ink", "#14212b"),
  };
  return (
    <div className="mapbox">
      <MapContainer center={[39.5, -98.35]} zoom={4} minZoom={2} scrollWheelZoom={false} renderer={renderer} className="map">
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
        <FlyTo target={target} active={active} />
      </MapContainer>
      {target && (
        <div className="peek">
          <div>
            <strong>{target.name}</strong>
            <span>{target.place}</span>
          </div>
          <button onClick={onOpen}>Details</button>
        </div>
      )}
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
