'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Navigation,
  Power,
  Pause,
  Play,
  CheckCircle,
  Phone,
  Clock,
  MapPin,
  Shield,
  Star,
  AlertCircle,
  Smartphone,
} from 'lucide-react';

export default function DriverModePage() {
  const [driver, setDriver] = useState<any>(null);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [activeService, setActiveService] = useState<any>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar conductores para selector de inicio de sesión de demostración/operación
  useEffect(() => {
    fetch('/api/drivers')
      .then((res) => res.json())
      .then((data) => {
        setDriversList(data);
        if (data.length > 0) setDriver(data[0]);
      })
      .catch(console.error);
  }, []);

  // Consultar si el conductor tiene servicio activo asignado
  useEffect(() => {
    if (!driver) return;
    const checkService = async () => {
      try {
        const res = await fetch(`/api/services?driverId=${driver.id}`);
        if (res.ok) {
          const services = await res.json();
          const active = services.find(
            (s: any) =>
              ![
                'COMPLETED',
                'CANCELLED_BY_CUSTOMER',
                'CANCELLED_BY_DRIVER',
                'EXPIRED',
              ].includes(s.status)
          );
          setActiveService(active || null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkService();
    const interval = setInterval(checkService, 4000);
    return () => clearInterval(interval);
  }, [driver]);

  // Transmisión periódica de GPS mientras esté en AVAILABLE o BUSY
  useEffect(() => {
    if (!driver || driver.status === 'OFFLINE' || driver.status === 'PAUSED') {
      setIsGpsActive(false);
      return;
    }

    setIsGpsActive(true);

    // Intentar activar Screen Wake Lock API
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then(() => setWakeLockActive(true))
        .catch(() => setWakeLockActive(false));
    }

    const sendGps = async (lat: number, lng: number) => {
      setLastCoords({ lat, lng });
      try {
        await fetch(`/api/drivers/${driver.id}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            accuracyMeters: 8,
            speedKmh: 30,
          }),
        });
      } catch (e) {
        console.error(e);
      }
    };

    // Coordenadas base (Barrio Granada, Cali) con pequeña variación determinista
    let baseLat = driver.currentLatitude || 3.4578;
    let baseLng = driver.currentLongitude || -76.5332;

    const gpsTimer = setInterval(() => {
      baseLat += (Math.random() - 0.5) * 0.0008;
      baseLng += (Math.random() - 0.5) * 0.0008;
      sendGps(baseLat, baseLng);
    }, 7000);

    return () => clearInterval(gpsTimer);
  }, [driver?.id, driver?.status]);

  const handleStatusChange = async (newStatus: string) => {
    if (!driver) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/drivers/${driver.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDriver(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Acciones sobre el servicio activo
  const handleServiceAction = async (endpoint: string) => {
    if (!activeService || !driver) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/services/${activeService.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.id }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveService(updated.status === 'COMPLETED' ? null : updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">
        Cargando interfaz de conductor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-800 shadow-2xl font-sans">
      {/* Barra superior de estado */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">{driver.name}</h1>
            <p className="text-[11px] text-slate-400">
              {driver.vehicle ? `${driver.vehicle.brand} · ${driver.vehicle.licensePlate}` : 'Sin vehículo'}
            </p>
          </div>
        </div>

        {/* Selector rápido de conductor activo para testing */}
        <select
          value={driver.id}
          onChange={(e) => {
            const found = driversList.find((d) => d.id === e.target.value);
            if (found) setDriver(found);
          }}
          className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
        >
          {driversList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name.split(' ')[0]}
            </option>
          ))}
        </select>
      </header>

      {/* Indicador de Disponibilidad y Telemetría */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                driver.status === 'AVAILABLE'
                  ? 'bg-emerald-500 animate-pulse'
                  : driver.status === 'BUSY'
                  ? 'bg-rose-500'
                  : driver.status === 'PAUSED'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-black text-sm tracking-wide">
              {driver.status === 'AVAILABLE'
                ? '🟢 DISPONIBLE'
                : driver.status === 'BUSY'
                ? '🔴 EN VIAJE'
                : driver.status === 'PAUSED'
                ? '🟡 EN PAUSA'
                : '⚫ FUERA DE SERVICIO'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/50">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{driver.ratingAverage.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400 font-normal">({driver.ratingCount})</span>
          </div>
        </div>

        {/* Estado GPS y Wake Lock */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Navigation className={`w-3.5 h-3.5 ${isGpsActive ? 'text-emerald-400 animate-spin' : 'text-slate-600'}`} />
            <span>{isGpsActive ? 'GPS Activo (Cada 7s)' : 'GPS Inactivo'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Smartphone className="w-3 h-3 text-blue-400" />
            <span>{wakeLockActive ? 'Pantalla Activa' : 'Normal'}</span>
          </div>
        </div>
      </div>

      {/* Contenido Principal: Servicio Activo o Botones de Disponibilidad */}
      <main className="flex-1 p-4 space-y-4">
        {activeService ? (
          /* Card de Viaje Activo con Botones de 1 Toque */
          <div className="bg-slate-900 border-2 border-brand-500/60 rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-brand-500/20 text-brand-400 border border-brand-500/30">
                {activeService.publicCode}
              </span>
              <span className="text-xs font-bold text-amber-400">{activeService.status}</span>
            </div>

            {/* Datos del Pasajero */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {activeService.passenger?.name || 'Pasajero'}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-blue-400" /> {activeService.passenger?.phone}
                  </p>
                </div>
                <a
                  href={`tel:${activeService.passenger?.phone}`}
                  className="p-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-white shadow-lg shadow-brand-600/30 transition"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              {/* Ruta */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Recogida</span>
                    <span className="font-semibold text-slate-200">{activeService.originAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Destino</span>
                    <span className="font-semibold text-slate-200">{activeService.destinationAddress}</span>
                  </div>
                </div>

                {activeService.notes && (
                  <div className="pt-1 border-t border-slate-900 text-[11px] text-amber-300">
                    📝 Nota: {activeService.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Acción de 1 Toque según el Estado */}
            <div className="pt-2 space-y-2">
              {['DRIVER_ACCEPTED', 'CONFIRMED', 'DRIVER_EN_ROUTE'].includes(activeService.status) && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleServiceAction('arrive')}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> 📍 YA LLEGUÉ
                </button>
              )}

              {activeService.status === 'DRIVER_ARRIVED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleServiceAction('start')}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" /> ▶️ INICIAR SERVICIO
                </button>
              )}

              {['IN_PROGRESS', 'PASSENGER_PICKED_UP'].includes(activeService.status) && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleServiceAction('complete')}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> ✅ FINALIZAR SERVICIO
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Panel de Control de Disponibilidad */
          <div className="space-y-4 pt-4">
            {driver.status === 'AVAILABLE' ? (
              <div className="text-center py-8 space-y-4 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500 animate-pulse">
                  <Navigation className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Buscando solicitudes cercanas</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Mantén la pantalla encendida. Recibirás las alertas aquí y en tu WhatsApp.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => handleStatusChange('PAUSED')}
                    className="py-3 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-4 h-4" /> PAUSAR
                  </button>
                  <button
                    onClick={() => handleStatusChange('OFFLINE')}
                    className="py-3 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold hover:bg-rose-500/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Power className="w-4 h-4" /> DESCONECTAR
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-6">
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('AVAILABLE')}
                  className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-slate-950" /> ACTIVAR DISPONIBILIDAD
                </button>

                {driver.status === 'PAUSED' && (
                  <button
                    onClick={() => handleStatusChange('OFFLINE')}
                    className="w-full py-3 bg-slate-900 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition"
                  >
                    SALIR DE SERVICIO (OFFLINE)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
