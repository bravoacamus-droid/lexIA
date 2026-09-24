'use client';

/**
 * Los expedientes del usuario, en pestañas por perfil: así pidió César
 * el historial del generador (reunión del 27/07/2026), «clasificado… le
 * das clic y aparece únicamente la lista de área usuaria».
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import { ACTUACIONES, PERFILES, type Actuacion, type Perfil } from '@/lib/ejecucion/catalogo';
import type { SemaforoProcedencia } from '@/lib/ejecucion/tipos';
import { Luz } from './semaforos';

export interface FilaDeExpediente {
  id: string;
  titulo: string;
  updated_at: string;
  documentos: number;
  actuaciones: Array<{ id: string; perfil: Perfil; actuacion: Actuacion | null; semaforo: SemaforoProcedencia | null }>;
}

export function ListaDeExpedientes({ filas }: { filas: FilaDeExpediente[] }) {
  const [pestana, setPestana] = useState<Perfil | 'todos'>('todos');
  const perfiles = useMemo(() => {
    const vistos: Perfil[] = [];
    for (const f of filas) for (const a of f.actuaciones) if (PERFILES[a.perfil] && !vistos.includes(a.perfil)) vistos.push(a.perfil);
    return vistos;
  }, [filas]);
  const visibles = pestana === 'todos' ? filas : filas.filter((f) => f.actuaciones.some((a) => a.perfil === pestana));

  if (filas.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
        <FolderOpen className="h-4.5 w-4.5 text-generar-600" /> Tus expedientes
      </h2>
      {perfiles.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {(['todos', ...perfiles] as const).map((p) => (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={pestana === p}
              onClick={() => setPestana(p)}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                pestana === p ? 'border-generar-500 bg-generar-500 text-white' : 'border-border bg-card hover:border-generar-300',
              )}
            >
              {p === 'todos' ? 'Todos' : PERFILES[p].nombre}
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {visibles.map((f) => (
          <li key={f.id}>
            <Link
              href={`/generador/expedientes/${f.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-generar-300 dark:hover:border-generar-700"
            >
              <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{f.titulo}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.actuaciones.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-0.5 text-[11.5px]">
                    {a.semaforo && <Luz color={a.semaforo} className="h-2 w-2" />}
                    {PERFILES[a.perfil]?.nombre ?? a.perfil}
                    {a.actuacion && <span className="text-muted-foreground">· {ACTUACIONES[a.actuacion]?.nombre}</span>}
                  </span>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {f.documentos} {f.documentos === 1 ? 'documento' : 'documentos'}
                </span>
                <RelativeTime date={f.updated_at} />
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
