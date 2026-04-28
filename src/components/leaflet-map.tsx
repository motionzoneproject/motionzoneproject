"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const POSITION: [number, number] = [56.8416, 14.8193];

const markerIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #9a59d7;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(154, 89, 215, 0.4);
    ">
      <div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// CARTO Voyager renders proper colored streets and readable labels —
// the previous `light_all` is meant as a quiet underlay for data overlays
// and reads as washed-out when the map IS the focus. `dark_all` stays
// for dark mode; we lift its contrast via the CSS filter below.
const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function ThemeAwareTiles() {
  const { resolvedTheme } = useTheme();
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return (
    <TileLayer
      key={resolvedTheme}
      attribution={ATTRIBUTION}
      url={resolvedTheme === "dark" ? DARK_TILES : LIGHT_TILES}
    />
  );
}

export default function LeafletMap() {
  return (
    <>
      <style>{`
        /* Lift map legibility — light tiles get a small contrast nudge,
           dark tiles need more help because CARTO dark_all is faint by
           design. Filter targets the tile pane only so the marker /
           popup / attribution stay un-modified. */
        .leaflet-tile {
          filter: contrast(1.08) saturate(1.05);
        }
        .dark .leaflet-tile {
          filter: brightness(1.18) contrast(1.22);
        }
        .leaflet-popup-content-wrapper {
          background: var(--card);
          color: var(--card-foreground);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border);
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 16px;
          font-family: var(--font-montserrat), system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }
        .leaflet-popup-tip {
          background: var(--card);
          border: 1px solid var(--border);
          border-top: none;
          border-left: none;
        }
        .leaflet-popup-close-button {
          color: var(--muted-foreground) !important;
          font-size: 18px !important;
          padding: 8px !important;
        }
        .leaflet-popup-close-button:hover {
          color: var(--foreground) !important;
        }
        .leaflet-control-attribution {
          background: var(--card) !important;
          color: var(--muted-foreground) !important;
          font-size: 10px !important;
          opacity: 0.7;
        }
        .leaflet-control-attribution a {
          color: var(--muted-foreground) !important;
        }
      `}</style>
      <MapContainer
        center={POSITION}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
        zoomControl={false}
      >
        <ThemeAwareTiles />
        <Marker position={POSITION} icon={markerIcon}>
          <Popup>
            <div style={{ textAlign: "center" }}>
              <strong style={{ fontSize: "15px", color: "#9a59d7" }}>
                MotionZone Växjö
              </strong>
              <br />
              <span
                style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
              >
                Smedsvängen 70, 352 54 Växjö
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </>
  );
}
