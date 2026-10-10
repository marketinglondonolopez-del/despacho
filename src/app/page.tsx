'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LiveFleetMap } from '@/components/admin/LiveFleetMap';
import {
  Car,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{ serviceId: string; serviceCode: string } | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Estados para Despacho Rápido manual (Ideal para pasar viajes que escriben en el grupo de WhatsApp)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    passengerPhone: '573001234567',
    passengerName: '',
    originAddress: '',
    destinationAddress: '',
    passengersCount: 1,
    notes: '',
  });
  const [isCreatingService, setIsCreatingService] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 6000); // Polling suave cada 6 seg
    return () => clearInterval(interval);
  }, []);

  const handleManualAssign = async () => {
    if (!assignModal || !selectedDriverId) return;
    setIsSubmittingAssign(true);
    try {
      const res = await fetch(`/api/services/${assignModal.serviceId}/manual-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriverId }),
      });
      if (res.ok) {
        setAssignModal(null);
        setSelectedDriverId('');
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleQuickCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingService(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        setCreateForm({
          passengerPhone: '573001234567',
          passengerName: '',
          originAddress: '',
          destinationAddress: '',
          passengersCount: 1,
          notes: '',
        });
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingService(false);
    }
  };

  const metrics = data?.metrics || {
    servicesTodayCount: 0,
    onlineDriversCount: 0,
    activeServicesCount: 0,
    completedTodayCount: 0,
    cancelledTodayCount: 0,
    pendingQualityAlertsCount: 0,
    driverCounts: { AVAILABLE: 0, BUSY: 0, PAUSED: 0, OFFLINE: 0 },
  };

  const fleet = data?.fleet || [];
  const activeServices = data?.activeServices || [];
  const availableDrivers = fleet.filter((d: any) => d.status === 'AVAILABLE');

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-8">
        {/* Encabezado */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Centro de Control de Despacho</h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitoreo en tiempo real de flota, servicios activos y calidad del transporte.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30"
            >
              <Plus className="w-4 h-4" /> ➕ Despacho Rápido (Nuevo Servicio)
            </button>
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Clave */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Hoy</span>
              <Car className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.servicesTodayCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Servicios totales</span>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Conductores</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{metrics.onlineDriversCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">{metrics.driverCounts.AVAILABLE} disponibles</span>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Activos</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{metrics.activeServicesCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">En gestión / viaje</span>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Completados</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-white">{metrics.completedTodayCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Viajes exitosos</span>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Cancelados</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{metrics.cancelledTodayCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Cancelaciones hoy</span>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Calidad</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-500">{metrics.pendingQualityAlertsCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Alertas 1-2 estrellas</span>
          </div>
        </div>

        {/* Radar Cartográfico en Vivo */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Ubicación y Estado de la Flota en Tiempo Real
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Actualización periódica automática
            </span>
          </div>
          <LiveFleetMap drivers={fleet} activeServices={activeServices} />
        </section>

        {/* Tabla de Servicios Activos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Servicios en Curso ({activeServices.length})
            </h3>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Pasajero</th>
                    <th className="px-4 py-3">Recogida</th>
                    <th className="px-4 py-3">Destino</th>
                    <th className="px-4 py-3">Conductor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {activeServices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No hay servicios activos en este momento.
                      </td>
                    </tr>
                  ) : (
                    activeServices.map((srv: any) => (
                      <tr key={srv.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                          {srv.publicCode}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">{srv.passenger?.name || 'Pasajero'}</div>
                          <div className="text-[10px] text-slate-500">{srv.passenger?.phone}</div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px] truncate" title={srv.originAddress}>
                          {srv.originAddress}
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px] truncate" title={srv.destinationAddress}>
                          {srv.destinationAddress}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {srv.driver ? (
                            <div>
                              <div className="font-semibold text-slate-200">{srv.driver.name}</div>
                              <div className="text-[10px] text-emerald-400 font-mono">
                                {srv.driver.vehicle?.licensePlate || ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-400 italic">Buscando conductor...</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {srv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {!srv.driverId && (
                            <button
                              onClick={() => setAssignModal({ serviceId: srv.id, serviceCode: srv.publicCode })}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition shadow"
                            >
                              Asignar Manual
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Modal de Asignación Manual de Emergencia */}
        {assignModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" /> Despacho Manual de Emergencia
              </h4>
              <p className="text-xs text-slate-400">
                Asignando servicio: <span className="font-bold text-white">{assignModal.serviceCode}</span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Seleccionar Conductor Disponible:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Seleccionar de la lista --</option>
                  {availableDrivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.vehicle?.brand} {d.vehicle?.licensePlate || ''}) - ⭐ {d.ratingAverage.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAssignModal(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={!selectedDriverId || isSubmittingAssign}
                  onClick={handleManualAssign}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmittingAssign ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Despacho Rápido (Creación directa desde pedidos del grupo de WhatsApp) */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-400" /> Despacho Rápido de Servicio
                </h4>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Pega o escribe los datos del pedido que pidieron por el grupo o por llamada:
              </p>

              <form onSubmit={handleQuickCreateService} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Punto de Recogida</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Barrio Granada, Cl 12 # 4-20"
                      value={createForm.originAddress}
                      onChange={(e) => setCreateForm({ ...createForm, originAddress: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Destino</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Centro Comercial Unicentro"
                      value={createForm.destinationAddress}
                      onChange={(e) => setCreateForm({ ...createForm, destinationAddress: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teléfono Pasajero</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: 573001234567"
                      value={createForm.passengerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, passengerPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Pasajeros</label>
                    <select
                      value={createForm.passengersCount}
                      onChange={(e) => setCreateForm({ ...createForm, passengersCount: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="1">1 Pasajero</option>
                      <option value="2">2 Pasajeros</option>
                      <option value="3">3 Pasajeros</option>
                      <option value="4">4 Pasajeros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Observaciones (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: 2 maletas, va con niño pequeño"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isCreatingService}
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {isCreatingService ? 'Despachando...' : '🚀 Despachar a Conductores Cercanos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
