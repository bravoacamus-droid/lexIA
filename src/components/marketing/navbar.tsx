'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Producto', href: '#producto' },
  { label: 'Funciones', href: '#funciones' },
  { label: 'Casos de uso', href: '#casos' },
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
          ? 'border-b border-border bg-background/80 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav className="container flex h-16 items-center justify-between gap-6">
        <Logo size="md" />

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:flex" />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm" variant="default" className="hidden sm:inline-flex">
            <Link href="/login">Solicitar acceso</Link>
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
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="container py-4 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm" className="flex-1">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" className="flex-1">
                <Link href="/login">Solicitar acceso</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
}
