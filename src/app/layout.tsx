import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Liga Universitaria Stats',
  description: 'Métricas históricas de la Liga Universitaria de Deportes - Fútbol Mayores Masculino',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
          {children}
        </main>
        <footer className="border-t border-[#1e293b] bg-[#111827] mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <p>
                Liga Universitaria Stats — Datos de{' '}
                <a href="https://ligauniversitaria.org.uy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                  ligauniversitaria.org.uy
                </a>
              </p>
              <div className="flex gap-4">
                <a href="/contacto" className="text-gray-400 hover:text-white transition-colors">Contacto</a>
                <a href="/contacto" className="text-gray-400 hover:text-white transition-colors">Reportar error</a>
                <a href="/metodologia" className="text-gray-400 hover:text-white transition-colors">Metodología</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
