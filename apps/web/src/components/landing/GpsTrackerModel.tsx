import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Clock, 
  MapPin, 
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix Leaflet Default Marker Icons
const truckMarkerIcon = L.divIcon({
  className: 'custom-truck-marker',
  html: `
    <div style="
      width: 38px;
      height: 38px;
      background: #090d16;
      border: 2px solid #38bdf8;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.5);
    ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const stopMarkerIcon = (color: string) => L.divIcon({
  className: 'custom-stop-marker',
  html: `
    <div style="
      width: 14px;
      height: 14px;
      background: ${color};
      border: 2px solid #ffffff;
      border-radius: 3px;
      box-shadow: 0 0 8px ${color};
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Helper component to auto-pan map to active truck location
function MapAutoPan({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 0.5 });
  }, [center, map]);
  return null;
}

const fleetVehicles = [
  {
    id: 'TRK-104',
    name: 'Unit #104 — Kenworth T680',
    driver: 'Marcus Vance',
    route: 'Chicago, IL ➔ Dallas, TX',
    waypoints: [
      { name: 'Chicago, IL (Origin)', lat: 41.8781, lng: -87.6298, type: 'start' },
      { name: 'Effingham, IL (30m Fuel Break)', lat: 39.1242, lng: -88.5434, type: 'fuel' },
      { name: 'Springfield, MO (10h Rest Stop)', lat: 37.209, lng: -93.2923, type: 'rest' },
      { name: 'Dallas, TX (Destination)', lat: 32.7767, lng: -96.797, type: 'end' },
    ],
  },
  {
    id: 'TRK-208',
    name: 'Unit #208 — Freightliner Cascadia',
    driver: 'Sarah Jenkins',
    route: 'Atlanta, GA ➔ Miami, FL',
    waypoints: [
      { name: 'Atlanta, GA (Origin)', lat: 33.749, lng: -84.388, type: 'start' },
      { name: 'Macon, GA (Fuel Stop)', lat: 32.8407, lng: -83.6324, type: 'fuel' },
      { name: 'Orlando, FL (Rest Break)', lat: 28.5383, lng: -81.3792, type: 'rest' },
      { name: 'Miami, FL (Destination)', lat: 25.7617, lng: -80.1918, type: 'end' },
    ],
  },
];

export default function GpsTrackerModel() {
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);
  const [progress, setProgress] = useState(0.25); // 0 to 1
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const activeVehicle = fleetVehicles[selectedVehicleIdx];
  const waypoints = activeVehicle.waypoints;

  // Interpolate position along waypoints
  const totalSegments = waypoints.length - 1;
  const currentSegmentFloat = progress * totalSegments;
  const segmentIdx = Math.min(Math.floor(currentSegmentFloat), totalSegments - 1);
  const segmentProgress = currentSegmentFloat - segmentIdx;

  const startWp = waypoints[segmentIdx];
  const endWp = waypoints[segmentIdx + 1];

  const currentLat = startWp.lat + (endWp.lat - startWp.lat) * segmentProgress;
  const currentLng = startWp.lng + (endWp.lng - startWp.lng) * segmentProgress;

  // Simulation timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) return 0; // Loop back
        return prev + 0.005 * speedMultiplier;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  // Derived telemetry metrics
  const simulatedSpeed = isPlaying ? Math.floor(62 + Math.sin(progress * 20) * 4) : 0;
  const distanceCovered = Math.floor(progress * 925);
  const totalDistance = 925;
  const fuelPercent = Math.max(15, Math.floor(100 - progress * 55));
  const driveHoursLeft = (8.5 * (1 - progress)).toFixed(1);

  const routePolylineCoords: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);

  return (
    <div className="w-full bg-[#080c14] border border-sky-500/20 rounded-md p-4 sm:p-6 shadow-2xl text-slate-100 font-sans">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-sky-950">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-sky-950 border border-sky-400/30 flex items-center justify-center text-sky-300">
            <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-sky-400 font-semibold">
              <span className="w-2 h-2 rounded-sm bg-sky-400 animate-ping" />
              Live Telemetry • GPS Model
            </div>
            <h3 className="text-lg font-extrabold text-white uppercase tracking-wider font-sans">
              Fleet GPS Simulator
            </h3>
          </div>
        </div>

        {/* Vehicle Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {fleetVehicles.map((v, idx) => (
            <button
              key={v.id}
              onClick={() => {
                setSelectedVehicleIdx(idx);
                setProgress(0.15);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase border transition-all ${
                selectedVehicleIdx === idx
                  ? 'bg-sky-950 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/20'
                  : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {v.id}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Square Box Dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        
        {/* Map Panel (2 Cols) - Height matches right column perfectly */}
        <div className="lg:col-span-2 relative rounded-md overflow-hidden border border-sky-900/40 bg-black min-h-[380px] h-full flex flex-col justify-between shadow-inner">
          <div className="flex-1 w-full relative min-h-[320px]">
            <MapContainer
              center={[currentLat, currentLng]}
              zoom={6}
              scrollWheelZoom={false}
              attributionControl={false}
              className="w-full h-full absolute inset-0"
            >
              <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              <MapAutoPan center={[currentLat, currentLng]} />

              {/* Route Polyline */}
              <Polyline
                positions={routePolylineCoords}
                color="#38bdf8"
                weight={4}
                opacity={0.8}
                dashArray="8, 6"
              />

              {/* Waypoint Markers */}
              {waypoints.map((wp, idx) => (
                <Marker
                  key={idx}
                  position={[wp.lat, wp.lng]}
                  icon={stopMarkerIcon(wp.type === 'start' ? '#10b981' : wp.type === 'end' ? '#f43f5e' : '#38bdf8')}
                >
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <strong className="text-sky-400 block">{wp.name}</strong>
                      <span>Waypoint #{idx + 1}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Moving Truck Marker */}
              <Marker position={[currentLat, currentLng]} icon={truckMarkerIcon}>
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <strong className="text-sky-400 block">{activeVehicle.name}</strong>
                    <span>Speed: {simulatedSpeed} MPH</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Integrated Map Control Bar - Flush at bottom with zero extra space */}
          <div className="relative z-[1000] bg-[#070b12]/95 backdrop-blur-md border-t border-sky-400/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-sm h-7 px-3 text-xs border border-sky-300/40"
              >
                {isPlaying ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                {isPlaying ? 'PAUSE' : 'SIMULATE'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProgress(0)}
                className="border-sky-500/30 hover:bg-sky-950 text-sky-300 rounded-sm h-7 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 font-semibold">Speed:</span>
              {[1, 5, 10].map((multiplier) => (
                <button
                  key={multiplier}
                  onClick={() => setSpeedMultiplier(multiplier)}
                  className={`px-2 py-0.5 rounded-sm border transition-all ${
                    speedMultiplier === multiplier
                      ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold'
                      : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {multiplier}x
                </button>
              ))}
            </div>

            {/* GPS Badge */}
            <div className="flex items-center gap-1.5 bg-black/90 border border-sky-400/40 px-2.5 py-1 rounded-sm text-xs font-mono text-sky-300 font-semibold shadow-inner">
              <Navigation className="w-3 h-3 text-sky-400" />
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">GPS:</span>
              <span>{currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°</span>
            </div>
          </div>
        </div>

        {/* Telemetry Dashboards */}
        <div className="flex flex-col gap-3">
          
          {/* Box 1: Vehicle Status */}
          <div className="bg-[#090d16] border border-sky-500/20 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Active Vehicle Telemetry
              </span>
              <span className="px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/50 p-2.5 rounded-sm border border-white/[0.05]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Speed</span>
                <span className="text-lg font-extrabold text-white font-mono flex items-baseline gap-1">
                  {simulatedSpeed} <span className="text-xs font-normal text-sky-400">MPH</span>
                </span>
              </div>

              <div className="bg-black/50 p-2.5 rounded-sm border border-white/[0.05]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Distance</span>
                <span className="text-lg font-extrabold text-white font-mono flex items-baseline gap-1">
                  {distanceCovered} <span className="text-xs font-normal text-sky-400">/ {totalDistance} mi</span>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Fuel Level:</span>
                <span className="text-sky-300 font-bold">{fuelPercent}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-sm h-2 overflow-hidden border border-white/10">
                <div className="bg-sky-400 h-full transition-all duration-300" style={{ width: `${fuelPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Box 2: Live HOS Clock */}
          <div className="bg-[#090d16] border border-sky-500/20 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> FMCSA HOS Duty Clock
              </span>
              <span className="px-2 py-0.5 rounded-sm bg-sky-500/10 border border-sky-400/30 text-sky-300 text-[10px] font-mono font-bold uppercase">
                COMPLIANT
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/50 p-2.5 rounded-sm border border-white/[0.05]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Drive Time Left</span>
                <span className="text-base font-bold text-sky-200 font-mono">{driveHoursLeft} hrs</span>
              </div>

              <div className="bg-black/50 p-2.5 rounded-sm border border-white/[0.05]">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Duty Window</span>
                <span className="text-base font-bold text-slate-200 font-mono">11.4 hrs</span>
              </div>
            </div>
          </div>

          {/* Box 3: Waypoints Checklist */}
          <div className="bg-[#090d16] border border-sky-500/20 rounded-md p-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Waypoint Sequence
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {waypoints.map((wp, idx) => {
                const isPassed = progress >= idx / totalSegments;
                const isCurrent = Math.abs(progress - idx / totalSegments) < 0.15;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-sm border transition-all ${
                      isCurrent
                        ? 'bg-sky-950/80 border-sky-400/50 text-sky-200'
                        : isPassed
                        ? 'bg-black/40 border-emerald-500/20 text-slate-300'
                        : 'bg-black/20 border-white/[0.04] text-slate-500'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-sm ${isPassed ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      {wp.name.split('(')[0]}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-sky-400">
                      {isPassed ? 'CLEARED' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
