import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Wind, ArrowRight, Activity, BarChart3, Map,
  TrendingUp, Brain, MessageSquare, Radio, FlaskConical, Search,
} from 'lucide-react';
import API_URL from '../config';

interface LandingPageProps {
  onEnter: () => void;
}

const getAQIInfo = (aqi: number) => {
  if (aqi <= 50)  return { label: 'Good',          color: '#4ade80' };
  if (aqi <= 100) return { label: 'Moderate',       color: '#facc15' };
  if (aqi <= 200) return { label: 'Unhealthy',      color: '#fb923c' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#f87171' };
  return               { label: 'Hazardous',        color: '#dc2626' };
};

const PROMPTS = [
  'What is the AQI near Kompally right now?',
  'Show PM2.5 trends for 2024...',
  'Did COVID lockdown reduce pollution?',
  'Predict NO₂ levels for tomorrow...',
];

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(strings: string[]) {
  const [text, setText] = useState('');
  const [idx, setIdx]   = useState(0);
  const [fwd, setFwd]   = useState(true);

  useEffect(() => {
    const target = strings[idx];
    if (fwd) {
      if (text.length < target.length) {
        const t = setTimeout(() => setText(target.slice(0, text.length + 1)), 48);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setFwd(false), 1800);
        return () => clearTimeout(t);
      }
    } else {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), 22);
        return () => clearTimeout(t);
      } else {
        setIdx((idx + 1) % strings.length);
        setFwd(true);
      }
    }
  }, [text, fwd, idx, strings]);

  return text;
}

// ── Section wrapper with inView animation ────────────────────────────────────
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Animated number counter ───────────────────────────────────────────────────
function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  const suffix = value.replace(/[0-9.]/g, '');
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || isNaN(num)) return;
    let start = 0;
    const steps = 40;
    const inc = num / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= num) { setDisplay(num); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [inView, num]);

  if (isNaN(num)) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{num >= 1000 ? (display / 1000).toFixed(1) + 'M' : Math.round(display) + suffix}</span>;
}

// ── Feature strip data ────────────────────────────────────────────────────────
const STRIPS = [
  {
    id: 'live',
    icon: Activity,
    title: 'Live AQI Monitor',
    tag: 'Real-time · 2s refresh',
    desc: 'Stream live pollution data from 7 Hyderabad TSPCB stations. Track PM2.5, PM10, NO₂, SO₂, CO, Ozone and 6 more pollutants alongside temperature, humidity, and wind.',
    stats: [{ v: '7', l: 'Stations' }, { v: '2s', l: 'Refresh' }, { v: '12', l: 'Pollutants' }],
    accent: '#10b981',
    bgFrom: '#0a1a12', bgTo: '#0d1f18',
    glow: 'rgba(16,185,129,0.18)',
    visual: 'bars',
  },
  {
    id: 'policy',
    icon: BarChart3,
    title: 'Policy Dashboard',
    tag: 'Analytics · 9 years',
    desc: 'Explore annual pollution trends across 14 stations with daily, weekly, and monthly aggregations. Double-click any chart to expand full-screen with custom date range filtering.',
    stats: [{ v: '14', l: 'Stations' }, { v: '9', l: 'Years' }, { v: '8.4M', l: 'Data pts' }],
    accent: '#3b82f6',
    bgFrom: '#080f1f', bgTo: '#0c1530',
    glow: 'rgba(59,130,246,0.18)',
    visual: 'line',
  },
  {
    id: 'map',
    icon: Map,
    title: 'Interactive Map',
    tag: 'Geospatial · Hyderabad',
    desc: 'Geographic visualization of pollution hotspots. Color-coded AQI circles with full pollutant breakdowns on click. Auto-falls back to CPCB national data when live feed is unavailable.',
    stats: [{ v: '7', l: 'Zones' }, { v: 'Live', l: 'Source' }, { v: 'CPCB', l: 'Fallback' }],
    accent: '#06b6d4',
    bgFrom: '#060f14', bgTo: '#091520',
    glow: 'rgba(6,182,212,0.18)',
    visual: 'dots',
  },
  {
    id: 'forecast',
    icon: FlaskConical,
    title: 'Policy Impact Forecast',
    tag: 'Prophet ML · Counterfactual',
    desc: 'Train Facebook Prophet on pre-policy data, forecast what pollution would look like without intervention, then compare against actual readings to quantify real policy impact.',
    stats: [{ v: 'Prophet', l: 'Model' }, { v: '4+', l: 'Policies' }, { v: 'Custom', l: 'Range' }],
    accent: '#a855f7',
    bgFrom: '#0e0814', bgTo: '#130d1e',
    glow: 'rgba(168,85,247,0.18)',
    visual: 'wave',
  },
  {
    id: 'future',
    icon: TrendingUp,
    title: 'Future Forecast',
    tag: 'XGBoost · Up to 1 year',
    desc: 'XGBoost trained on 9 years of 15-minute CPCB data projects pollution levels up to 1 year ahead using lag features and seasonal patterns. R² ~0.8 accuracy.',
    stats: [{ v: '1yr', l: 'Horizon' }, { v: 'XGBoost', l: 'Model' }, { v: '~0.8', l: 'R²' }],
    accent: '#f97316',
    bgFrom: '#150a02', bgTo: '#1c1005',
    glow: 'rgba(249,115,22,0.18)',
    visual: 'trend',
  },
  {
    id: 'predictor',
    icon: Brain,
    title: 'AI Predictor',
    tag: 'TabPFN · Zero-shot',
    desc: 'TabPFN in-context learning predicts any pollutant given a timestamp and known inputs — no retraining needed. Enter what you know, get an instant ML prediction.',
    stats: [{ v: 'TabPFN', l: 'Model' }, { v: '18', l: 'Targets' }, { v: 'None', l: 'Training' }],
    accent: '#ec4899',
    bgFrom: '#150510', bgTo: '#1c0818',
    glow: 'rgba(236,72,153,0.18)',
    visual: 'pulse',
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'Policy AI Chat',
    tag: 'RAG + Llama 3 · 33 docs',
    desc: 'Ask anything about Indian environmental law. Grounded in 33 official documents — NAAQS, CPCB guidelines, EIA notifications, waste management rules. Cites sources, never guesses.',
    stats: [{ v: '33', l: 'Documents' }, { v: 'Llama 3', l: 'Model' }, { v: 'RAG', l: 'Method' }],
    accent: '#8b5cf6',
    bgFrom: '#0a0814', bgTo: '#0f0c1e',
    glow: 'rgba(139,92,246,0.18)',
    visual: 'chat',
  },
  {
    id: 'citizen',
    icon: Radio,
    title: 'Citizen Health Alerts',
    tag: 'Personalized · GPS-aware',
    desc: 'Personalized health recommendations based on live AQI. Auto-locate your nearest station, get safe route suggestions, and view per-pollutant trend charts for your area.',
    stats: [{ v: 'GPS', l: 'Location' }, { v: '3', l: 'Routes' }, { v: 'Live', l: 'Alerts' }],
    accent: '#14b8a6',
    bgFrom: '#041210', bgTo: '#071a18',
    glow: 'rgba(20,184,166,0.18)',
    visual: 'health',
  },
];

// ── Mini visuals per strip ────────────────────────────────────────────────────
function StripVisual({ type, accent }: { type: string; accent: string }) {
  const bars = [40, 65, 50, 80, 55, 90, 70, 45, 75, 60, 85, 50];
  const linePoints = [60, 45, 55, 35, 50, 30, 40, 25, 35, 20, 30, 18];
  const trendPoints = [80, 75, 70, 68, 65, 60, 58, 52, 48, 42, 38, 32];

  if (type === 'bars') return (
    <div className="flex items-end gap-1.5 h-20">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-sm"
          style={{ backgroundColor: accent, opacity: 0.7 }}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );

  if (type === 'line' || type === 'trend') {
    const pts = type === 'trend' ? trendPoints : linePoints;
    const svgPts = pts.map((y, i) => `${(i / (pts.length - 1)) * 200},${y}`).join(' ');
    return (
      <svg viewBox="0 0 200 100" className="w-full h-20" preserveAspectRatio="none">
        <motion.polyline
          points={svgPts}
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.8 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
        <motion.polygon
          points={`0,100 ${svgPts} 200,100`}
          fill={accent}
          fillOpacity={0.12}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />
      </svg>
    );
  }

  if (type === 'dots') return (
    <div className="relative h-20 w-full">
      {[
        { x: '20%', y: '30%', r: 22, o: 0.9 },
        { x: '45%', y: '55%', r: 18, o: 0.7 },
        { x: '65%', y: '25%', r: 26, o: 0.85 },
        { x: '80%', y: '60%', r: 14, o: 0.6 },
        { x: '35%', y: '70%', r: 16, o: 0.65 },
      ].map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: d.x, top: d.y, width: d.r * 2, height: d.r * 2, backgroundColor: accent, opacity: 0 }}
          whileInView={{ opacity: d.o, scale: [0, 1.2, 1] }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.5 }}
        />
      ))}
    </div>
  );

  if (type === 'wave') {
    const wave = [50, 35, 55, 30, 60, 28, 50, 32, 45, 30, 50, 35];
    const svgW = wave.map((y, i) => `${(i / (wave.length - 1)) * 200},${y}`).join(' ');
    return (
      <svg viewBox="0 0 200 80" className="w-full h-20" preserveAspectRatio="none">
        <motion.polyline points={svgW} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeInOut' }} strokeOpacity={0.8} />
        {/* forecast dashed */}
        <motion.polyline
          points={wave.slice(6).map((y, i) => `${((i + 6) / (wave.length - 1)) * 200},${y - 12}`).join(' ')}
          fill="none" stroke={accent} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 0.5 }}
          viewport={{ once: true }} transition={{ duration: 1, delay: 0.8 }} />
      </svg>
    );
  }

  if (type === 'pulse') return (
    <div className="flex items-center justify-center h-20 gap-4">
      {[1, 1.4, 1, 1.6, 1].map((scale, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width: 12, height: 12, backgroundColor: accent }}
          animate={{ scale: [1, scale, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );

  if (type === 'chat') return (
    <div className="flex flex-col gap-2 h-20 justify-center">
      {['What are NAAQS PM2.5 limits?', 'Annual limit is 40 μg/m³ per CPCB.'].map((msg, i) => (
        <motion.div
          key={i}
          className={`text-xs px-3 py-1.5 rounded-xl max-w-[80%] ${i === 0 ? 'self-end' : 'self-start'}`}
          style={{ backgroundColor: i === 0 ? accent + '30' : accent + '18', color: accent, border: `1px solid ${accent}30` }}
          initial={{ opacity: 0, x: i === 0 ? 20 : -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.3, duration: 0.4 }}
        >
          {msg}
        </motion.div>
      ))}
    </div>
  );

  if (type === 'health') return (
    <div className="flex items-center gap-3 h-20">
      {['Good', 'Moderate', 'Unhealthy'].map((label, i) => {
        const colors = ['#4ade80', '#facc15', '#fb923c'];
        return (
          <motion.div key={i} className="flex-1 rounded-xl p-2 text-center"
            style={{ backgroundColor: colors[i] + '20', border: `1px solid ${colors[i]}40` }}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.4 }}>
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: colors[i] }} />
            <div className="text-xs font-medium" style={{ color: colors[i] }}>{label}</div>
          </motion.div>
        );
      })}
    </div>
  );

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [liveAQI, setLiveAQI] = useState<number | null>(null);
  const typed = useTypewriter(PROMPTS);

  useEffect(() => {
    fetch(`${API_URL}/live/latest`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const avg = Math.round(data.reduce((s, z) => s + (z.aqi || 0), 0) / data.length);
          setLiveAQI(avg);
        }
      }).catch(() => {});
  }, []);

  const aqiInfo = liveAQI ? getAQIInfo(liveAQI) : null;

  return (
    <div className="text-white overflow-x-hidden">

      {/* ══ HERO — sky aesthetic ══════════════════════════════════════════════ */}
      <div className="relative min-h-screen flex flex-col overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 28% 18%, rgba(147,197,253,0.32) 0%, transparent 52%),
            radial-gradient(ellipse at 72% 8%,  rgba(186,230,253,0.22) 0%, transparent 42%),
            radial-gradient(ellipse at 50% 55%, rgba(100,116,139,0.28) 0%, transparent 58%),
            linear-gradient(175deg, #1a3a5c 0%, #2a5580 16%, #4278aa 32%, #6498c8 48%, #82aed2 60%, #567898 76%, #182638 100%)
          `,
        }}
      >
        {/* Cloud layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[7%] left-[4%] w-[440px] h-[150px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, rgba(200,225,245,0.3) 65%, transparent 100%)', filter: 'blur(20px)' }} />
          <div className="absolute top-[3%] left-[20%] w-[300px] h-[110px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, transparent 100%)', filter: 'blur(15px)' }} />
          <div className="absolute top-[11%] right-[6%] w-[400px] h-[130px] rounded-full opacity-22"
            style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.88) 0%, rgba(190,218,242,0.3) 68%, transparent 100%)', filter: 'blur(22px)' }} />
          <div className="absolute top-[22%] right-[24%] w-[240px] h-[90px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.85) 0%, transparent 100%)', filter: 'blur(14px)' }} />
          <div className="absolute top-[32%] left-[38%] w-[520px] h-[170px] rounded-full opacity-12"
            style={{ background: 'radial-gradient(ellipse, rgba(175,210,238,0.8) 0%, transparent 100%)', filter: 'blur(32px)' }} />
          {/* bottom haze */}
          <div className="absolute bottom-0 left-0 right-0 h-[48%]"
            style={{ background: 'linear-gradient(to top, rgba(12,22,36,0.9) 0%, rgba(18,32,50,0.5) 40%, transparent 100%)' }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/12 backdrop-blur flex items-center justify-center border border-white/20">
              <Wind size={16} className="text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight text-white">ClarityAI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/65">
            {['Live Monitor', 'Policy', 'Forecast', 'Map'].map(label => (
              <button key={label} onClick={onEnter} className="hover:text-white transition-colors">{label}</button>
            ))}
          </div>

          <button onClick={onEnter}
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/25 bg-white/10 backdrop-blur text-sm font-medium text-white hover:bg-white/20 transition-all">
            Open Dashboard <ArrowRight size={14} />
          </button>
        </nav>

        {/* Hero body */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-16 pt-4">

          {/* AQI pill */}
          {aqiInfo && liveAQI && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/20 backdrop-blur border border-white/15 text-sm mb-8">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: aqiInfo.color }} />
              <span className="text-white/75">Hyderabad AQI</span>
              <span className="font-bold" style={{ color: aqiInfo.color }}>{liveAQI}</span>
              <span className="text-white/40">·</span>
              <span style={{ color: aqiInfo.color }}>{aqiInfo.label}</span>
            </motion.div>
          )}

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.04] mb-5 max-w-3xl">
            {'Breathe smarter.'.split('').map((char, i) => (
              <motion.span key={i}
                initial={{ y: 70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.028, type: 'spring', stiffness: 140, damping: 22 }}
                className="inline-block text-white"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}
            className="text-white/60 text-lg md:text-xl max-w-lg mb-10 leading-relaxed">
            Real-time pollution monitoring, AI forecasting, and policy insights for Hyderabad.
          </motion.p>

          {/* Search bar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
            className="w-full max-w-md mb-3">
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 hover:border-white/35 transition-all">
              <Search size={17} className="text-white/35 shrink-0" />
              <span className="flex-1 text-left text-white/45 text-sm">
                {typed}<span className="animate-pulse opacity-70">|</span>
              </span>
              <button onClick={onEnter}
                className="w-8 h-8 rounded-xl bg-white/18 hover:bg-white/30 flex items-center justify-center transition-all shrink-0">
                <ArrowRight size={14} className="text-white" />
              </button>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
            className="text-white/30 text-xs mb-12">
            Monitor everything. Ask anything.
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.6 }}
            className="inline-block group relative bg-gradient-to-b from-white/15 to-white/5 p-px rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow mb-14">
            <button onClick={onEnter}
              className="rounded-[1.1rem] px-8 py-3.5 text-sm font-semibold bg-white/12 hover:bg-white/20 backdrop-blur text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-white/15 flex items-center gap-2.5">
              <span className="opacity-90 group-hover:opacity-100">Get Started</span>
              <span className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">→</span>
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-10 md:gap-16">
            {[{ v: '14', l: 'Stations' }, { v: '9', l: 'Years' }, { v: '8.4M', l: 'Data points' }, { v: '33', l: 'Policy docs' }].map(({ v, l }) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-bold text-white"><Counter value={v} /></div>
                <div className="text-white/40 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex justify-center pb-6">
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1 text-white/30 text-xs">
            <span>Explore features</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* ══ FEATURE STRIPS ═══════════════════════════════════════════════════ */}
      {STRIPS.map((strip, idx) => {
        const Icon = strip.icon;
        const isEven = idx % 2 === 0;
        return (
          <Section key={strip.id}>
            <div
              className="relative overflow-hidden py-20 px-8 md:px-16 lg:px-24"
              style={{ background: `linear-gradient(135deg, ${strip.bgFrom} 0%, ${strip.bgTo} 100%)` }}
            >
              {/* Glow blob */}
              <div className="absolute pointer-events-none"
                style={{
                  width: 500, height: 500, borderRadius: '50%',
                  background: `radial-gradient(circle, ${strip.glow} 0%, transparent 70%)`,
                  top: isEven ? '-100px' : 'auto', bottom: isEven ? 'auto' : '-100px',
                  left: isEven ? '-100px' : 'auto', right: isEven ? 'auto' : '-100px',
                }} />

              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${strip.accent}60, transparent)` }} />

              <div className={`relative z-10 max-w-6xl mx-auto flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 md:gap-20`}>

                {/* Text side */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: strip.accent + '20', border: `1px solid ${strip.accent}40` }}>
                      <Icon size={20} style={{ color: strip.accent }} />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: strip.accent + '18', color: strip.accent, border: `1px solid ${strip.accent}30` }}>
                      {strip.tag}
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{strip.title}</h2>
                  <p className="text-white/55 text-base leading-relaxed mb-8 max-w-md">{strip.desc}</p>

                  {/* Stats row */}
                  <div className="flex gap-6 mb-8">
                    {strip.stats.map(({ v, l }) => (
                      <div key={l}>
                        <div className="text-xl font-bold" style={{ color: strip.accent }}>{v}</div>
                        <div className="text-white/40 text-xs mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>

                  <button onClick={onEnter}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ backgroundColor: strip.accent + '20', color: strip.accent, border: `1px solid ${strip.accent}40` }}>
                    Open {strip.title} <ArrowRight size={14} />
                  </button>
                </div>

                {/* Visual side */}
                <div className="flex-1 w-full max-w-sm md:max-w-none">
                  <div className="rounded-2xl p-6 border"
                    style={{ backgroundColor: strip.accent + '08', borderColor: strip.accent + '25' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strip.accent }} />
                      <span className="text-xs text-white/40 font-medium">{strip.title}</span>
                    </div>
                    <StripVisual type={strip.visual} accent={strip.accent} />
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${strip.accent}30, transparent)` }} />
            </div>
          </Section>
        );
      })}

      {/* ══ TECH STACK ═══════════════════════════════════════════════════════ */}
      <Section>
        <div className="py-16 px-8 border-t border-white/6" style={{ background: '#080c12' }}>
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-6">Powered by</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['TSPCB Hyderabad', 'CPCB National', 'data.gov.in', 'Neon PostgreSQL', 'Prophet', 'XGBoost', 'TabPFN', 'Llama 3.1', 'Groq', 'FastAPI', 'React'].map(s => (
                <span key={s} className="px-4 py-2 rounded-xl text-sm text-white/40 font-medium border border-white/8 bg-white/4">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ══ FINAL CTA ════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden py-28 px-6 text-center"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 60%),
            linear-gradient(180deg, #080c12 0%, #0a1020 100%)
          `,
        }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }} />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Ready to explore?</h2>
          <p className="text-white/45 text-lg mb-10">Real-time data, AI forecasts, and policy insights — all in one place.</p>
          <div className="inline-block group relative bg-gradient-to-b from-white/15 to-white/5 p-px rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <button onClick={onEnter}
              className="rounded-[1.1rem] px-10 py-4 text-base font-semibold bg-white/10 hover:bg-white/18 backdrop-blur text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-white/15 flex items-center gap-3">
              <span className="opacity-90 group-hover:opacity-100">Launch Dashboard</span>
              <span className="opacity-55 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/6 py-5 px-8 flex items-center justify-between text-xs text-white/25"
        style={{ background: '#060a10' }}>
        <span>ClarityAI · Hyderabad Air Quality Intelligence</span>
        <span>Data: TSPCB · CPCB · data.gov.in</span>
      </div>
    </div>
  );
};

export default LandingPage;
