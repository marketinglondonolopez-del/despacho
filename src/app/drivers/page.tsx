'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Users, Plus, Star, Phone, RefreshCw, Car } from 'lucide-react';

export default function DriversAdminPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nationalId: '',
    brand: '',
    model: '',
    licensePlate: '',
    color: '',
    category: 'BASICO',
  });

  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/drivers');
      if (res.ok) setDrivers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const handleStatusChange = async (driverId: string, status: string) => {
    try {
      const res = await fetch(`/api/drivers/${driverId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) loadDrivers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          nationalId: formData.nationalId,
          vehicle: {
            brand: formData.brand,
            model: formData.model,
            licensePlate: formData.licensePlate,
            color: formData.color,
            category: formData.category,
          },
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSuccessBanner(`¡Conductor ${formData.name} registrado con éxito!`);
        setTimeout(() => setSuccessBanner(''), 4000);
        setFormData({
          name: '',
          phone: '',
          nationalId: '',
          brand: '',
          model: '',
          licensePlate: '',
          color: '',
          category: 'BASICO',
        });
        await loadDrivers();
      } else {
        const errJson = await res.json();
        setErrorMessage(errJson.error || 'No se pudo guardar el conductor.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error de conexión al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-500" />
              Gestión de Conductores y Flota
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Registro, estados de disponibilidad en tiempo real y asignación de vehículos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDrivers}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-600/30"
            >
              <Plus className="w-4 h-4" /> Registrar Conductor
            </button>
          </div>
        </div>

        {successBanner && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <span>✅</span>
            <span>{successBanner}</span>
          </div>
        )}

        {/* Tabla de Conductores */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Conductor</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Vehículo</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Reputación</th>
                  <th className="px-4 py-3">Servicios</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                      {d.name}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-blue-400" /> {d.phone}
                      </div>
                      <div className="text-[10px] text-slate-500">CC: {d.nationalId}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model}` : 'Sin vehículo'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {d.vehicle?.licensePlate || '-'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{d.ratingAverage.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({d.ratingCount} viajes)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-white">{d.completedServicesCount}</span>
                      <span className="text-[10px] text-slate-500 ml-1">completados</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'AVAILABLE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : d.status === 'BUSY'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : d.status === 'PAUSED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusChange(d.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="AVAILABLE">Disponible</option>
                        <option value="PAUSED">Pausar</option>
                        <option value="OFFLINE">Desconectar</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para Crear Conductor */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-500" /> Registrar Nuevo Conductor y Vehículo
              </h3>

              {errorMessage && (
                <div className="p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-300 text-xs font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Nombre Completo</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Carlos Rodríguez"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Teléfono Móvil (WhatsApp)</label>
                    <input
                      required
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ej: 573001234567"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Cédula / Documento</label>
                  <input
                    required
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="Ej: 1144002345"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h4 className="font-bold text-slate-300 mb-2">Información del Vehículo</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Marca</label>
                      <input
                        required
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Ej: Renault"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Modelo / Línea</label>
                      <input
                        required
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="Ej: Logan 2022"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Placa</label>
                      <input
                        required
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                        placeholder="ABC123"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Color</label>
                      <input
                        required
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="Gris"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Categoría</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                      >
                        <option value="BASICO">Básico</option>
                        <option value="CONFORT">Confort</option>
                        <option value="CAMIONETA">Camioneta</option>
                        <option value="VAN">Van</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Conductor'}
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
