import React, { useState } from 'react';
import { TrendingUp, Loader, FlaskConical, CheckCircle, XCircle } from 'lucide-react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts';

import API_URL from '../config';
const BASE_URL = API_URL;

const POLLUTANT_LABELS: Record<string, string> = {
  pm2_5: 'PM2.5 (μg/m³)', pm10: 'PM10 (μg/m³)',
  no2: 'NO₂ (μg/m³)',     so2: 'SO₂ (μg/m³)',
  co: 'CO (mg/m³)',        ozone: 'Ozone (μg/m³)',
};

const SIMULATED_POLICIES = [
  { label: 'COVID Lockdown — India (Mar-Jun 2020)',  start: '2020-03-25', end: '2020-06-30' },
  { label: 'COVID Lockdown Phase 1 (Mar-Apr 2020)',  start: '2020-03-25', end: '2020-04-14' },
  { label: 'Post-Lockdown Recovery (Jul-Dec 2020)',  start: '2020-07-01', end: '2020-12-31' },
  { label: 'Odd-Even Scheme (Oct 2019)',             start: '2019-10-04', end: '2019-10-15' },
  { label: 'Custom',                                 start: '',           end: '' },
];

const tooltipStyle = {
  background: 'var(--tt-bg,#fff)',
  border: '1px solid var(--tt-border,#e5e7eb)',
  borderRadius: '12px',
  color: 'var(--tt-text,#111)',
};

const ForecastDashboard: React.FC = () => {
  const [station,     setStation]     = useState('ICRISAT Patancheru');
  const [pollutant,   setPollutant]   = useState('pm2_5');
  const [policyIdx,   setPolicyIdx]   = useState(0);
  const [customStart, setCustomStart] = useState('2025-03-01');
  const [customEnd,   setCustomEnd]   = useState('2025-04-30');
  const [result,      setResult]      = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const selectedPolicy = SIMULATED_POLICIES[policyIdx];
  const policyStart = selectedPolicy.label === 'Custom' ? customStart : selectedPolicy.start;
  const policyEnd   = selectedPolicy.label === 'Custom' ? customEnd   : selectedPolicy.end;
  const STATIONS = ['Somajiguda','Kompally','IITH Kandi','ICRISAT Patancheru','IDA Pashamylaram','Central University','Zoo Park'];

  const handleRun = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${BASE_URL}/forecast/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, pollutant, policy_start: policyStart, policy_end: policyEnd }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch { setError('Failed to connect to backend.'); }
    setLoading(false);
  };

  const impact = result?.impact;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c12] text-gray-900 dark:text-white">
      <style>{':root{--tt-bg:#fff;--tt-border:#e5e7eb;--tt-text:#111827}.dark{--tt-bg:#0f1520;--tt-border:rgba(255,255,255,0.1);--tt-text:#fff}'}</style>

      <div className="border-b border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical size={20} className="text-purple-500" />
            Policy Impact Forecaster
          </h1>
          <p className="text-gray-400 dark:text-white/35 text-xs mt-0.5">
            Train Prophet on pre-policy historical data → forecast what pollution would be without intervention → compare with real actual readings
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                {Object.entries(POLLUTANT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Simulated Policy</label>
              <select value={policyIdx} onChange={e => setPolicyIdx(Number(e.target.value))}
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400">
                {SIMULATED_POLICIES.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleRun} disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 bg-purple-600 hover:bg-purple-500">
                {loading ? <><Loader className="animate-spin" size={18} /><span>Running...</span></> : <><FlaskConical size={18} /><span>Run Forecast</span></>}
              </button>
            </div>
          </div>

          {selectedPolicy.label === 'Custom' && (
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Policy Start</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Policy End</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
              </div>
            </div>
          )}

          {!selectedPolicy.label.includes('Custom') && (
            <p className="text-xs text-gray-400 dark:text-white/35 mt-2">
              Policy window: <span className="font-medium text-gray-600 dark:text-white/60">{policyStart}</span> → <span className="font-medium text-gray-600 dark:text-white/60">{policyEnd}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/[0.08] text-red-600 dark:text-red-400 text-sm">❌ {error}</div>
        )}

        {result && result.train_rows < 180 && (
          <div className="p-4 rounded-2xl border border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/[0.08] text-yellow-700 dark:text-yellow-400 text-sm">
            ⚠️ Only {result.train_rows} days of training data. Forecast accuracy improves with multi-year data.
          </div>
        )}

        {result && (
          <>
            {impact && Object.keys(impact).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-5">
                  <div className="text-xs text-gray-400 dark:text-white/35 mb-1">Avg Actual (policy period)</div>
                  <div className="text-2xl font-bold text-blue-500">{impact.avg_actual}</div>
                  <div className="text-xs text-gray-300 dark:text-white/25">{POLLUTANT_LABELS[pollutant]}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-5">
                  <div className="text-xs text-gray-400 dark:text-white/35 mb-1">Avg Forecast (no policy)</div>
                  <div className="text-2xl font-bold text-orange-500">{impact.avg_forecast}</div>
                  <div className="text-xs text-gray-300 dark:text-white/25">{POLLUTANT_LABELS[pollutant]}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-5">
                  <div className="text-xs text-gray-400 dark:text-white/35 mb-1">Avg Reduction</div>
                  <div className={`text-2xl font-bold ${impact.avg_reduction > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {impact.avg_reduction > 0 ? '↓' : '↑'} {Math.abs(impact.avg_reduction)}
                  </div>
                  <div className="text-xs text-gray-300 dark:text-white/25">{impact.reduction_pct}% change</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-5 flex items-center gap-3">
                  {impact.policy_effective ? <CheckCircle className="text-green-500" size={32} /> : <XCircle className="text-red-500" size={32} />}
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{impact.policy_effective ? 'Policy Effective' : 'No Clear Effect'}</div>
                    <div className="text-xs text-gray-500 dark:text-white/50">{impact.policy_effective ? 'Actual below forecast' : 'Actual above or equal to forecast'}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-purple-500" size={22} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{POLLUTANT_LABELS[pollutant]} — Actual vs Forecast</h2>
                <span className="text-sm text-gray-500 dark:text-white/50 ml-2">({station})</span>
              </div>
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart data={result.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.12)" />
                  <XAxis dataKey="date" tickFormatter={d => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; }} tick={{ fontSize: 11, fill: '#9ca3af' }} interval={6} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={['auto', 'auto']} width={45} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={d => new Date(d).toLocaleDateString()} formatter={(v: any, name: string | undefined) => [v != null ? Number(v).toFixed(2) : '—', name ?? '']} />
                  <Legend />
                  <Area type="monotone" dataKey="forecast_high" fill="#7c3aed33" stroke="none" name="Forecast Upper" legendType="none" />
                  <Area type="monotone" dataKey="forecast_low"  fill="transparent" stroke="none" name="Forecast Lower" legendType="none" />
                  <Line type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Forecast (no policy)" />
                  <Line type="monotone" dataKey="actual"   stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls name="Actual" />
                  <ReferenceArea x1={policyStart} x2={policyEnd} fill="#fef08a" fillOpacity={0.25} label={{ value: 'Policy Period', position: 'insideTop', fontSize: 11, fill: '#92400e' }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-white/40">
                <div className="flex items-center gap-1"><div className="w-6 h-0.5 bg-blue-500" /><span>Actual readings</span></div>
                <div className="flex items-center gap-1"><div className="w-6 h-0.5 bg-purple-500" /><span>Prophet forecast</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900/50 rounded" /><span>Policy window</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForecastDashboard;
