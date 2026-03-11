'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WhatsAppShare } from './WhatsAppShare';

const mainLinks = [
  { href: '/', label: 'Temporada 2025' },
  { href: '/jugadores', label: 'Jugadores' },
  { href: '/planilla/login', label: 'Planilla Digital' },
];

const archivoLinks = [
  { href: '/historico', label: 'Resumen Histórico' },
  { href: '/historico/temporadas', label: 'Temporadas' },
  { href: '/historico/equipos', label: 'Equipos' },
];

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [archivoOpen, setArchivoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const isArchivoActive =
    pathname.startsWith('/historico') ||
    pathname.startsWith('/equipos/') ||
    pathname === '/comparar';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setArchivoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Track scroll for transparent nav on home
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 60);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const linkClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-liga-blue text-white'
        : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`;

  const isHome = pathname === '/';

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      isHome && !scrolled
        ? 'bg-transparent border-b border-transparent'
        : 'bg-[#0d1526]/95 backdrop-blur-md border-b border-liga-blue/30'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-liga-sky hover:text-white transition-colors shrink-0">
            Liga Universitaria
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {mainLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(isActive(link.href))}>
                {link.label}
              </Link>
            ))}

            {/* Archivo dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setArchivoOpen(!archivoOpen)}
                onMouseEnter={() => setArchivoOpen(true)}
                className={`${linkClass(isArchivoActive)} inline-flex items-center gap-1`}
              >
                Archivo
                <svg className={`w-3.5 h-3.5 transition-transform ${archivoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {archivoOpen && (
                <div
                  className="absolute right-0 mt-1 w-48 bg-[#131d2e] border border-liga-border rounded-lg shadow-xl py-1 z-50"
                  onMouseLeave={() => setArchivoOpen(false)}
                >
                  {archivoLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setArchivoOpen(false)}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        isActive(link.href)
                          ? 'text-white bg-liga-blue/20'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-2">
              <WhatsAppShare text="Mirá las estadísticas de la Liga Universitaria" />
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
            aria-label="Menú"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-1">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block ${linkClass(isActive(link.href))}`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 pb-1 px-4 text-xs font-semibold text-liga-sky/70 uppercase tracking-wider">
              Archivo
            </div>
            {archivoLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block ${linkClass(isActive(link.href))}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
