'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, MessagesSquare, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import { TarjetaDeHerramienta } from '@/components/app/seccion/piezas';

export interface FilaDePliego {
  id: string;
  cara: 'formulacion' | 'absolucion';
  procedimiento: string;
  numeroProcedimiento: string;
  entradas: number;
  actualizado: string;
}

/**
 * La puerta del módulo: elegir de qué lado se trabaja y retomar lo
 * empezado. Las dos caras son el mismo documento visto desde el
 * participante y desde el comité, así que se abren desde el mismo sitio.
 */
export function ListadoDePliegos({
  pliegos,
  puedeAbsolver,
  puedeFormular,
}: {
  pliegos: FilaDePliego[];
  puedeAbsolver: boolean;
  puedeFormular: boolean;
}) {
  const router = useRouter();
  const [creando, setCreando] = useState<'formulacion' | 'absolucion' | null>(null);

  async function crear(cara: 'formulacion' | 'absolucion') {
    setCreando(cara);
    try {
      const res = await fetch('/api/consultas/pliegos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cara }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail ?? 'No se pudo crear');
      router.push(`/evaluar/consultas/${j.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setCreando(null);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {puedeFormular && (
          <button type="button" onClick={() => crear('formulacion')} className="text-left">
            <TarjetaDeHerramienta
              href="#"
              icono={FileText}
              familia="evaluar"
              titulo="Formular consultas y observaciones"
              descripcion="Prepara el escrito que se presenta a la entidad sobre las bases: referencia, sustento fáctico, sustento jurídico y solicitud."
              llamada={creando === 'formulacion' ? 'Creando…' : 'Empezar un escrito'}
              className="pointer-events-none"
            />
          </button>
        )}
        {puedeAbsolver && (
          <button type="button" onClick={() => crear('absolucion')} className="text-left">
            <TarjetaDeHerramienta
              href="#"
              icono={MessagesSquare}
              familia="evaluar"
              titulo="Absolver consultas y observaciones"
              descripcion="Responde como comité de selección: decisión, fundamentos con su norma y qué se incorpora a las bases integradas."
              llamada={creando === 'absolucion' ? 'Creando…' : 'Empezar una absolución'}
              className="pointer-events-none"
            />
          </button>
        )}
      </div>

      {pliegos.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <header className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-bold tracking-tight">Continuar donde lo dejaste</h2>
            {creando && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </header>
          <ul className="mt-3 space-y-2">
            {pliegos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/evaluar/consultas/${p.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3.5 py-3 transition-colors hover:border-evaluar-300 hover:bg-evaluar-50/60 dark:hover:border-evaluar-800 dark:hover:bg-evaluar-900/20"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-evaluar-500/12">
                    {p.cara === 'absolucion' ? (
                      <MessagesSquare className="h-4 w-4 text-evaluar-600 dark:text-evaluar-400" />
                    ) : (
                      <FileText className="h-4 w-4 text-evaluar-600 dark:text-evaluar-400" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">
                      {p.procedimiento || 'Procedimiento sin nombre'}
                      {p.numeroProcedimiento && ` · N° ${p.numeroProcedimiento}`}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {p.cara === 'absolucion' ? 'Absolución' : 'Formulación'} ·{' '}
                      {p.entradas} {p.entradas === 1 ? 'solicitud' : 'solicitudes'} · editado{' '}
                      <RelativeTime date={p.actualizado} />
                    </span>
                  </span>
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 shrink-0 text-evaluar-500 transition-transform',
                      'group-hover:translate-x-0.5',
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pliegos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[13.5px] text-muted-foreground">
          <Plus className="mx-auto mb-2 h-5 w-5" />
          Todavía no has empezado ninguno. Elige arriba de qué lado trabajas.
        </p>
      )}
    </>
  );
}
