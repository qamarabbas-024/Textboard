'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface GeoPin {
  id: string;
  latitude: number;
  longitude: number;
  actor: string;
  timestamp: string;
  source: string;
}

interface GeoCluster {
  centroid: { latitude: number; longitude: number };
  pinCount: number;
  actors: string[];
  firstSeen: string;
  lastSeen: string;
  radiusKm: number;
}

interface GeoRouteSegment {
  from: GeoPin;
  to: GeoPin;
  distanceKm: number;
  timeDiffMinutes: number;
  impliedSpeedKmh: number;
}

interface GeoReport {
  totalPins: number;
  pins: GeoPin[];
  clusters: GeoCluster[];
  routes: GeoRouteSegment[];
}

interface GeoMapViewProps {
  datasetId: string;
  apiUrl?: string;
}

export function GeoMapView({ datasetId, apiUrl = '' }: GeoMapViewProps) {
  const [data, setData] = useState<GeoReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<GeoPin | null>(null);
  const [activeActor, setActiveActor] = useState<string | null>(null);
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`${apiUrl}/api/v1/analytics/${datasetId}/geo`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (isMounted && res) {
          setData(res);
          if (res.pins?.length > 0) {
            setSelectedPin(res.pins[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [datasetId, apiUrl]);

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Route playback simulation loop
  useEffect(() => {
    if (!isSimulatingRoute || !data?.pins?.length) return;

    const intervalMs = Math.max(300, Math.round(1800 / playbackSpeed));
    const timer = setInterval(() => {
      setSimulationIndex((prev) => {
        const next = (prev + 1) % data.pins.length;
        setSelectedPin(data.pins[next]);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulatingRoute, data, playbackSpeed]);

  const filteredPins = useMemo(() => {
    if (!data?.pins) return [];
    if (!activeActor) return data.pins;
    return data.pins.filter((p) => p.actor === activeActor);
  }, [data, activeActor]);

  const distinctActors = useMemo(() => {
    if (!data?.pins) return [];
    return Array.from(new Set(data.pins.map((p) => p.actor)));
  }, [data]);

  // Bounding box computation for map normalization
  const bounds = useMemo(() => {
    if (!filteredPins.length) return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    const lats = filteredPins.map((p) => p.latitude);
    const lngs = filteredPins.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 0.05;
    return {
      minLat: minLat - padding,
      maxLat: maxLat + padding,
      minLng: minLng - padding,
      maxLng: maxLng + padding,
    };
  }, [filteredPins]);

  const mapWidth = 800;
  const mapHeight = 460;

  const projectCoord = (lat: number, lng: number) => {
    const latSpan = Math.max(0.001, bounds.maxLat - bounds.minLat);
    const lngSpan = Math.max(0.001, bounds.maxLng - bounds.minLng);
    const x = ((lng - bounds.minLng) / lngSpan) * (mapWidth - 100) + 50;
    const y = mapHeight - (((lat - bounds.minLat) / latSpan) * (mapHeight - 80) + 40);
    return { x, y };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3" />
        <span className="text-xs font-mono text-cyan-300">Extracting Spatial Coordinates & EXIF GPS Telemetry...</span>
      </div>
    );
  }

  if (!data || data.pins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md p-8 text-center">
        <span className="text-4xl mb-3">📍</span>
        <h3 className="text-base font-bold text-neutral-200">No Geospatial Pins Detected</h3>
        <p className="text-xs text-neutral-400 max-w-md mt-1">
          This communication stream does not contain GPS coordinates, Google/Apple Maps shared location links, or Telegram location pins.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-lg text-cyan-400">
            🧭
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide text-neutral-100 uppercase">
              Geospatial Intelligence & Movement Trajectory
            </h2>
            <p className="text-xs text-neutral-400">
              Extracted {data.totalPins} location pins across {data.clusters.length} clusters & {data.routes.length} movement legs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {distinctActors.length > 1 && (
            <select
              value={activeActor || ''}
              onChange={(e) => setActiveActor(e.target.value || null)}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/[0.12] text-xs text-neutral-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Actors ({distinctActors.length})</option>
              {distinctActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          )}

          {/* Speed Multiplier */}
          {isSimulatingRoute && (
            <div className="flex items-center gap-1 bg-black/40 border border-white/[0.08] rounded-lg p-0.5 text-[10px]">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsSimulatingRoute(!isSimulatingRoute)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              isSimulatingRoute
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
            }`}
          >
            <span>{isSimulatingRoute ? '⏹ Stop Playback' : '▶ Play Trajectory'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Deck & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive SVG Projection */}
        <div className="lg:col-span-2 rounded-2xl bg-[#04060c] border border-cyan-500/20 relative overflow-hidden shadow-2xl min-h-[460px] flex items-center justify-center">
          {/* Spatial Grid Backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

          <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full select-none">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connecting Route Vectors */}
            {data.routes.map((route, i) => {
              const p1 = projectCoord(route.from.latitude, route.from.longitude);
              const p2 = projectCoord(route.to.latitude, route.to.longitude);
              return (
                <g key={`route-${i}`}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="url(#routeGradient)"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    opacity="0.65"
                  />
                  <circle
                    cx={(p1.x + p2.x) / 2}
                    cy={(p1.y + p2.y) / 2}
                    r="3"
                    fill="#00f0ff"
                    opacity="0.4"
                  />
                </g>
              );
            })}

            {/* Clusters Radii */}
            {data.clusters.map((cluster, idx) => {
              const cPos = projectCoord(cluster.centroid.latitude, cluster.centroid.longitude);
              return (
                <g key={`cluster-${idx}`}>
                  <circle
                    cx={cPos.x}
                    cy={cPos.y}
                    r="28"
                    fill="#00f0ff"
                    fillOpacity="0.06"
                    stroke="#00f0ff"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                </g>
              );
            })}

            {/* Location Pin Markers */}
            {filteredPins.map((pin) => {
              const pos = projectCoord(pin.latitude, pin.longitude);
              const isSelected = selectedPin?.id === pin.id;

              return (
                <g
                  key={pin.id}
                  onClick={() => setSelectedPin(pin)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  {isSelected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="16"
                      fill="#a855f7"
                      fillOpacity="0.3"
                      className="animate-ping"
                    />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 9 : 6}
                    fill={isSelected ? '#00f0ff' : '#38bdf8'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                  <text
                    x={pos.x + 12}
                    y={pos.y + 4}
                    fill="#e2e8f0"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    opacity={isSelected ? 1 : 0.75}
                  >
                    {pin.actor}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Bottom Coordinate Bar */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-neutral-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/[0.08] backdrop-blur-md">
            <span>GRID: LAT {bounds.minLat.toFixed(2)}° to {bounds.maxLat.toFixed(2)}°</span>
            <span>LNG {bounds.minLng.toFixed(2)}° to {bounds.maxLng.toFixed(2)}°</span>
          </div>
        </div>

        {/* Selected Pin & Forensic Dossier Sidebar */}
        <div className="flex flex-col gap-3">
          {selectedPin ? (
            <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 backdrop-blur-md shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  📍 Selected Coordinate Pin
                </span>
                <span className="text-[10px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-white/[0.06]">
                  {selectedPin.source}
                </span>
              </div>

              <div>
                <div className="text-xs text-neutral-400">Recorded Participant:</div>
                <div className="text-sm font-black text-neutral-100">{selectedPin.actor}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">LATITUDE</div>
                  <div className="font-bold text-cyan-300">{selectedPin.latitude.toFixed(6)}°</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">LONGITUDE</div>
                  <div className="font-bold text-cyan-300">{selectedPin.longitude.toFixed(6)}°</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-400">Timestamp:</div>
                <div className="text-xs font-mono text-neutral-200">
                  {new Date(selectedPin.timestamp).toLocaleString()}
                </div>
              </div>

              <a
                href={`https://maps.google.com/?q=${selectedPin.latitude},${selectedPin.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>🗺️ Open in Google Maps</span>
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] text-center text-xs text-neutral-500">
              Select any pin on the radar map to view coordinate details.
            </div>
          )}

          {/* Cluster Summary List */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md flex flex-col gap-2 max-h-[220px] overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Regional Clusters ({data.clusters.length})
            </span>
            {data.clusters.map((c, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-neutral-200 font-mono">
                    Cluster #{idx + 1} ({c.pinCount} pins)
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {c.actors.join(', ')}
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-cyan-400">
                  ~{c.radiusKm} km radius
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
