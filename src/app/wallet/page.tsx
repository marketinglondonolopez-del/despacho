'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, CheckCircle, RefreshCw, Car, AlertCircle } from 'lucide-react';

export default function WalletPage() {
  const [walletData, setWalletData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      const json = await res.json();
      if (json.success) {
        setWalletData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = async (phone: string, currentDebt: number) => {
    if (!confirm(`¿Confirmas que deseas registrar el pago de $${currentDebt.toLocaleString()} para este conductor?`)) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverPhone: phone,
          action: 'RECORD_PAYMENT',
          amount: currentDebt
        })
      });
      if (res.ok) {
        fetchWallet();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalGlobalDebt = walletData.reduce((acc, curr) => acc + (curr.debt || 0), 0);
  const totalServicesCount = walletData.reduce((acc, curr) => acc + (curr.completedServices || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            Contabilidad & Billetera ($500 por Servicio)
          </h1>
          <p className="text-slate-400 text-sm">
            Control automático de deudas y cobros de $500 COP por carrera ganada
          </p>
        </div>
        <button
          onClick={fetchWallet}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium flex items-center gap-2 border border-slate-700 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar Saldos
        </button>
      </div>

      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>TOTAL DEUDA ACUMULADA</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">
            ${totalGlobalDebt.toLocaleString()} COP
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Dinero pendiente por cobrar a conductores</p>
        </div>

        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>CARRERAS DESPACHADAS</span>
            <Car className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-3xl font-extrabold text-white font-mono">
            {totalServicesCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total de servicios asignados a $500 c/u</p>
        </div>

        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>TARIFA POR CARRERA</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white font-mono">
            $500 COP
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Cobro fijo asignado automáticamente por el Bot</p>
        </div>
      </div>

      {/* Tabla de Saldos de Conductores */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-white font-semibold text-sm">Estado de Cuenta por Conductor</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando contabilidad...</div>
        ) : walletData.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            No hay carreras registradas aún. Apenas los conductores acepten servicios con "1", aparecerán sus deudas aquí.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-6 py-3">Conductor</th>
                  <th className="px-6 py-3">Teléfono</th>
                  <th className="px-6 py-3">Carreras Hechas</th>
                  <th className="px-6 py-3">Deuda Acumulada ($500 c/u)</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {walletData.map((d, index) => (
                  <tr key={index} className="hover:bg-slate-700/30 transition-all">
                    <td className="px-6 py-4 font-semibold text-white">{d.name || d.driverPhone || 'Conductor'}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{d.phone || d.driverPhone}</td>
                    <td className="px-6 py-4 font-mono font-bold text-brand-400">{d.completedServices || 0} viajes</td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-extrabold text-base">
                      ${(d.debt || 0).toLocaleString()} COP
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRecordPayment(d.phone || d.driverPhone, d.debt || 0)}
                        disabled={isProcessing || (d.debt || 0) === 0}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Registrar Pago
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
