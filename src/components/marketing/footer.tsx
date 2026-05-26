import Link from 'next/link';
import { Logo } from '@/components/logo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <Logo size="md" />
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Inteligencia artificial fundamentada en la normativa peruana de Contrataciones del Estado.
              Una herramienta de <span className="font-medium text-foreground">Promptive</span>.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Producto
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#funciones" className="hover:text-foreground text-muted-foreground">Funciones</Link></li>
              <li><Link href="#casos" className="hover:text-foreground text-muted-foreground">Casos de uso</Link></li>
              <li><Link href="#faq" className="hover:text-foreground text-muted-foreground">FAQ</Link></li>
              <li><Link href="/login" className="hover:text-foreground text-muted-foreground">Iniciar sesión</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-foreground text-muted-foreground">Términos</Link></li>
              <li><Link href="#" className="hover:text-foreground text-muted-foreground">Privacidad</Link></li>
              <li><Link href="#" className="hover:text-foreground text-muted-foreground">Contacto</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LexIA · Promptive. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Hecho en Lima con Next.js, Supabase y mucha jurisprudencia.
          </p>
        </div>
      </div>
    </footer>
  );
}
