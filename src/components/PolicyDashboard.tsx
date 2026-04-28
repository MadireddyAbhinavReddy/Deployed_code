import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import API_URL from '../config';
const BASE_URL = API_URL;

const POLLUTANT_CHARTS = [
  { key: 'pm2_5',   label: 'PM2.5',   unit: 'μg/m³', color: '#ef4444' },
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

const MET_CHARTS = [
  { key: 'temp',       label: 'Temperature', unit: '°C',   color: '#f97316' },
  { key: 'humidity',   label: 'Humidity',    unit: '%',    color: '#06b6d4' },
  { key: 'wind_speed', label: 'Wind Speed',  unit: 'm/s',  color: '#6366f1' },
  { key: 'solar_rad',  label: 'Solar Rad',   unit: 'W/m²', color: '#eab308' },
  { key: 'rain_fall',  label: 'Rainfall',    unit: 'mm',   color: '#3b82f6' },
];

const RESAMPLE_OPTIONS = [
  { value: '1D', label: 'Daily' },
  { value: '1W', label: 'Weekly' },
  { value: 'M',  label: 'Monthly' },
];

const tooltipStyle = {
  background: 'var(--tt-bg,#fff)',
  border: '1px solid var(--tt-border,#e5e7eb)',
  borderRadius: '12px',
  color: 'var(--tt-text,#111)',
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const ChartModal: React.FC<{
  data: any[]; dataKey: string; label: string; unit: string; color: string; onClose: () => void;
}> = ({ data, dataKey, label, unit, color, onClose }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return data;
    return data.filter(d => {
      const t = d.timestamp;
      if (dateFrom && t < dateFrom) return false;
      if (dateTo   && t > dateTo)   return false;
      return true;
    });
  }, [data, dateFrom, dateTo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white dark:bg-[#0f1520] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{label}</h2>
            <p className="text-sm text-gray-500 dark:text-white/50">{unit}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/8 rounded-xl transition-colors">
            <X size={20} className="text-gray-500 dark:text-white/50" />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl">
          <span className="text-sm text-gray-600 dark:text-white/60 font-medium">Date range:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
          <span className="text-gray-400 dark:text-white/35">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-blue-500 hover:underline">Clear</button>
          )}
          <span className="ml-auto text-xs text-gray-400 dark:text-white/35">{filtered.length} data points</span>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" />
            <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={45} domain={['auto', 'auto']} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} formatter={(v: any) => [v != null ? Number(v).toFixed(2) : '—', `${label} (${unit})`]} />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} name={label} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ── Chart card ────────────────────────────────────────────────────────────────
const PollutantChart: React.FC<{
  data: any[]; dataKey: string; label: string; unit: string; color: string;
}> = ({ data, dataKey, label, unit, color }) => {
  const [highlighted, setHighlighted] = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);

  const hasData = data.some(d => d[dataKey] != null && !isNaN(Number(d[dataKey])));

  if (!hasData) return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-4 flex flex-col items-center justify-center" style={{ minHeight: 180 }}>
      <span className="text-sm font-semibold text-gray-400 dark:text-white/35 mb-1">{label}</span>
      <span className="text-xs text-gray-300 dark:text-white/25">Not available</span>
    </div>
  );

  return (
    <>
      <div
        onClick={() => setHighlighted(h => !h)}
        onDoubleClick={() => setFullscreen(true)}
        className={`rounded-2xl border p-4 cursor-pointer transition-all ${
          highlighted ? 'border-2 shadow-lg scale-[1.02]' : 'bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/15'
        }`}
        style={highlighted ? { borderColor: color, backgroundColor: `${color}10` } : {}}
        title="Double-click to expand"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white" style={{ color: highlighted ? color : undefined }}>{label}</span>
          <span className="text-xs text-gray-400 dark:text-white/35 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{unit}</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.12)" />
            <XAxis dataKey="timestamp" tickFormatter={t => { const d = new Date(t); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; }} tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} width={38} domain={['auto', 'auto']} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} formatter={(v: any) => [v != null ? Number(v).toFixed(2) : '—', label]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={highlighted ? 3 : 2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {fullscreen && <ChartModal data={data} dataKey={dataKey} label={label} unit={unit} color={color} onClose={() => setFullscreen(false)} />}
    </>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const PolicyDashboard: React.FC = () => {
  const [coreStations,    setCoreStations]    = useState<string[]>([]);
  const [extraStations,   setExtraStations]   = useState<string[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [resample,        setResample]        = useState('1D');
  const [selectedYear,    setSelectedYear]    = useState(2025);
  const [availableYears,  setAvailableYears]  = useState<number[]>([2025]);
  const [customFrom,      setCustomFrom]      = useState('');
  const [customTo,        setCustomTo]        = useState('');
  const [showCustom,      setShowCustom]      = useState(false);
  const [dataMinDate,     setDataMinDate]     = useState('');
  const [dataMaxDate,     setDataMaxDate]     = useState('');
  const [data,            setData]            = useState<any[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [showExtra,       setShowExtra]       = useState(false);
  const [activeTab,       setActiveTab]       = useState<'annual' | 'trends'>('annual');
  const [trendsData,      setTrendsData]      = useState<any[]>([]);
  const [trendsLoading,   setTrendsLoading]   = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/policy/stations`).then(r => r.json()).then(d => {
      setCoreStations(d.core); setExtraStations(d.extra);
      const preferred = 'ICRISAT Patancheru';
      setSelectedStation(d.core.includes(preferred) ? preferred : d.core[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedStation) return;
    fetch(`${BASE_URL}/policy/years?station=${encodeURIComponent(selectedStation)}`).then(r => r.json()).then(years => {
      if (Array.isArray(years) && years.length > 0) { setAvailableYears(years); setSelectedYear(years[0]); }
    });
    fetch(`${BASE_URL}/policy/daterange?station=${encodeURIComponent(selectedStation)}`).then(r => r.json()).then(d => {
      if (d.min) setDataMinDate(d.min); if (d.max) setDataMaxDate(d.max);
    });
  }, [selectedStation]);

  useEffect(() => {
    if (!selectedStation) return;
    if (showCustom && (customFrom || customTo)) {
      setLoading(true);
      const params = new URLSearchParams({ station: selectedStation, resample: resample === '1D' ? '1D' : resample });
      if (customFrom) params.set('date_from', customFrom);
      if (customTo)   params.set('date_to',   customTo);
      fetch(`${BASE_URL}/trends/data?${params}`).then(r => r.json()).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    } else if (!showCustom) {
      setLoading(true);
      fetch(`${BASE_URL}/policy/data?station=${encodeURIComponent(selectedStation)}&resample=${resample}&year=${selectedYear}`).then(r => r.json()).then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [selectedStation, resample, selectedYear, showCustom, customFrom, customTo]);

  useEffect(() => {
    if (!selectedStation || activeTab !== 'trends') return;
    setTrendsLoading(true);
    const params = new URLSearchParams({ station: selectedStation, resample: 'MS' });
    if (showCustom && customFrom) params.set('date_from', customFrom);
    if (showCustom && customTo)   params.set('date_to',   customTo);
    fetch(`${BASE_URL}/trends/data?${params}`).then(r => r.json()).then(d => { setTrendsData(Array.isArray(d) ? d : []); setTrendsLoading(false); }).catch(() => setTrendsLoading(false));
  }, [selectedStation, activeTab, showCustom, customFrom, customTo]);

  const allStations = showExtra ? [...coreStations, ...extraStations] : [...coreStations];
  const avg = (key: string) => { const v = data.map(d => d[key]).filter(v => v != null && !isNaN(v)); return v.length ? (v.reduce((a,b) => a+b,0)/v.length).toFixed(1) : '—'; };
  const max = (key: string) => { const v = data.map(d => d[key]).filter(v => v != null && !isNaN(v)); return v.length ? Math.max(...v).toFixed(1) : '—'; };

  const btnActive   = 'bg-gray-900 text-white dark:bg-white/10 dark:text-white border-gray-900 dark:border-white/20';
  const btnInactive = 'bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/8 hover:text-gray-800 dark:hover:text-white/80';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c12] text-gray-900 dark:text-white">
      <style>{':root{--tt-bg:#fff;--tt-border:#e5e7eb;--tt-text:#111827}.dark{--tt-bg:#0f1520;--tt-border:rgba(255,255,255,0.1);--tt-text:#fff}'}</style>

      <div className="border-b border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500" /> Policy Dashboard
          </h1>
          <p className="text-gray-400 dark:text-white/35 text-xs mt-0.5">Annual pollution data — Hyderabad TSPCB stations</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Controls */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Station</label>
              <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)}
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400">
                {coreStations.length > 0 && <optgroup label="Core Stations">{coreStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                {showExtra && extraStations.length > 0 && <optgroup label="Additional Stations">{extraStations.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Aggregation</label>
              <div className="flex gap-2">
                {RESAMPLE_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setResample(o.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${resample === o.value ? btnActive : btnInactive}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Year</label>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(y => (
                  <button key={y} onClick={() => { setSelectedYear(y); setShowCustom(false); }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${selectedYear === y && !showCustom ? btnActive : btnInactive}`}>
                    {y}
                  </button>
                ))}
                <button onClick={() => setShowCustom(p => !p)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border-2 border-dashed ${showCustom ? 'border-blue-400 dark:border-blue-400/60 bg-blue-50 dark:bg-blue-500/8 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-white/15 text-gray-600 dark:text-white/50 hover:border-blue-400 dark:hover:border-blue-400/60'}`}>
                  Custom Range
                </button>
              </div>
              {showCustom && (
                <div className="flex items-center gap-3 mt-3 p-3 bg-blue-50 dark:bg-blue-500/8 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-white/60 font-medium">From</span>
                  <input type="date" value={customFrom} min={dataMinDate || undefined} max={customTo || dataMaxDate || '2025-12-31'} onChange={e => setCustomFrom(e.target.value)}
                    className="border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
                  <span className="text-gray-400 dark:text-white/35">→</span>
                  <input type="date" value={customTo} min={customFrom || dataMinDate || undefined} max={dataMaxDate || '2025-12-31'} onChange={e => setCustomTo(e.target.value)}
                    className="border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
                  {dataMinDate && <span className="text-xs text-gray-400 dark:text-white/35 ml-2">Data: {dataMinDate} → {dataMaxDate}</span>}
                </div>
              )}
            </div>
            <button onClick={() => setShowExtra(p => !p)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-white/15 rounded-xl text-sm text-gray-600 dark:text-white/50 hover:border-blue-400 dark:hover:border-blue-400/60 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              {showExtra ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showExtra ? 'Hide' : 'Show'} additional stations ({extraStations.length})
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {allStations.map(s => (
              <button key={s} onClick={() => setSelectedStation(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${selectedStation === s ? btnActive : btnInactive}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'annual', label: 'Annual Data', icon: null },
            { id: 'trends', label: '7-Year Trends (2017–2025)', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors border ${activeTab === id ? btnActive : 'rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80'}`}>
              {Icon && <Icon size={16} />}{label}
            </button>
          ))}
        </div>

        {/* Annual tab */}
        {activeTab === 'annual' && (loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-400/60 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 dark:text-white/50">Loading data...</span>
          </div>
        ) : data.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg PM2.5', value: avg('pm2_5'), unit: 'μg/m³', color: '#ef4444' },
                { label: 'Max PM2.5', value: max('pm2_5'), unit: 'μg/m³', color: '#f97316' },
                { label: 'Avg NO₂',  value: avg('no2'),   unit: 'μg/m³', color: '#eab308' },
                { label: 'Avg Ozone',value: avg('ozone'), unit: 'μg/m³', color: '#6366f1' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-5">
                  <div className="text-xs text-gray-400 dark:text-white/35 mb-1">{label}</div>
                  <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs text-gray-300 dark:text-white/25">{unit}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pollutant Trends — {selectedStation} ({showCustom && customFrom ? `${customFrom} → ${customTo || 'now'}` : selectedYear})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...POLLUTANT_CHARTS].sort((a,b) => { const aH = data.some(d => d[a.key] != null && !isNaN(Number(d[a.key]))); const bH = data.some(d => d[b.key] != null && !isNaN(Number(d[b.key]))); return aH === bH ? 0 : aH ? -1 : 1; }).map(c => (
                <PollutantChart key={c.key} data={data} dataKey={c.key} label={c.label} unit={c.unit} color={c.color} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="text-cyan-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Meteorological Trends — {selectedStation} ({showCustom && customFrom ? `${customFrom} → ${customTo || 'now'}` : selectedYear})
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MET_CHARTS.map(c => <PollutantChart key={c.key} data={data} dataKey={c.key} label={c.label} unit={c.unit} color={c.color} />)}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-12 text-center text-gray-400 dark:text-white/35">
            No data available for this station.
          </div>
        ))}

        {/* Trends tab */}
        {activeTab === 'trends' && (trendsLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-400/60 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 dark:text-white/50">Loading 7-year data (2017–2025)...</span>
          </div>
        ) : trendsData.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pollutant Trends 2017–2025 — {selectedStation}</h2>
              <span className="text-sm text-gray-400 dark:text-white/35 ml-2">(monthly averages)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...POLLUTANT_CHARTS].sort((a,b) => { const aH = trendsData.some(d => d[a.key] != null && !isNaN(Number(d[a.key]))); const bH = trendsData.some(d => d[b.key] != null && !isNaN(Number(d[b.key]))); return aH === bH ? 0 : aH ? -1 : 1; }).map(c => (
                <PollutantChart key={c.key} data={trendsData} dataKey={c.key} label={c.label} unit={c.unit} color={c.color} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="text-cyan-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Meteorological Trends 2017–2025</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MET_CHARTS.map(c => <PollutantChart key={c.key} data={trendsData} dataKey={c.key} label={c.label} unit={c.unit} color={c.color} />)}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-12 text-center text-gray-400 dark:text-white/35">
            No multi-year data available for this station.
          </div>
        ))}
      </div>
    </div>
  );
};

export default PolicyDashboard;
