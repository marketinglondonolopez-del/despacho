import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp Dispatch System | Centro Inteligente de Despacho',
  description: 'Plataforma profesional de despacho de servicios de transporte por WhatsApp y PWA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
