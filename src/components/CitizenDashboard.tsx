import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle, Activity, Navigation, RefreshCw, Radio,
  Wind, Droplets, Thermometer, Sun, CloudRain, ChevronRight, Wifi,
} from 'lucide-react';
import { getAQICategory } from '../utils/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

import API_URL from '../config';
const BASE_URL = API_URL;
const POLL_INTERVAL = 2000;

const STATIONS = [
  { id: 'hyd-somajiguda-tspcb-2024-25',               label: 'Somajiguda',         lat: 17.4239, lng: 78.4738 },
  { id: 'hyd-kompally-municipal-office-tspcb-2024-25', label: 'Kompally',           lat: 17.5406, lng: 78.4867 },
  { id: 'hyd-iith-kandi-tspcb-2024-25',               label: 'IITH Kandi',         lat: 17.5936, lng: 78.1320 },
  { id: 'hyd-icrisat-patancheru-tspcb-2024-25',        label: 'ICRISAT Patancheru', lat: 17.5169, lng: 78.2674 },
  { id: 'hyd-ida-pashamylaram-tspcb-2024-25',          label: 'IDA Pashamylaram',   lat: 17.5169, lng: 78.2674 },
  { id: 'hyd-central-university-tspcb-2024-25',        label: 'Central University', lat: 17.4586, lng: 78.3318 },
  { id: 'hyd-zoo-park-tspcb-2024-25',                  label: 'Zoo Park',           lat: 17.3616, lng: 78.4513 },
];

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestStation(lat: number, lng: number) {
  return STATIONS.reduce((best, s) =>
    haversine(lat, lng, s.lat, s.lng) < haversine(lat, lng, best.lat, best.lng) ? s : best
  );
}

const AQI_COLOR: Record<string, string> = {
  Good: '#10b981', Moderate: '#f59e0b', Unhealthy: '#f97316',
  'Very Unhealthy': '#ef4444', Hazardous: '#dc2626',
};

// ── Shared primitives ─────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div
    className={`rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/[0.04] ${className}`}
    style={style}
  >
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">{children}</p>
);

// ── API Data View (data.gov.in) ───────────────────────────────────────────────
const ApiDataView: React.FC = () => {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/realtime?city=Hyderabad&limit=500`)
      .then(r => r.json())
      .then(d => { setApiData(d); setLoading(false); })
      .catch(() => { setError('Failed to fetch API data'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-2 border-emerald-500/60 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 dark:text-white/30 text-sm">Fetching from data.gov.in...</p>
    </div>
  );

  if (error || apiData?.error) return (
    <div className="flex items-center gap-3 p-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">
      <AlertCircle size={18} /> {error || apiData?.error}
    </div>
  );

  const stations: any[] = apiData?.stations || [];

  const API_POLLUTANTS = [
    { key: 'PM2.5',  label: 'PM2.5',  unit: 'μg/m³' },
    { key: 'PM10',   label: 'PM10',   unit: 'μg/m³' },
    { key: 'NO2',    label: 'NO₂',   unit: 'μg/m³' },
    { key: 'SO2',    label: 'SO₂',   unit: 'μg/m³' },
    { key: 'CO',     label: 'CO',     unit: 'mg/m³' },
    { key: 'OZONE',  label: 'Ozone',  unit: 'μg/m³' },
    { key: 'NO',     label: 'NO',     unit: 'μg/m³' },
    { key: 'NOx',    label: 'NOx',    unit: 'ppb'   },
    { key: 'NH3',    label: 'NH₃',   unit: 'μg/m³' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Wifi size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">data.gov.in — Live AQI</div>
            <div className="text-emerald-600 dark:text-emerald-400/70 text-xs">
              {apiData?.total_stations} stations · Updated: {apiData?.last_update}
              {apiData?.cached_at && <span className="opacity-60 ml-2">· cached {apiData.cached_at}</span>}
            </div>
          </div>
        </div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400/60">Refreshes every 10 min · Source: CPCB</div>
      </div>

      {/* Station cards — same UI as live stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {stations.map((s: any, i: number) => {
          const aqiCat   = s.aqi ? getAQICategory(s.aqi) : null;
          const aqiColor = aqiCat ? (AQI_COLOR[aqiCat.label] || '#6b7280') : '#6b7280';
          const stName   = s.station?.replace(', Hyderabad - TSPCB', '').replace(', Hyderabad - TSPCB', '') || `Station ${i+1}`;

          return (
            <Card key={i} className="overflow-hidden">
              {/* AQI hero strip */}
              <div className="p-5 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${aqiColor}15 0%, ${aqiColor}05 100%)` }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${aqiColor}20 0%, transparent 70%)` }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-400 dark:text-white/35 mb-1 font-medium">{stName}</div>
                    <div className="text-5xl font-black leading-none" style={{ color: aqiColor }}>
                      {s.aqi ?? '—'}
                    </div>
                    <div className="text-sm font-semibold mt-1.5" style={{ color: aqiColor }}>
                      {aqiCat?.label ?? 'No AQI'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400 dark:text-white/30">
                    <div className="flex items-center gap-1 justify-end">
                      <RefreshCw size={9} /> {s.last_update}
                    </div>
                  </div>
                </div>
                {/* AQI bar */}
                {s.aqi && (
                  <div className="mt-4">
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min((s.aqi / 500) * 100, 100)}%`, backgroundColor: aqiColor }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Pollutant grid */}
              <div className="p-4 grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-white/6">
                {API_POLLUTANTS.filter(p => s[p.key] != null).map(({ key, label, unit }) => (
                  <div key={key} className="text-center p-2 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
                    <div className="text-xs text-gray-400 dark:text-white/30 font-medium">{label}</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{s[key]}</div>
                    <div className="text-xs text-gray-300 dark:text-white/20">{unit}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const CitizenDashboard: React.FC = () => {
  const [selectedId, setSelectedId]   = useState(STATIONS[0].id);
  const [stationData, setStationData] = useState<any>(null);
  const [history, setHistory]         = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [dataSource, setDataSource]   = useState<'live' | 'api'>('live');
  const [geoLoading, setGeoLoading]   = useState(false);
  const [geoError, setGeoError]       = useState<string | null>(null);
  const [nearestDist, setNearestDist] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeRef     = useRef<NodeJS.Timeout | null>(null);

  const fetchLatest = useCallback(async (zoneId: string) => {
    try {
      const res  = await fetch(`${BASE_URL}/live/latest`);
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const match = data.find((z: any) => z.zone_id === zoneId);
      if (match) {
        setStationData(match);
        setLastUpdated(new Date());
        // Fade in only after data is ready
        setTransitioning(false);
      }
    } catch (_) {}
  }, []);

  const fetchHistory = useCallback(async (zoneId: string) => {
    try {
      const res  = await fetch(`${BASE_URL}/live/history?zone_id=${encodeURIComponent(zoneId)}&limit=200`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && !data[0]?.error) setHistory(data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    // Clear stale data immediately so old number doesn't show under new label
    setStationData(null);
    setHistory([]);

    // Fade out immediately on switch
    setTransitioning(true);
    if (fadeRef.current) clearTimeout(fadeRef.current);

    fetchLatest(selectedId);
    fetchHistory(selectedId);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchLatest(selectedId), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, [selectedId, fetchLatest, fetchHistory]);

  const handleLocate = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    setGeoLoading(true); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestStation(pos.coords.latitude, pos.coords.longitude);
        const dist = haversine(pos.coords.latitude, pos.coords.longitude, nearest.lat, nearest.lng);
        setSelectedId(nearest.id);
        setNearestDist(Math.round(dist * 10) / 10);
        setGeoLoading(false);
      },
      (err) => { setGeoError(err.code === 1 ? 'Location access denied.' : 'Could not get location.'); setGeoLoading(false); },
      { timeout: 8000 }
    );
  };

  const getHealthRecs = (aqi: number) => {
    if (aqi > 300) return ['Avoid all outdoor activities', 'Keep windows closed, use air purifiers', 'Wear N95 masks outside', 'Consult a doctor if breathing issues'];
    if (aqi > 200) return ['Limit outdoor activities', 'Sensitive groups stay indoors', 'Wear masks when outside'];
    if (aqi > 100) return ['Reduce prolonged outdoor exertion', 'Sensitive individuals take precautions'];
    return ['Air quality is acceptable', 'Enjoy outdoor activities safely'];
  };

  const aqiCat   = stationData ? getAQICategory(stationData.aqi ?? 0) : getAQICategory(0);
  const aqiColor = AQI_COLOR[aqiCat.label] || '#6b7280';
  const stLabel  = STATIONS.find(s => s.id === selectedId)?.label ?? selectedId;

  const POLLUTANTS = [
    { key: 'pm2_5',   label: 'PM2.5',   unit: 'μg/m³' },
    { key: 'pm10',    label: 'PM10',    unit: 'μg/m³' },
    { key: 'no2',     label: 'NO₂',    unit: 'μg/m³' },
    { key: 'so2',     label: 'SO₂',    unit: 'μg/m³' },
    { key: 'co',      label: 'CO',      unit: 'mg/m³' },
    { key: 'ozone',   label: 'Ozone',   unit: 'μg/m³' },
    { key: 'no',      label: 'NO',      unit: 'μg/m³' },
    { key: 'nox',     label: 'NOx',     unit: 'ppb'   },
    { key: 'nh3',     label: 'NH₃',    unit: 'μg/m³' },
    { key: 'benzene', label: 'Benzene', unit: 'μg/m³' },
    { key: 'toluene', label: 'Toluene', unit: 'μg/m³' },
    { key: 'xylene',  label: 'Xylene',  unit: 'μg/m³' },
  ];

  const MET = [
    { key: 'temp',       label: 'Temperature', unit: '°C',   icon: Thermometer, color: '#f97316' },
    { key: 'humidity',   label: 'Humidity',    unit: '%',    icon: Droplets,    color: '#3b82f6' },
    { key: 'wind_speed', label: 'Wind Speed',  unit: 'm/s',  icon: Wind,        color: '#8b5cf6' },
    { key: 'wind_dir',   label: 'Wind Dir',    unit: '°',    icon: Navigation,  color: '#a855f7' },
    { key: 'solar_rad',  label: 'Solar Rad',   unit: 'W/m²', icon: Sun,         color: '#eab308' },
    { key: 'rain_fall',  label: 'Rainfall',    unit: 'mm',   icon: CloudRain,   color: '#06b6d4' },
  ];

  // tooltip styles per mode — inline since recharts doesn't read Tailwind
  const tooltipStyle = {
    background: 'var(--tooltip-bg, #fff)',
    border: '1px solid var(--tooltip-border, #e5e7eb)',
    borderRadius: '12px',
    color: 'var(--tooltip-text, #111)',
    fontSize: 11,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c12] text-gray-900 dark:text-white transition-colors">

      {/* CSS vars for recharts tooltips */}
      <style>{`
        :root { --tooltip-bg:#fff; --tooltip-border:#e5e7eb; --tooltip-text:#111827; }
        .dark { --tooltip-bg:#0f1520; --tooltip-border:rgba(255,255,255,0.1); --tooltip-text:#fff; }
      `}</style>

      {/* ── Top bar ── */}
      <div className="border-b border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity size={20} className="text-emerald-500" />
              Live Air Quality Monitor
            </h1>
            <p className="text-gray-400 dark:text-white/35 text-xs mt-0.5">
              {lastUpdated
                ? <><span className="text-emerald-500">●</span> Live · {lastUpdated.toLocaleTimeString()}</>
                : <span className="text-gray-300 dark:text-white/25">Connecting...</span>}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/6 border border-gray-200 dark:border-white/8">
            <button onClick={() => setDataSource('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dataSource === 'live'
                  ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60'
              }`}>
              <Radio size={11} /> Live Stream
            </button>
            <button onClick={() => setDataSource('api')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dataSource === 'api'
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60'
              }`}>
              <Wifi size={11} /> API Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">

            {/* Station selector — only in live mode */}
            {dataSource === 'live' && <div>
              <SectionLabel>Select Station</SectionLabel>
              <div className="flex flex-wrap gap-2 items-center">
                {STATIONS.map(s => (
                  <button key={s.id} onClick={() => { setSelectedId(s.id); setNearestDist(null); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      selectedId === s.id
                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white/10 dark:text-white dark:border-white/20'
                        : 'text-gray-500 dark:text-white/45 border-gray-200 dark:border-white/8 hover:border-gray-400 dark:hover:border-white/18 hover:text-gray-800 dark:hover:text-white/70 bg-white dark:bg-transparent'
                    }`}>
                    {s.label}
                  </button>
                ))}
                <button onClick={handleLocate} disabled={geoLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-dashed border-blue-300 dark:border-blue-400/40 text-blue-600 dark:text-blue-400/80 hover:border-blue-500 dark:hover:border-blue-400/70 hover:text-blue-700 dark:hover:text-blue-300 transition-all disabled:opacity-40 bg-white dark:bg-transparent">
                  {geoLoading
                    ? <><RefreshCw size={13} className="animate-spin" /> Locating...</>
                    : <><Navigation size={13} /> Nearest to me</>}
                </button>
              </div>

              {nearestDist !== null && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                  <Navigation size={11} /> Nearest: <span className="font-semibold">{stLabel}</span> — {nearestDist} km away
                </div>
              )}
              {geoError && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle size={11} /> {geoError}
                </div>
              )}
            </div>}

            {/* API Data View */}
            {dataSource === 'api' && <ApiDataView />}

            {/* Live Stream View */}
            {dataSource === 'live' && (stationData ? (
              <div
                style={{
                  opacity: transitioning ? 0 : 1,
                  transform: transitioning ? 'translateY(6px)' : 'translateY(0)',
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }}
              >
                <>
                {/* ── AQI hero ── */}
                <div className="relative overflow-hidden rounded-3xl p-6 border border-gray-200 dark:border-white/8 bg-white dark:bg-transparent"
                  style={{ background: `linear-gradient(135deg, ${aqiColor}10 0%, ${aqiColor}05 50%, transparent 100%)` }}>
                  <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${aqiColor}15 0%, transparent 70%)` }} />

                  <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                    <div>
                      <p className="text-gray-400 dark:text-white/40 text-sm mb-1">{stLabel}</p>
                      <div className="text-8xl font-black leading-none" style={{ color: aqiColor }}>
                        {stationData.aqi}
                      </div>
                      <div className="text-xl font-semibold mt-2" style={{ color: aqiColor }}>{aqiCat.label}</div>
                      <div className="text-gray-400 dark:text-white/25 text-xs mt-1">
                        {stationData.timestamp ? new Date(stationData.timestamp).toLocaleString() : ''}
                      </div>
                    </div>

                    <div className="flex-1 max-w-sm">
                      <div className="flex justify-between text-gray-500 dark:text-white/60 text-xs mb-2">
                        <span>0</span><span>Good</span><span>Moderate</span><span>Unhealthy</span><span>500</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min((stationData.aqi / 500) * 100, 100)}%`, backgroundColor: aqiColor }} />
                      </div>
                      <div className="flex items-center gap-2 mt-4 text-gray-500 dark:text-white/60 text-xs">
                        <RefreshCw size={10} className="animate-spin" /> Auto-refreshing every 2s
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Pollutants ── */}
                <div>
                  <SectionLabel>Pollutants</SectionLabel>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {POLLUTANTS.map(({ key, label, unit }) => {
                      const val = stationData[key];
                      return (
                        <Card key={key} className="p-3 text-center">
                          <div className="text-xs text-gray-400 dark:text-white/30 font-medium mb-1">{label}</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {val != null ? Number(val).toFixed(1) : '—'}
                          </div>
                          <div className="text-xs text-gray-300 dark:text-white/20 mt-0.5">{unit}</div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* ── Meteorology ── */}
                <div>
                  <SectionLabel>Meteorology</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {MET.map(({ key, label, unit, icon: Icon, color }) => (
                      <Card key={key} className="p-4 flex items-center gap-3">
                        <Icon size={18} style={{ color }} className="shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400 dark:text-white/30 truncate">{label}</div>
                          <div className="font-bold text-gray-900 dark:text-white text-sm">
                            {stationData[key] != null ? `${Number(stationData[key]).toFixed(1)} ${unit}` : '—'}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* ── Charts row ── */}
                <div className="grid md:grid-cols-2 gap-5">
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle size={16} className="text-red-500" />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">Health Recommendations</span>
                    </div>
                    <div className="space-y-2">
                      {getHealthRecs(stationData.aqi ?? 0).map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.06] border border-gray-100 dark:border-white/10">
                          <ChevronRight size={13} className="text-gray-400 dark:text-white/50 mt-0.5 shrink-0" />
                          <p className="text-gray-700 dark:text-white/90 text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity size={16} className="text-blue-500" />
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">Recent Trend</span>
                    </div>
                    {history.length > 0 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" className="dark:[stroke:rgba(255,255,255,0.05)]" />
                          <XAxis dataKey="timestamp"
                            tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={['auto','auto']} />
                          <Tooltip contentStyle={tooltipStyle} labelFormatter={t => new Date(t).toLocaleString()} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="aqi"   stroke="#3b82f6" strokeWidth={2} dot={false} name="AQI" />
                          <Line type="monotone" dataKey="pm2_5" stroke="#ef4444" strokeWidth={1.5} dot={false} name="PM2.5" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-44 text-gray-300 dark:text-white/25 text-sm">No history yet</div>
                    )}
                  </Card>
                </div>

                {/* ── Per-pollutant trend charts ── */}
                {history.length > 0 && (() => {
                  const LINES = [
                    { key: 'pm10',    label: 'PM10',    unit: 'μg/m³', color: '#f97316' },
                    { key: 'no2',     label: 'NO₂',    unit: 'μg/m³', color: '#eab308' },
                    { key: 'so2',     label: 'SO₂',    unit: 'μg/m³', color: '#84cc16' },
                    { key: 'co',      label: 'CO',      unit: 'mg/m³', color: '#06b6d4' },
                    { key: 'ozone',   label: 'Ozone',   unit: 'μg/m³', color: '#6366f1' },
                    { key: 'no',      label: 'NO',      unit: 'μg/m³', color: '#8b5cf6' },
                    { key: 'nox',     label: 'NOx',     unit: 'ppb',   color: '#ec4899' },
                    { key: 'nh3',     label: 'NH₃',    unit: 'μg/m³', color: '#14b8a6' },
                    { key: 'benzene', label: 'Benzene', unit: 'μg/m³', color: '#f43f5e' },
                    { key: 'toluene', label: 'Toluene', unit: 'μg/m³', color: '#a855f7' },
                    { key: 'xylene',  label: 'Xylene',  unit: 'μg/m³', color: '#0ea5e9' },
                  ];
                  const available = LINES.filter(p =>
                    history.some((h: any) => h[p.key] != null && !isNaN(Number(h[p.key])))
                  );
                  if (!available.length) return null;
                  return (
                    <div>
                      <SectionLabel>Pollutant Trends</SectionLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {available.map(({ key, label, unit, color }) => {
                          const vals = history.map((h: any) => Number(h[key])).filter((v: number) => !isNaN(v));
                          const min = Math.min(...vals), max = Math.max(...vals);
                          const pad = (max - min) * 0.1 || 1;
                          return (
                            <Card key={key} className="p-4">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                                <span className="text-xs text-gray-400 dark:text-white/25 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{unit}</span>
                              </div>
                              <ResponsiveContainer width="100%" height={110}>
                                <LineChart data={history}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                  <XAxis dataKey="timestamp"
                                    tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
                                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} width={36}
                                    domain={[parseFloat((min - pad).toFixed(2)), parseFloat((max + pad).toFixed(2))]} />
                                  <Tooltip contentStyle={tooltipStyle}
                                    labelFormatter={t => new Date(t).toLocaleTimeString()}
                                    formatter={(v: any) => [v != null ? Number(v).toFixed(2) : '—', `${label} (${unit})`]} />
                                  <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} connectNulls />
                                </LineChart>
                              </ResponsiveContainer>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Safe routes ── */}
                <div>
                  <SectionLabel>Safe Route Suggestions</SectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'Morning Jog',  desc: `Best near ${stLabel}`, time: '6:00 – 7:30 AM',  color: '#10b981' },
                      { title: 'Commute',      desc: 'Use public transport', time: '30% less exposure', color: '#f59e0b' },
                      { title: 'Evening Walk', desc: `Parks near ${stLabel}`, time: '5:00 – 6:30 PM',  color: '#3b82f6' },
                    ].map(({ title, desc, time, color }) => (
                      <Card key={title} className="p-4" style={{ borderColor: color + '30' }}>
                        <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: color }} />
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{title}</div>
                        <div className="text-gray-400 dark:text-white/40 text-xs mt-1">{desc}</div>
                        <div className="text-xs font-medium mt-2" style={{ color }}>{time}</div>
                      </Card>
                    ))}
                  </div>
                </div>

              </>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-2 border-emerald-500/60 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 dark:text-white/30 text-sm">Connecting to live stream...</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
