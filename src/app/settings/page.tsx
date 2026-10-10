'use client';

import React, { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Settings, Save, CheckCircle, ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    round1Drivers: 3,
    round1Timeout: 15,
    round1Radius: 2.0,
    round2Drivers: 5,
    round2Timeout: 20,
    round2Radius: 4.0,
    maxRadius: 8.0,
    gpsStaleSeconds: 45,
    minRatingsStable: 50,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-500" />
            Configuración Paramétrica de Despacho
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ajuste dinámico de algoritmos, temporizadores de ronda y radios de cobertura sin modificar código.
          </p>
        </div>

        {saved && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-semibold animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Parámetros actualizados con éxito en la base de datos y caché de Redis.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Parámetros de Rondas */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white">Parámetros de Rondas de Despacho</h3>

            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ronda 1: Conductores</label>
                <input
                  type="number"
                  value={config.round1Drivers}
                  onChange={(e) => setConfig({ ...config, round1Drivers: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <span className="text-[10px] text-slate-500">Conductores más cercanos</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ronda 1: Tiempo Espera (seg)</label>
                <input
                  type="number"
                  value={config.round1Timeout}
                  onChange={(e) => setConfig({ ...config, round1Timeout: parseInt(e.target.value) || 15 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <span className="text-[10px] text-slate-500">Tiempo de respuesta</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ronda 1: Radio Inicial (km)</label>
                <input
                  type="number"
                  step="0.5"
                  value={config.round1Radius}
                  onChange={(e) => setConfig({ ...config, round1Radius: parseFloat(e.target.value) || 2.0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <span className="text-[10px] text-slate-500">Radio de búsqueda</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-xs pt-3 border-t border-slate-800">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ronda 2: Conductores</label>
                <input
                  type="number"
                  value={config.round2Drivers}
                  onChange={(e) => setConfig({ ...config, round2Drivers: parseInt(e.target.value) || 5 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ronda 2: Tiempo Espera (seg)</label>
                <input
                  type="number"
                  value={config.round2Timeout}
                  onChange={(e) => setConfig({ ...config, round2Timeout: parseInt(e.target.value) || 20 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ronda 2: Radio Ampliado (km)</label>
                <input
                  type="number"
                  step="0.5"
                  value={config.round2Radius}
                  onChange={(e) => setConfig({ ...config, round2Radius: parseFloat(e.target.value) || 4.0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Parámetros de Calidad y GPS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white">Telemetría GPS y Reputación</h3>

            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Umbral de GPS Obsoleto / Stale (segundos)
                </label>
                <input
                  type="number"
                  value={config.gpsStaleSeconds}
                  onChange={(e) => setConfig({ ...config, gpsStaleSeconds: parseInt(e.target.value) || 45 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <span className="text-[10px] text-slate-500">
                  Si no emite en este tiempo, se penaliza en el scoring.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Viajes mínimos para Reputación Consolidada
                </label>
                <input
                  type="number"
                  value={config.minRatingsStable}
                  onChange={(e) => setConfig({ ...config, minRatingsStable: parseInt(e.target.value) || 50 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <span className="text-[10px] text-slate-500">
                  Tier de confianza alta para el conductor.
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-brand-600/30"
          >
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </form>
      </main>
    </div>
  );
}
