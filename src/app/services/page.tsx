'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Car, Search, Filter, RefreshCw, Send, CheckCircle, XCircle } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{ serviceId: string; serviceCode: string } | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [srvRes, drvRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/drivers'),
      ]);
      if (srvRes.ok) setServices(await srvRes.json());
      if (drvRes.ok) setDrivers(await drvRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualAssign = async () => {
    if (!assignModal || !selectedDriverId) return;
    try {
      const res = await fetch(`/api/services/${assignModal.serviceId}/manual-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriverId }),
      });
      if (res.ok) {
        setAssignModal(null);
        setSelectedDriverId('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.publicCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.passenger?.phone.includes(searchTerm) ||
      s.originAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter ? s.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Historial de Servicios</h2>
            <p className="text-xs text-slate-400 mt-1">
              Registro completo de viajes, trazabilidad de estados y auditoría.
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

        {/* Barra de Filtros */}
        <div className="flex flex-wrap gap-3 items-center bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por código, teléfono o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none"
            >
              <option value="" className="bg-slate-900">Todos los estados</option>
              <option value="SEARCHING_DRIVER" className="bg-slate-900">SEARCHING_DRIVER</option>
              <option value="CONFIRMED" className="bg-slate-900">CONFIRMED</option>
              <option value="IN_PROGRESS" className="bg-slate-900">IN_PROGRESS</option>
              <option value="COMPLETED" className="bg-slate-900">COMPLETED</option>
              <option value="CANCELLED_BY_CUSTOMER" className="bg-slate-900">CANCELLED_BY_CUSTOMER</option>
              <option value="CANCELLED_BY_DRIVER" className="bg-slate-900">CANCELLED_BY_DRIVER</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Fecha/Hora</th>
                  <th className="px-4 py-3">Pasajero</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Conductor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Calificación</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No se encontraron servicios registrados con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                        {srv.publicCode}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(srv.createdAt).toLocaleString('es-CO', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{srv.passenger?.name || 'Pasajero'}</div>
                        <div className="text-[10px] text-slate-500">{srv.passenger?.phone}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="truncate text-slate-300 text-[11px]">📍 {srv.originAddress}</div>
                        <div className="truncate text-slate-400 text-[10px]">🎯 {srv.destinationAddress}</div>
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
                          <span className="text-slate-500 italic">Sin conductor</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            srv.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : srv.status.startsWith('CANCELLED')
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {srv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {srv.rating ? (
                          <span className="text-amber-400 font-bold">
                            {'⭐'.repeat(srv.rating.stars)} ({srv.rating.stars})
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {!srv.driverId && !['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER'].includes(srv.status) && (
                          <button
                            onClick={() => setAssignModal({ serviceId: srv.id, serviceCode: srv.publicCode })}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition shadow"
                          >
                            Asignar
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

        {/* Modal de Asignación Manual */}
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
                  Seleccionar Conductor:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Seleccionar de la lista --</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.vehicle?.brand} {d.vehicle?.licensePlate || ''}) - {d.status}
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
                  disabled={!selectedDriverId}
                  onClick={handleManualAssign}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  Confirmar Asignación
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
