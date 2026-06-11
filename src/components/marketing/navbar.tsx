'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Producto', href: '#producto' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Casos de uso', href: '#casos' },
  { label: 'Precios', href: '/pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-sm'
          : 'bg-transparent',
      )}
    >
      <nav className="container flex h-20 items-center justify-between gap-6">
        <Link href="/" className="inline-flex items-center">
          <LogoMark size="lg" />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors group"
            >
              {link.label}
              <span className="absolute left-3 right-3 bottom-1 h-0.5 bg-brand-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-700 hover:text-slate-900">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm" variant="default" className="hidden sm:inline-flex shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all">
            <Link href="/login">
              Empezar gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Button asChild variant="ghost" size="sm" className="flex-1">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="flex-1">
                <Link href="/login">Empezar gratis</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
}
