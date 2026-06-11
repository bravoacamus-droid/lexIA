import Link from 'next/link';
import { LogoMark } from '@/components/logo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4 md:col-span-2">
            <LogoMark size="lg" />
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              Inteligencia artificial fundamentada en la normativa peruana de
              Contrataciones del Estado. Una herramienta de{' '}
              <span className="font-semibold text-slate-900">
                Corporación Gung Ho E.I.R.L.
              </span>
              .
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Plataforma operativa
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
              Producto
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="#funciones" className="text-slate-600 hover:text-brand-600 transition-colors">Funciones</Link></li>
              <li><Link href="#casos" className="text-slate-600 hover:text-brand-600 transition-colors">Casos de uso</Link></li>
              <li><Link href="/pricing" className="text-slate-600 hover:text-brand-600 transition-colors">Precios</Link></li>
              <li><Link href="#faq" className="text-slate-600 hover:text-brand-600 transition-colors">FAQ</Link></li>
              <li><Link href="/login" className="text-slate-600 hover:text-brand-600 transition-colors">Iniciar sesión</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/legal/terminos" className="text-slate-600 hover:text-brand-600 transition-colors">Términos</Link></li>
              <li><Link href="/legal/privacidad" className="text-slate-600 hover:text-brand-600 transition-colors">Privacidad</Link></li>
              <li><Link href="/legal/cookies" className="text-slate-600 hover:text-brand-600 transition-colors">Cookies</Link></li>
              <li><a href="mailto:hola@promptive.pe" className="text-slate-600 hover:text-brand-600 transition-colors">Contacto</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} LexIA · Corporación Gung Ho E.I.R.L. Todos los derechos reservados.
          </p>
          <p className="text-xs text-slate-500">
            Hecho en Lima con Next.js, Supabase y mucha jurisprudencia.
          </p>
        </div>
      </div>
    </footer>
  );
}
