'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, User, Search, Map } from 'lucide-react';

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    try {
      const res = await fetch('/api/passengers');
      const json = await res.json();
      if (json.success) setPassengers(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', phone: '' });
        fetchPassengers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            Pasajeros VIP
          </h1>
          <p className="text-slate-400 text-sm">
            Clientes registrados para el Cerebro de WhatsApp
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Pasajero
        </button>
      </div>

      {isLoading ? (
        <div className="text-white">Cargando pasajeros...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {passengers.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-slate-800 rounded-xl border border-slate-700">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-white font-medium">No hay pasajeros registrados</h3>
              <p className="text-slate-400 text-sm mt-1">
                Agrega clientes frecuentes para que el Cerebro los identifique por su número.
              </p>
            </div>
          ) : (
            passengers.map((p) => (
              <div key={p.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{p.name}</h3>
                    <p className="text-brand-400 text-sm font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {p.phone}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Registrar Pasajero VIP</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                  placeholder="Ej: Doña Martha Centro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Número de WhatsApp (con código 57)</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                  placeholder="Ej: 573110000000"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
