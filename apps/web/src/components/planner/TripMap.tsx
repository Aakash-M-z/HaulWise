import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Stop, RouteGeometry } from '@haulwise/api-client-react';

// Fix Leaflet's default icon path issues
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Prominent Semi-Truck Icon Marker for Current Location
const truckLocationIcon = L.divIcon({
  className: 'truck-current-location-marker',
  html: `
    <div style="
      position: relative;
      width: 44px;
      height: 44px;
      background: #060a12;
      border: 2px solid #38bdf8;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.7);
      cursor: pointer;
    ">
      <div style="
        position: absolute;
        inset: -5px;
        border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 12px;
        pointer-events: none;
      "></div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// Icon Generator for Pickup, Dropoff, Fuel, and Rest stops
const createStopIcon = (type: string) => {
  if (type === 'current') return truckLocationIcon;

  let bg = '#3b82f6';
  let label = 'P';
  if (type === 'pickup') { bg = '#10b981'; label = 'P'; }
  if (type === 'dropoff') { bg = '#f43f5e'; label = 'D'; }
  if (type === 'fuel') { bg = '#f97316'; label = 'F'; }
  if (type === 'rest' || type === 'break') { bg = '#a855f7'; label = 'R'; }

  return L.divIcon({
    className: 'custom-stop-div-icon',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: #080d16;
        border: 2px solid ${bg};
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px ${bg}80;
        color: ${bg};
        font-weight: 800;
        font-size: 11px;
        font-family: sans-serif;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

interface TripMapProps {
  stops?: Stop[];
  routeGeometry?: RouteGeometry;
}

// Component to auto-fit bounds
function FitBounds({ stops }: { stops?: Stop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops && stops.length > 0) {
      const bounds = L.latLngBounds(stops.map(s => [s.coordinates.lat, s.coordinates.lng]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [stops, map]);

  return null;
}

export default function TripMap({ stops = [], routeGeometry }: TripMapProps) {
  // Convert [lng, lat] to [lat, lng] for Leaflet polyline
  const polylinePositions: [number, number][] = routeGeometry?.coordinates
    ? routeGeometry.coordinates.map(coord => [coord[1], coord[0]])
    : [];

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-sky-500/20 relative z-0 bg-[#060a12]">
      <MapContainer
        center={[39.8283, -98.5795]} // Center of US
        zoom={4}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {polylinePositions.length > 0 && (
          <Polyline 
            positions={polylinePositions} 
            color="#38bdf8" 
            weight={4}
            opacity={0.9}
            dashArray="8, 6"
          />
        )}

        {stops.map((stop, i) => (
          <Marker 
            key={i} 
            position={[stop.coordinates.lat, stop.coordinates.lng]}
            icon={createStopIcon(stop.type)}
          >
            <Popup className="dark-popup">
              <div className="p-1 font-sans">
                <div className="font-extrabold text-sm mb-1 uppercase tracking-wide text-sky-400">
                  {stop.type === 'current' ? '🚚 CURRENT TRUCK LOCATION' : `${stop.type} STOP`}
                </div>
                <div className="text-xs font-semibold text-slate-200 mb-1">{stop.location}</div>
                {stop.arrivalTime && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Arrival: {new Date(stop.arrivalTime).toLocaleString()}
                  </div>
                )}
                {stop.duration > 0 && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Duration: {stop.duration} hrs
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds stops={stops} />
      </MapContainer>
      
      {/* Decorative Square Box Corner Accents */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-400/60 pointer-events-none z-[1000] m-2" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-400/60 pointer-events-none z-[1000] m-2" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-sky-400/60 pointer-events-none z-[1000] m-2" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-sky-400/60 pointer-events-none z-[1000] m-2" />
    </div>
  );
}
