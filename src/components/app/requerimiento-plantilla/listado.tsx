'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Loader2,
  Package,
  Settings2,
  UserRound,
  DraftingCompass,
  HardHat,
  ShoppingCart,
  Gavel,
  ArrowRight,
  Clock,
  Info,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, enOracion } from '@/lib/utils';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
} from '@/components/app/seccion/piezas';

interface Fila {
  id: string;
  plantilla_id: string;
  denominacion: string;
  status: string;
  updated_at: string;
}

interface Plantilla {
  id: string;
  familia: 'menor_8_uit' | 'procedimiento_seleccion';
  objeto: 'bienes' | 'servicios' | 'consultoria_general' | 'consultoria_obras' | 'obras';
  titulo: string;
}

/**
 * Cómo se agrupa el catálogo.
 *
 * Los quince formatos en una lista corrida no dicen nada: no se ve que
 * los tres primeros son de menos de 8 UIT ni que hay cuatro familias de
 * procedimiento. Se ordenan como los ordena el propio OECE —bienes,
 * servicios, consultoría de obras y ejecución de obras.
 *
 * Cada familia lleva ahora su propio tinte. Es un cambio de criterio
 * respecto de agosto, cuando César pidió que no se llenara de colores:
 * su mockup de setiembre las pinta de cuatro colores distintos, y con
 * un panel por familia el color separa bloques en vez de competir
 * dentro de uno.
 */
const GRUPOS: Array<{
  clave: string;
  titulo: string;
  icono: LucideIcon;
  objetos: Array<Plantilla['objeto']>;
  panel: string;
  chapa: string;
  tinta: string;
}> = [
  {
    clave: 'bienes',
    titulo: 'Bienes',
    icono: Package,
    objetos: ['bienes'],
    panel: 'border-sky-200/80 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/25',
    chapa: 'bg-sky-100 dark:bg-sky-900/50',
    tinta: 'text-sky-700 dark:text-sky-300',
  },
  {
    clave: 'servicios',
    titulo: 'Servicios',
    icono: Settings2,
    objetos: ['servicios', 'consultoria_general'],
    panel: 'border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/25',
    chapa: 'bg-emerald-100 dark:bg-emerald-900/50',
    tinta: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    clave: 'consultoria_obras',
    titulo: 'Consultoría de obras',
    icono: DraftingCompass,
    objetos: ['consultoria_obras'],
    panel: 'border-violet-200/80 bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/25',
    chapa: 'bg-violet-100 dark:bg-violet-900/50',
    tinta: 'text-violet-700 dark:text-violet-300',
  },
  {
    clave: 'obras',
    titulo: 'Ejecución de obras',
    icono: HardHat,
    objetos: ['obras'],
    panel: 'border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/25',
    chapa: 'bg-amber-100 dark:bg-amber-900/50',
    tinta: 'text-amber-700 dark:text-amber-300',
  },
];

/**
 * Cómo se presentan los tres formatos de menos de 8 UIT.
 *
 * El título oficial —«CONTRATACIÓN DE BIENES MENOR A 8 UIT»— es el que
 * va en el documento, pero como rótulo de una tarjeta es largo y repite
 * lo que ya dice el encabezado del bloque. El mockup usa un nombre de
 * una palabra y deja el detalle debajo.
 */
const MENORES: Record<number, { icono: LucideIcon; nombre: string; texto: string }> = {
  0: { icono: Package, nombre: 'Bienes', texto: 'Adquisición de bienes (menor a 8 UIT)' },
  1: {
    icono: Settings2,
    nombre: 'Servicios',
    texto: 'Contratación de servicios (menor a 8 UIT)',
  },
  2: {
    icono: UserRound,
    nombre: 'Servicios de persona natural',
    texto: 'Servicios técnicos, profesionales o especializados (menor a 8 UIT)',
  },
};

export function ListadoRequerimientos({
  requerimientos,
  plantillas,
}: {
  requerimientos: Fila[];
  plantillas: Plantilla[];
}) {
  const router = useRouter();
  // El mockup entra por la tarjeta, no por un formulario de abajo: se
  // elige el formato y la denominación se pide justo después, en un
  // cuadro. Antes había que bajar, escribir y volver a subir a
  // comprobar qué estaba marcado.
  const [elegida, setElegida] = useState<Plantilla | null>(null);
  const [denominacion, setDenominacion] = useState('');
  const [creando, setCreando] = useState(false);

  const porId = new Map(plantillas.map((p) => [p.id, p]));
  const menores = plantillas.filter((p) => p.familia === 'menor_8_uit');

  async function crear() {
    if (!elegida || denominacion.trim().length < 2) return;
    setCreando(true);
    try {
      const res = await fetch('/api/generadores/requerimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantilla_id: elegida.id, denominacion: denominacion.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('No se pudo crear', { description: j?.detail ?? j?.error });
        return;
      }
      router.push(`/generador/requerimiento-plantilla/${j.id}`);
    } catch (e) {
      toast.error('Fallo al crear', { description: (e as Error).message });
    } finally {
      setCreando(false);
    }
  }

  function elegir(p: Plantilla) {
    setElegida(p);
    setDenominacion('');
  }

  return (
    <Pagina className="max-w-[1300px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Generar', href: '/generar' },
          { label: 'Requerimientos' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={ClipboardList}
        familia="generar"
        etiqueta="Generador de requerimientos"
        titulo="Nuevo requerimiento"
        bajada={
          <>
            Selecciona el tipo de requerimiento que deseas elaborar.
            <br className="hidden sm:block" /> Elige una opción y A-LexIA te guiará paso a paso con
            el formato oficial y la normativa aplicable.
          </>
        }
        aside={
          <NotaDelCompanero icono={Info} familia="generar" className="max-w-[330px]">
            Todos los formatos se encuentran alineados a la normativa vigente (Ley N.° 32069 y su
            reglamento).
          </NotaDelCompanero>
        }
      />

      {/* I · Menores a 8 UIT. En su propia caja: no comparten estructura
          con los procedimientos de selección, y mezclarlos hacía que
          pareciera una lista de quince cosas equivalentes. */}
      {menores.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <header className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-generar-500/12">
              <ShoppingCart
                className="h-4.5 w-4.5 text-generar-600 dark:text-generar-400"
                strokeWidth={2}
              />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight">Contrataciones menores a 8 UIT</h2>
              <p className="text-[12.5px] text-muted-foreground">
                Selecciona el tipo de requerimiento:
              </p>
            </div>
          </header>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {menores.map((p, i) => {
              const b = MENORES[i];
              const Icono = b?.icono ?? Package;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegir(p)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-generar-300 hover:shadow-glow dark:hover:border-generar-700"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-generar-500/12">
                    <Icono
                      className="h-5 w-5 text-generar-600 dark:text-generar-400"
                      strokeWidth={1.9}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold tracking-tight">
                      {b?.nombre ?? enOracion(p.titulo)}
                    </span>
                    {b && (
                      <span className="mt-0.5 block text-pretty text-[12px] leading-snug text-muted-foreground">
                        {b.texto}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-generar-500 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* II · Procedimientos de selección, una familia por panel. */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <header className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-generar-500/12">
            <Gavel
              className="h-4.5 w-4.5 text-generar-600 dark:text-generar-400"
              strokeWidth={2}
            />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">Procedimientos de selección</h2>
            <p className="text-[12.5px] text-muted-foreground">
              Selecciona el tipo de requerimiento:
            </p>
          </div>
        </header>

        <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GRUPOS.map((g) => {
            const dentro = plantillas.filter(
              (p) => p.familia === 'procedimiento_seleccion' && g.objetos.includes(p.objeto),
            );
            if (dentro.length === 0) return null;
            const Icono = g.icono;
            return (
              <div key={g.clave} className={cn('rounded-xl border p-3.5', g.panel)}>
                <h3 className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      g.chapa,
                    )}
                  >
                    <Icono className={cn('h-4 w-4', g.tinta)} strokeWidth={2} />
                  </span>
                  <span className={cn('text-[15px] font-bold tracking-tight', g.tinta)}>
                    {g.titulo}
                  </span>
                </h3>
                <div className="mt-3 space-y-2">
                  {dentro.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => elegir(p)}
                      className="group flex w-full items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2.5 text-left transition-colors hover:border-foreground/20 hover:bg-background"
                    >
                      <span className="min-w-0 flex-1 text-pretty text-[13px] font-medium leading-snug">
                        {enOracion(p.titulo)}
                      </span>
                      <ArrowRight
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5',
                          g.tinta,
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {plantillas.length < 15 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Se están incorporando el resto de formatos oficiales.
          </p>
        )}
      </section>

      {/* La tira que lleva a lo empezado, como en el mockup. */}
      {requerimientos.length > 0 && (
        <a
          href="#mis-requerimientos"
          className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft transition-colors hover:border-generar-300 dark:hover:border-generar-700"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-generar-500/12">
            <Clock className="h-4 w-4 text-generar-600 dark:text-generar-400" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold tracking-tight">
              ¿Tienes un requerimiento iniciado?
            </span>
            <span className="block text-[12.5px] text-muted-foreground">
              Continúa editando tus borradores y evita perder tu avance.
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-generar-600 dark:text-generar-400">
            Ver mis borradores
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </a>
      )}

      <section id="mis-requerimientos" className="scroll-mt-20">
        <h2 className="mb-3 text-[15px] font-bold tracking-tight">
          Mis requerimientos{' '}
          <span className="font-normal text-muted-foreground">({requerimientos.length})</span>
        </h2>
        {requerimientos.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Todavía no has creado ninguno. Elige un formato arriba para empezar.
          </Card>
        ) : (
          <div className="space-y-2">
            {requerimientos.map((f) => (
              <Link key={f.id} href={`/generador/requerimiento-plantilla/${f.id}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:border-generar-300 dark:hover:border-generar-700">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.denominacion}</p>
                    <p className="text-xs text-muted-foreground">
                      {enOracion(porId.get(f.plantilla_id)?.titulo ?? f.plantilla_id)}
                    </p>
                  </div>
                  <Badge variant="secondary">{f.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* El módulo anterior queda accesible desde aquí. No va en el menú
          para no ofrecer dos entradas que se llaman igual, pero quien
          tenga documentos allí debe poder abrirlos. */}
      <p className="text-xs text-muted-foreground">
        ¿Buscas los requerimientos que hiciste con el formato anterior de Anexo (EETT/TDR)?{' '}
        <Link
          href="/generador/requerimiento"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Están aquí
        </Link>
        .
      </p>

      {/* La denominación, justo después de elegir el formato. */}
      <Dialog open={!!elegida} onOpenChange={(abierto) => !abierto && setElegida(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{enOracion(elegida?.titulo ?? '')}</DialogTitle>
            <DialogDescription>
              Dale un nombre a la contratación. Es el que verás en tus borradores y el que
              encabeza el documento.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="denominacion" className="text-sm font-medium">
              Denominación de la contratación
            </Label>
            <Input
              id="denominacion"
              value={denominacion}
              onChange={(e) => setDenominacion(e.target.value)}
              placeholder="Adquisición de muebles de melamina para oficinas administrativas"
              className="mt-1.5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void crear();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setElegida(null)}>
              Cancelar
            </Button>
            <Button onClick={crear} disabled={creando || denominacion.trim().length < 2}>
              {creando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Crear requerimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Pagina>
  );
}
