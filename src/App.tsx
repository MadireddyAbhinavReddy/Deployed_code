import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import CitizenDashboard from './components/CitizenDashboard';
import PolicyDashboard from './components/PolicyDashboard';
import MapView from './components/MapView';
// import Predictor from './components/Predictor';       // disabled — TabPFN not available on server
// import ForecastDashboard from './components/ForecastDashboard'; // disabled — Prophet memory issues
import FutureForecast from './components/FutureForecast';
import PolicyChat from './components/PolicyChat';
import { supabase } from './supabaseClient';
import { Users, Building2, Map, Wind, ArrowLeft, MessageCircle, Telescope, Moon, Sun, LogOut } from 'lucide-react';
import './App.css';

type ViewType = 'citizen' | 'policy' | 'map' | 'chat' | 'future';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeView, setActiveView]   = useState<ViewType>('citizen');
  const [dark, setDark]               = useState(() => localStorage.getItem('theme') === 'dark');
  const [session, setSession]         = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Sync dark mode
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLanding(true);
  };

  // Wait until we know auth state to avoid flash
  if (!authChecked) return null;

  // Landing page is always accessible without login
  if (showLanding) {
    return <LandingPage onEnter={() => {
      if (!session) {
        setShowLanding(false); // will show AuthPage
      } else {
        setShowLanding(false); // already logged in, go straight to dashboard
      }
    }} />;
  }

  // Not logged in → show auth page
  if (!session) return <AuthPage onAuth={() => setShowLanding(false)} />;

  return (
    <div className={`App min-h-screen ${dark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className={`${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowLanding(true)}
                className={`${dark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-800'} transition-colors`}>
                <ArrowLeft size={18} />
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Wind size={16} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>ClarityAI</h1>
                <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Hyderabad AQ</p>
              </div>
            </div>

            {/* Nav items — icon-only on mobile, icon+label on md+ */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {([
                { view: 'citizen',   icon: Users,         label: 'Live' },
                { view: 'policy',    icon: Building2,     label: 'Trends' },
                { view: 'map',       icon: Map,           label: 'Map' },
                // { view: 'forecast',  icon: TrendingUp,    label: 'Impact' },   // disabled
                { view: 'future',    icon: Telescope,     label: 'Forecast' },
                // { view: 'predictor', icon: Brain,         label: 'AI' },       // disabled
                { view: 'chat',      icon: MessageCircle, label: 'Chat' },
              ] as { view: ViewType; icon: any; label: string }[]).map(({ view, icon: Icon, label }) => (
                <button key={view} onClick={() => setActiveView(view)}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg transition-all text-xs sm:text-sm font-medium shrink-0 ${
                    activeView === view
                      ? 'bg-blue-600 text-white shadow-sm'
                      : dark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  <Icon size={14} />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}

              {/* Dark mode toggle */}
              <button onClick={() => setDark(d => !d)}
                className={`ml-1 p-1.5 sm:p-2 rounded-lg transition-all shrink-0 ${
                  dark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Logout */}
              <button onClick={handleLogout}
                className={`p-1.5 sm:p-2 rounded-lg transition-all shrink-0 ${
                  dark ? 'bg-gray-800 text-red-400 hover:bg-gray-700' : 'bg-gray-100 text-red-500 hover:bg-gray-200'
                }`}
                title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content — pass dark prop via CSS class on root */}
      <div className={dark ? 'dark' : ''}>
        {activeView === 'citizen'   && <CitizenDashboard />}
        {activeView === 'policy'    && <PolicyDashboard />}
        {activeView === 'map'       && <MapView />}
        {/* activeView === 'predictor' && <Predictor /> */}
        {/* activeView === 'forecast'  && <ForecastDashboard /> */}
        {activeView === 'future'    && <FutureForecast />}
        {activeView === 'chat'      && <PolicyChat />}
      </div>
    </div>
  );
}

export default App;
