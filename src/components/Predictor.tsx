import React, { useState } from 'react';
import { Brain, Loader, FlaskConical } from 'lucide-react';
import API_URL from '../config';

const ZONES = [
  { id: 'hyd-somajiguda-tspcb-2024-25',               label: 'Somajiguda' },
  { id: 'hyd-kompally-municipal-office-tspcb-2024-25', label: 'Kompally' },
  { id: 'hyd-iith-kandi-tspcb-2024-25',               label: 'IITH Kandi' },
  { id: 'hyd-icrisat-patancheru-tspcb-2024-25',        label: 'ICRISAT Patancheru' },
  { id: 'hyd-ida-pashamylaram-tspcb-2024-25',          label: 'IDA Pashamylaram' },
  { id: 'hyd-central-university-tspcb-2024-25',        label: 'Central University' },
  { id: 'hyd-zoo-park-tspcb-2024-25',                  label: 'Zoo Park' },
];

const POLLUTANTS = ['pm2_5','pm10','no2','so2','co','ozone','no','nox','nh3','benzene','toluene','xylene'];
const MET_COLS   = ['temp','humidity','wind_speed','wind_dir','solar_rad','rain_fall'];
const ALL_COLS   = [...POLLUTANTS, ...MET_COLS];

const Predictor: React.FC = () => {
  const [zone,      setZone]      = useState(ZONES[0].id);
  const [timestamp, setTimestamp] = useState('2025-01-10 14:00:00');
  const [target,    setTarget]    = useState('pm10');
  const [known,     setKnown]     = useState<Record<string, string>>({});
  const [result,    setResult]    = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleKnownChange = (col: string, val: string) => setKnown(prev => ({ ...prev, [col]: val }));

  const handleSubmit = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const knownNumeric: Record<string, number> = {};
      for (const [k, v] of Object.entries(known)) { if (v !== '') knownNumeric[k] = parseFloat(v); }
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, zone_id: zone, target, known: knownNumeric }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch { setError('Failed to connect to backend.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c12] text-gray-900 dark:text-white">
      <div className="border-b border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain size={20} className="text-purple-500" />
            AI Predictor
          </h1>
          <p className="text-gray-400 dark:text-white/35 text-xs mt-0.5">
            Enter a timestamp and any known values — TabPFN will predict the target pollutant.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/12 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
              <Brain className="text-purple-600 dark:text-purple-400" size={18} />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Prediction Inputs</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Zone</label>
              <select value={zone} onChange={e => setZone(e.target.value)}
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400">
                {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Timestamp</label>
              <input type="text" value={timestamp} onChange={e => setTimestamp(e.target.value)} placeholder="YYYY-MM-DD HH:MM:SS"
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Predict (target)</label>
              <select value={target} onChange={e => setTarget(e.target.value)}
                className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400">
                {ALL_COLS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">
              Known Values <span className="text-gray-400 dark:text-white/25 font-normal normal-case">(leave blank if unknown)</span>
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {ALL_COLS.filter(c => c !== target).map(col => (
                <div key={col}>
                  <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">{col}</label>
                  <input type="number" step="any" value={known[col] ?? ''} onChange={e => handleKnownChange(col, e.target.value)} placeholder="—"
                    className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 bg-purple-600 hover:bg-purple-500">
            {loading ? <><Loader className="animate-spin" size={18} /><span>Predicting...</span></> : <><FlaskConical size={18} /><span>Run Prediction</span></>}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/[0.08] text-red-600 dark:text-red-400 text-sm">❌ {error}</div>
        )}

        {result && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/12 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
                <Brain className="text-purple-600 dark:text-purple-400" size={18} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Prediction Result</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/[0.04] p-6 text-center">
                <p className="text-gray-500 dark:text-white/50 text-sm mb-1">Predicted {result.target}</p>
                <p className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-violet-500 bg-clip-text text-transparent">{result.predicted_value}</p>
                <p className="text-gray-400 dark:text-white/35 text-xs mt-2">{POLLUTANTS.includes(result.target) ? 'μg/m³' : ''}</p>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Zone',          value: ZONES.find(z => z.id === result.zone_id)?.label },
                  { label: 'Timestamp',     value: result.timestamp },
                  { label: 'Training rows', value: result.training_rows?.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b border-gray-100 dark:border-white/8 pb-2">
                    <span className="text-gray-500 dark:text-white/50">{label}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
                <div>
                  <span className="text-gray-500 dark:text-white/50">Features used</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.features_used?.map((f: string) => (
                      <span key={f} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-500/12 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Predictor;
