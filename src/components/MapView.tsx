import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getAQICategory } from '../utils/mockData';
import API_URL from '../config';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const REFRESH_INTERVAL = 10000; // refresh map every 10 seconds

const MapView: React.FC = () => {
  const [zones, setZones]             = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchZones = useCallback(() => {
    fetch(`${API_URL}/live/latest`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0 && !data[0]?.error) {
          setZones(data);
          setLastUpdated(new Date());
        } else {
          // Fallback: use data.gov.in API
          return fetch(`${API_URL}/api/realtime?city=Hyderabad`)
            .then(r => r.json())
            .then(apiData => {
              const stations = apiData?.stations || [];
              const mapped = stations
                .filter((s: any) => s.latitude && s.longitude)
                .map((s: any) => ({
                  zone_id:   s.station,
                  label:     s.station?.replace(', Hyderabad - TSPCB', ''),
                  lat:       parseFloat(s.latitude),
                  lng:       parseFloat(s.longitude),
                  aqi:       s.aqi ?? 0,
                  pm2_5:     s['PM2.5'],
                  pm10:      s['PM10'],
                  no2:       s['NO2'],
                  so2:       s['SO2'],
                  co:        s['CO'],
                  ozone:     s['OZONE'],
                  no:        s['NO'],
                  nox:       s['NOx'],
                  nh3:       s['NH3'],
                  benzene:   s['Benzene'],
                  toluene:   s['Toluene'],
                  xylene:    s['Xylene'],
                  timestamp: s.last_update,
                }));
              if (mapped.length > 0) {
                setZones(mapped);
                setLastUpdated(new Date());
              }
            });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
    L.Marker.prototype.options.icon = DefaultIcon;

    fetchZones(); // initial fetch
    intervalRef.current = setInterval(fetchZones, REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchZones]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">India Pollution Map</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time air quality monitoring across major Indian cities</p>
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block"></span>
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
              <div className="mt-0.5">Refreshes every 10s</div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 sm:p-6">
          <div className="h-[500px] sm:h-[600px] rounded-lg overflow-hidden">
            <MapContainer
              center={[17.45, 78.35]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {zones.map((zone) => {
                const category = getAQICategory(zone.aqi);
                return (
                  <CircleMarker
                    key={zone.zone_id}
                    center={[zone.lat, zone.lng]}
                    radius={20}
                    fillColor={category.color}
                    color="#fff"
                    weight={2}
                    opacity={1}
                    fillOpacity={0.7}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-3 border-b pb-2">{zone.label}</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <strong>AQI:</strong>
                            <span className="text-lg font-bold px-2 py-1 rounded" style={{ color: category.color, backgroundColor: category.bgColor }}>
                              {zone.aqi}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <strong>Category:</strong>
                            <span style={{ color: category.color }}>{category.label}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="text-sm">
                            <p className="font-semibold mb-2">Pollutant Levels:</p>
                            <div className="space-y-1">
                              {[
                                ['PM2.5', zone.pm2_5, 'μg/m³'],
                                ['PM10', zone.pm10, 'μg/m³'],
                                ['NO₂', zone.no2, 'μg/m³'],
                                ['SO₂', zone.so2, 'μg/m³'],
                                ['CO', zone.co, 'mg/m³'],
                                ['Ozone', zone.ozone, 'μg/m³'],
                                ['NO', zone.no, 'μg/m³'],
                                ['NOx', zone.nox, 'ppb'],
                                ['NH₃', zone.nh3, 'μg/m³'],
                                ['Benzene', zone.benzene, 'μg/m³'],
                                ['Toluene', zone.toluene, 'μg/m³'],
                                ['Xylene', zone.xylene, 'μg/m³'],
                              ].filter(([, value]) => value != null && !isNaN(Number(value)))
                               .map(([label, value, unit]) => (
                                <div key={label as string} className="flex justify-between">
                                  <span>{label}:</span>
                                  <span className="font-semibold">{Number(value).toFixed(2)} {unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <hr className="my-2" />
                          <p className="text-xs text-gray-500">Updated: {new Date(zone.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Good (0-50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Moderate (51-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Unhealthy (101-200)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Very Unhealthy (201-300)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-900"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Hazardous (300+)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
