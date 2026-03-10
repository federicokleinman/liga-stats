import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Navigation } from '@/components/Navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-26RLNVXN8M';

export const metadata: Metadata = {
  title: 'Liga Universitaria Stats',
  description: 'Métricas históricas de la Liga Universitaria de Deportes - Fútbol Mayores Masculino',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
          {children}
        </main>
        <footer className="border-t border-liga-border bg-liga-card mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#7b8ba3]">
              <p>
                Liga Universitaria Stats — Datos de{' '}
                <a href="https://ligauniversitaria.org.uy" target="_blank" rel="noopener noreferrer" className="text-liga-sky/70 hover:text-white">
                  ligauniversitaria.org.uy
                </a>
              </p>
              <div className="flex gap-4">
                <a href="/metodologia" className="text-liga-sky/50 hover:text-white transition-colors">Metodología</a>
                <a href="/predicciones" className="text-liga-sky/50 hover:text-white transition-colors">Predicciones</a>
                <a href="/comparar" className="text-liga-sky/50 hover:text-white transition-colors">Comparar</a>
                <a href="/contacto" className="text-liga-sky/50 hover:text-white transition-colors">Contacto</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
