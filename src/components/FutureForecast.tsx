import React, { useState } from 'react';
import { TrendingUp, Loader, FlaskConical } from 'lucide-react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

import API_URL from '../config';
const BASE_URL = API_URL;

const STATIONS = [
  'Somajiguda', 'Kompally', 'IITH Kandi', 'ICRISAT Patancheru',
  'IDA Pashamylaram', 'Central University', 'Zoo Park',
];

const POLLUTANTS: Record<string, string> = {
  pm2_5: 'PM2.5 (μg/m³)', pm10: 'PM10 (μg/m³)',
  no2: 'NO₂ (μg/m³)',     so2: 'SO₂ (μg/m³)',
  co: 'CO (mg/m³)',        ozone: 'Ozone (μg/m³)',
};

const HORIZON_OPTIONS = [
  { label: '30 days',  value: 30 },
  { label: '90 days',  value: 90 },
  { label: '6 months', value: 180 },
  { label: '1 year',   value: 365 },
];

const tooltipStyle = {
  background: 'var(--tt-bg,#fff)',
  border: '1px solid var(--tt-border,#e5e7eb)',
  borderRadius: '12px',
  color: 'var(--tt-text,#111)',
};

const FutureForecast: React.FC = () => {
  const [station,   setStation]   = useState('ICRISAT Patancheru');
  const [pollutant, setPollutant] = useState('pm2_5');
  const [days,      setDays]      = useState(90);
  const [result,    setResult]    = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleRun = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${BASE_URL}/forecast/future`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, pollutant, days }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch { setError('Failed to connect to backend.'); }
    setLoading(false);
  };

  const chartData = result?.data?.filter((d: any) => {
    if (d.is_future) return true;
    const cutoff = new Date(result.last_actual);
    cutoff.setMonth(cutoff.getMonth() - 6);
    return new Date(d.date) >= cutoff;
  });

  const futureStart = result?.last_actual;
  const futureRows  = result?.data?.filter((d: any) => d.is_future) ?? [];
  const avgForecast = futureRows.length ? (futureRows.reduce((s: number, d: any) => s + d.forecast, 0) / futureRows.length).toFixed(1) : null;
  const maxForecast = futureRows.length ? Math.max(...futureRows.map((d: any) => d.forecast)).toFixed(1) : null;
  const minForecast = futureRows.length ? Math.min(...futureRows.map((d: any) => d.forecast)).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c12] text-gray-900 dark:text-white">
      <style>{':root{--tt-bg:#fff;--tt-border:#e5e7eb;--tt-text:#111827}.dark{--tt-bg:#0f1520;--tt-border:rgba(255,255,255,0.1);--tt-text:#fff}'}</style>

      <div className="border-b border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Future Forecast
          </h1>
          <p className="text-gray-400 dark:text-white/35 text-xs mt-0.5">
            XGBoost trains on 2017–2025 historical data and projects pollution levels forward
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Station</label>
              <select value={station} onChange={e => setStation(e.target.value)}
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400">
                {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Pollutant</label>
              <select value={pollutant} onChange={e => setPollutant(e.target.value)}
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400">
                {Object.entries(POLLUTANTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Forecast Horizon</label>
              <div className="flex gap-2 flex-wrap">
                {HORIZON_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setDays(o.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                      days === o.value
                        ? 'bg-gray-900 text-white dark:bg-white/10 dark:text-white dark:border-white/20 border-gray-900'
                        : 'bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/8 hover:text-gray-800 dark:hover:text-white/80'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={handleRun} disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 bg-blue-600 hover:bg-blue-500">
                {loading ? <><Loader className="animate-spin" size={18} /><span>Forecasting...</span></> : <><FlaskConical size={18} /><span>Run Forecast</span></>}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/[0.08] text-red-600 dark:text-red-400 text-sm">❌ {error}</div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Training Data', value: result.train_days?.toLocaleString(), unit: 'days of history', color: 'text-gray-800 dark:text-white' },
                { label: 'Avg Forecast',  value: avgForecast, unit: POLLUTANTS[pollutant], color: 'text-blue-500' },
                { label: 'Peak Forecast', value: maxForecast, unit: 'max in period',        color: 'text-orange-500' },
                { label: 'Min Forecast',  value: minForecast, unit: 'min in period',        color: 'text-green-500' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-5">
                  <div className="text-xs text-gray-400 dark:text-white/35 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-300 dark:text-white/25">{unit}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-500" size={22} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{POLLUTANTS[pollutant]} — {station}</h2>
              </div>
              <p className="text-xs text-gray-400 dark:text-white/35 mb-4">
                Showing last 6 months of actual data + {days}-day XGBoost forecast using lag features (R² ~0.8).
              </p>
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.12)" />
                  <XAxis dataKey="date" tickFormatter={d => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; }} tick={{ fontSize: 11, fill: '#9ca3af' }} interval={Math.floor((chartData?.length || 1) / 10)} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={['auto', 'auto']} width={45} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} formatter={(v: any, name: string | undefined) => [v != null ? Number(v).toFixed(2) : '—', name ?? '']} />
                  <Legend />
                  <Line type="monotone" dataKey="actual"   stroke="#94a3b8" strokeWidth={2} dot={false} connectNulls name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="6 3" name="XGBoost Forecast" />
                  {futureStart && <ReferenceLine x={futureStart} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Forecast starts', position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }} />}
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-white/40">
                <div className="flex items-center gap-1"><div className="w-6 h-0.5 bg-slate-400" /><span>Actual readings</span></div>
                <div className="flex items-center gap-1"><div className="w-6 h-0.5 bg-blue-500" /><span>XGBoost forecast</span></div>
                <div className="flex items-center gap-1"><div className="w-0.5 h-4 bg-red-400" /><span>Forecast start</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FutureForecast;
