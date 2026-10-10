'use client';

import React, { useState } from 'react';
import { Navigation, Car, AlertCircle, Clock, Star, Phone } from 'lucide-react';

interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  status: 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'OFFLINE';
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationUpdate: string | null;
  isLocationStale: boolean;
  ratingAverage: number;
  ratingCount: number;
  completedServicesCount: number;
  vehicle: {
    brand: string;
    model: string;
    licensePlate: string;
    color: string;
  } | null;
}

interface ActiveService {
  id: string;
  publicCode: string;
  originAddress: string;
  destinationAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  status: string;
  driverId: string | null;
}

export function LiveFleetMap({
  drivers,
  activeServices = [],
}: {
  drivers: FleetDriver[];
  activeServices?: ActiveService[];
}) {
  const [selectedDriver, setSelectedDriver] = useState<FleetDriver | null>(null);

  // Coordenadas de referencia para mapear la vista a Cali (Lat: 3.35 a 3.50, Lon: -76.56 a -76.50)
  const minLat = 3.35;
  const maxLat = 3.50;
  const minLon = -76.56;
  const maxLon = -76.50;

  const getCoordinatesPct = (lat: number | null, lon: number | null) => {
    if (!lat || !lon) return { x: 50, y: 50 };
    const x = ((lon - minLon) / (maxLon - minLon)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100; // Invertir Y para coordenadas de pantalla
    return {
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
    };
  };

  const getStatusColor = (status: FleetDriver['status'], isStale: boolean) => {
    if (isStale) return 'bg-amber-600 border-amber-300';
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500 border-emerald-300 shadow-emerald-500/50';
      case 'BUSY':
        return 'bg-rose-500 border-rose-300 shadow-rose-500/50';
      case 'PAUSED':
        return 'bg-amber-400 border-amber-200 shadow-amber-400/50';
      case 'OFFLINE':
      default:
        return 'bg-slate-400 border-slate-200';
    }
  };

  return (
    <div className="relative w-full h-[540px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
      {/* Barra superior de estado */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 items-center bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> Radar de Flota en Vivo
        </span>
        <div className="h-3 w-px bg-slate-700 mx-1" />
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          {drivers.filter((d) => d.status === 'AVAILABLE').length} Disponibles
        </span>
        <span className="flex items-center gap-1 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          {drivers.filter((d) => d.status === 'BUSY').length} En viaje
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          {drivers.filter((d) => d.status === 'PAUSED').length} Pausados
        </span>
      </div>

      {/* Cuadrícula cartográfica con referencias urbanas */}
      <div className="relative flex-1 w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Zonas de referencia urbanas */}
        <div className="absolute top-[20%] left-[45%] text-[10px] uppercase font-bold tracking-wider text-slate-600 select-none">
          Zona Norte / Chipichape
        </div>
        <div className="absolute top-[45%] left-[30%] text-[10px] uppercase font-bold tracking-wider text-slate-600 select-none">
          Barrio Granada
        </div>
        <div className="absolute top-[50%] left-[55%] text-[10px] uppercase font-bold tracking-wider text-slate-600 select-none">
          Centro Histórico
        </div>
        <div className="absolute top-[80%] left-[40%] text-[10px] uppercase font-bold tracking-wider text-slate-600 select-none">
          Zona Sur / Unicentro
        </div>

        {/* Líneas de rutas activas */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {activeServices.map((srv) => {
            const start = getCoordinatesPct(srv.originLatitude, srv.originLongitude);
            const end = getCoordinatesPct(srv.destinationLatitude, srv.destinationLongitude);
            return (
              <g key={srv.id}>
                <line
                  x1={`${start.x}%`}
                  y1={`${start.y}%`}
                  x2={`${end.x}%`}
                  y2={`${end.y}%`}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeOpacity="0.6"
                />
                <circle cx={`${start.x}%`} cy={`${start.y}%`} r="4" fill="#10b981" />
                <circle cx={`${end.x}%`} cy={`${end.y}%`} r="4" fill="#ef4444" />
              </g>
            );
          })}
        </svg>

        {/* Marcadores de Conductores */}
        {drivers.map((driver) => {
          const coords = getCoordinatesPct(driver.currentLatitude, driver.currentLongitude);
          const colorClass = getStatusColor(driver.status, driver.isLocationStale);

          return (
            <button
              key={driver.id}
              onClick={() => setSelectedDriver(driver)}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none z-10 transition-transform duration-300 hover:scale-125"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-white shadow-lg ${colorClass}`}
              >
                <Car className="w-3.5 h-3.5" />
              </div>
              <span className="absolute top-8 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900/90 text-slate-200 text-[10px] font-medium rounded whitespace-nowrap shadow border border-slate-700 pointer-events-none">
                {driver.name.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Popover de detalle del conductor seleccionado */}
        {selectedDriver && (
          <div className="absolute bottom-4 right-4 z-30 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl text-slate-100 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-base text-white">{selectedDriver.name}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-400" /> {selectedDriver.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 bg-slate-800 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg">
                <span className="text-slate-400">Estado operativo:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    selectedDriver.status === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : selectedDriver.status === 'BUSY'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selectedDriver.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg">
                <span className="text-slate-400">Vehículo:</span>
                <span className="font-medium text-white">
                  {selectedDriver.vehicle
                    ? `${selectedDriver.vehicle.brand} ${selectedDriver.vehicle.model} (${selectedDriver.vehicle.licensePlate})`
                    : 'Sin vehículo'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg">
                <span className="text-slate-400">Reputación:</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {selectedDriver.ratingAverage.toFixed(1)} · {selectedDriver.ratingCount} viajes
                </span>
              </div>

              {selectedDriver.isLocationStale && (
                <div className="flex items-center gap-1.5 p-2 bg-amber-950/60 text-amber-300 border border-amber-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Señal GPS retrasada (&gt; 45 seg)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
