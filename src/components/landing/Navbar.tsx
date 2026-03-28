'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#footer' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className={`text-lg font-bold tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              HR<span className="text-blue-400">Flow</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <button key={label} onClick={() => handleNavClick(href)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                {label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>
              Sign in
            </Link>
            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5">
              Get started free
            </Link>
          </div>

          {/* Hamburger */}
          <button onClick={() => setOpen(!open)} className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`block h-0.5 bg-current transition-all duration-300 origin-center ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 bg-current transition-all duration-300 ${open ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block h-0.5 bg-current transition-all duration-300 origin-center ${open ? '-rotate-45 -translate-y-[9px]' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-4 space-y-1">
          {NAV_LINKS.map(({ label, href }) => (
            <button key={label} onClick={() => handleNavClick(href)}
              className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
              {label}
            </button>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-gray-100">
            <Link href="/login" onClick={() => setOpen(false)} className="w-full text-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Sign in
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
