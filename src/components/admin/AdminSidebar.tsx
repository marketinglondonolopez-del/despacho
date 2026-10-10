'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  Users,
  Star,
  Settings,
  Smartphone,
  ShieldCheck,
  Radio,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Servicios', href: '/services', icon: Car },
  { name: 'Conductores', href: '/drivers', icon: Users },
  { name: 'Pasajeros VIP', href: '/passengers', icon: Users },
  { name: 'Contabilidad / Saldos', href: '/wallet', icon: Settings },
  { name: 'Reputación y Alertas', href: '/reputation', icon: Star },
  { name: 'Modo Conductor (PWA)', href: '/driver-mode', icon: Smartphone, highlight: true },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 min-h-screen text-slate-300">
      <div>
        {/* Encabezado del Sistema */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide">DESPACHO WA</h1>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Meta Cloud API v20
            </p>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : item.highlight
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer del sidebar */}
      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-white font-medium mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Producción Segura</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Transacciones ACID & Lock Atómico distribuidos activos.
        </p>
      </div>
    </aside>
  );
}
