'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Star, AlertTriangle, ShieldCheck, Filter, RefreshCw, ThumbsUp } from 'lucide-react';

export default function ReputationPage() {
  const [data, setData] = useState<{ ratings: any[]; alerts: any[] }>({ ratings: [], alerts: [] });
  const [drivers, setDrivers] = useState<any[]>([]);
  const [minStars, setMinStars] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const url = minStars ? `/api/ratings?minStars=${minStars}` : '/api/ratings';
      const [ratingsRes, driversRes] = await Promise.all([
        fetch(url),
        fetch('/api/drivers'),
      ]);
      if (ratingsRes.ok) setData(await ratingsRes.json());
      if (driversRes.ok) setDrivers(await driversRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [minStars]);

  // Ranking de conductores por promedio
  const topDrivers = [...drivers].sort((a, b) => b.ratingAverage - a.ratingAverage);

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              Gestión de Reputación y Control de Calidad
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitoreo continuo de calificaciones, recálculo dinámico de métricas y alertas de servicio.
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Sección de Alertas Activas (1 y 2 Estrellas) */}
        {data.alerts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>ALERTAS DE CALIDAD PENDIENTES ({data.alerts.length})</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-rose-950/30 border border-rose-800/80 rounded-2xl p-4 shadow-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      Conductor: {alert.driver?.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {'⭐'.repeat(alert.stars)} ({alert.stars} Estrellas)
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">{alert.reason}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-rose-900/60">
                    <span>{new Date(alert.createdAt).toLocaleString('es-CO')}</span>
                    <span className="font-semibold text-rose-300">Requiere revisión administrativa</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cuadrícula: Top Conductores y Distribución de Reputación */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Top Conductores
            </h3>

            <div className="divide-y divide-slate-800/60">
              {topDrivers.slice(0, 5).map((drv, idx) => (
                <div key={drv.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-xs text-white">{drv.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {drv.completedServicesCount} viajes · {drv.vehicle?.brand}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xs text-amber-400 flex items-center gap-1 justify-end">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {drv.ratingAverage.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {drv.ratingCount} reviews
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial Reciente de Calificaciones */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Últimas Calificaciones Recibidas</h3>

              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={minStars}
                  onChange={(e) => setMinStars(e.target.value)}
                  className="bg-transparent text-slate-300 focus:outline-none text-[11px]"
                >
                  <option value="" className="bg-slate-900">Todas las estrellas</option>
                  <option value="5" className="bg-slate-900">⭐⭐⭐⭐⭐ 5 Estrellas</option>
                  <option value="4" className="bg-slate-900">⭐⭐⭐⭐ 4+ Estrellas</option>
                  <option value="2" className="bg-slate-900">⚠️ Bajas (1 y 2 Estrellas)</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[380px] overflow-y-auto pr-1">
              {data.ratings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No hay calificaciones registradas que coincidan con el filtro.
                </div>
              ) : (
                data.ratings.map((r) => (
                  <div key={r.id} className="py-3 space-y-1.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        Conductor: {r.driver?.name}
                      </span>
                      <span className="text-amber-400 font-black">
                        {'⭐'.repeat(r.stars)} ({r.stars})
                      </span>
                    </div>

                    {r.feedbackTag && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                        <ThumbsUp className="w-2.5 h-2.5" /> {r.feedbackTag}
                      </span>
                    )}

                    {r.comment && (
                      <p className="text-[11px] text-slate-300 italic">"{r.comment}"</p>
                    )}

                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Servicio: {r.service?.publicCode}</span>
                      <span>{new Date(r.createdAt).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
