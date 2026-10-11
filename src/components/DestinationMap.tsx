import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";
import type { Destination } from "../lib/types";

// Fix Leaflet's default marker icons under bundlers. We point at the CDN
// copies so we don't have to shuffle image files around in Vite.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PRIORITY_COLORS: Record<string, string> = {
  must: "#F28B83",
  high: "#F2B49E",
  optional: "#8C8BA9",
  backup: "#718D82",
};

function makePinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "pv-map-pin",
    html: `<div style="
      width:22px;height:22px;
      background:${color};
      border:3px solid #10152D;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 4px 12px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}

interface Props {
  destinations: Destination[];
  height?: number;
}

export default function DestinationMap({ destinations, height = 420 }: Props) {
  // Only destinations with valid coordinates
  const pinned = useMemo(
    () =>
      destinations.filter(
        (d) =>
          typeof d.latitude === "number" &&
          typeof d.longitude === "number" &&
          Number.isFinite(d.latitude) &&
          Number.isFinite(d.longitude),
      ),
    [destinations],
  );

  // Fit the map to the bounding box of all pins
  const bounds = useMemo(() => {
    if (pinned.length === 0) return null;
    return L.latLngBounds(
      pinned.map(
        (d) =>
          [d.latitude as number, d.longitude as number] as [number, number],
      ),
    ).pad(0.2);
  }, [pinned]);

  const center = useMemo<[number, number]>(() => {
    if (pinned.length === 0) return [26.35, 88.5]; // Panchagarh area fallback
    const avgLat =
      pinned.reduce((s, d) => s + (d.latitude as number), 0) / pinned.length;
    const avgLon =
      pinned.reduce((s, d) => s + (d.longitude as number), 0) / pinned.length;
    return [avgLat, avgLon];
  }, [pinned]);

  if (pinned.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-purpleDark/60 bg-indigoDeep/60 p-10 text-center"
        style={{ minHeight: height }}
      >
        <MapPin className="w-8 h-8 mx-auto text-textSecondary mb-3" />
        <p className="font-serif text-lg text-textPrimary mb-1">
          No coordinates to show yet
        </p>
        <p className="text-xs text-textSecondary max-w-sm mx-auto leading-relaxed">
          Add latitude and longitude to a destination (via Edit → Basic info →
          Location coordinates) and it will appear here on the map.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-purpleDark/60"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={10}
        bounds={bounds ?? undefined}
        boundsOptions={{ padding: [40, 40] }}
        style={{ height: "100%", width: "100%", background: "#10152D" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((d) => (
          <Marker
            key={d.id}
            position={[d.latitude as number, d.longitude as number]}
            icon={makePinIcon(PRIORITY_COLORS[d.priority] ?? "#F2B49E")}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <p
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: 15,
                    margin: "0 0 4px 0",
                    color: "#10152D",
                  }}
                >
                  {d.name}
                </p>
                {d.location && (
                  <p
                    style={{ fontSize: 11, margin: "0 0 8px 0", color: "#555" }}
                  >
                    {d.location}
                  </p>
                )}
                <Link
                  to={`/destinations/${d.id}`}
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    color: "#10152D",
                    textDecoration: "underline",
                    fontWeight: 500,
                  }}
                >
                  Read article →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
