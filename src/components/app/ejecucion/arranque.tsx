'use client';

/**
 * El arranque del generador de documentos de ejecución contractual.
 *
 * Es la «pantalla inicial simplificada» del documento de César: dos
 * decisiones. Quién emitirá el documento, y qué hay que resolver —una
 * actuación de la lista o, lo recomendado, «Analizar mi caso»: contarlo
 * en palabras propias, sin tener que conocer antes la figura jurídica—.
 * Los documentos que ya se tengan se adjuntan aquí mismo; A-LexIA los
 * lee y pide solo lo que falte.
 */
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ACTUACIONES, ORDEN_ACTUACIONES, PERFILES, type Actuacion, type Perfil } from '@/lib/ejecucion/catalogo';
import { ArchivosElegidos, CajaDeDocumentos, subirArchivos } from './subida';
import { ICONO_PERFIL } from './perfiles';

const TOPE = 4000;
const A_LA_VISTA = 5;

export function ArranqueDelExpediente({ permitidos }: { permitidos: Perfil[] }) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(permitidos[0] ?? null);
  const [todos, setTodos] = useState(false);
  const [actuacion, setActuacion] = useState<Actuacion | null>(null);
  const [caso, setCaso] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [yendo, setYendo] = useState(false);
  const cajon = useRef<HTMLTextAreaElement>(null);

  const alaVista = todos ? permitidos : permitidos.slice(0, A_LA_VISTA);
  const ocultos = permitidos.length - alaVista.length;
  const listo = !!perfil && (caso.trim().length >= 8 || archivos.length > 0 || !!actuacion);
  const actuaciones = useMemo(() => ORDEN_ACTUACIONES, []);

  async function empezar() {
    if (!perfil || !listo) return;
    setYendo(true);
    try {
      const subidos = archivos.length ? await subirArchivos(archivos) : [];
      const res = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfil,
          actuacion,
          pedido: caso.trim(),
          archivos: subidos.map((s) => ({ nombre: s.nombre, ruta: s.ruta })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.message || json?.error || 'No se pudo crear el expediente');
      router.push(`/generador/expedientes/${json.id}?a=${json.actuacionId}&analizar=1`);
    } catch (e) {
      toast.error((e as Error).message);
      setYendo(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* ── 1 · Quién emite ── */}
      <section>
        <Rotulo numero="1" titulo="¿Quién emitirá el documento?" bajada="El documento se adapta al perfil: el Área Usuaria sustenta, la DEC analiza, Asesoría Jurídica opina, la autoridad decide." />
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {alaVista.map((p) => {
            const Icono = ICONO_PERFIL[p];
            const marcado = perfil === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPerfil(p)}
                aria-pressed={marcado}
                title={PERFILES[p].descripcion}
                className={cn(
                  'relative flex min-w-[160px] flex-1 items-center gap-2.5 rounded-xl border-2 px-4 py-3.5 text-left transition-all sm:flex-none',
                  marcado
                    ? 'border-generar-500 bg-generar-50/70 shadow-glow dark:bg-generar-900/25'
                    : 'border-border bg-card hover:border-generar-300 dark:hover:border-generar-700',
                )}
              >
                <Icono className={cn('h-4.5 w-4.5 shrink-0', marcado ? 'text-generar-600 dark:text-generar-400' : 'text-muted-foreground')} strokeWidth={1.9} />
                <span className="min-w-0 text-[13.5px] font-semibold leading-snug">{PERFILES[p].nombre}</span>
                {marcado && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-generar-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          {ocultos > 0 && (
            <button
              type="button"
              onClick={() => setTodos(true)}
              className="flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3.5 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:border-generar-300 hover:text-foreground sm:flex-none"
            >
              Más perfiles
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
        {perfil && <p className="mt-2.5 text-pretty text-[12.5px] leading-relaxed text-muted-foreground">{PERFILES[perfil].descripcion}</p>}
      </section>

      {/* ── 2 · Qué hay que resolver ── */}
      <section>
        <Rotulo
          numero="2"
          titulo="¿Qué necesitas resolver?"
          bajada="No hace falta conocer la figura jurídica: cuéntalo con tus palabras y adjunta lo que tengas. A-LexIA identifica la actuación y pide solo lo indispensable."
        />
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActuacion(null)}
            aria-pressed={actuacion === null}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors',
              actuacion === null
                ? 'border-generar-500 bg-generar-500 text-white'
                : 'border-generar-300 bg-generar-50/60 text-generar-800 hover:bg-generar-100 dark:border-generar-800 dark:bg-generar-900/25 dark:text-generar-200',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Analizar mi caso
            <span className={cn('rounded-full px-1.5 py-px text-[10px] font-bold uppercase', actuacion === null ? 'bg-white/20' : 'bg-generar-500/15')}>
              Recomendado
            </span>
          </button>
          {actuaciones.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setActuacion(a)}
              aria-pressed={actuacion === a}
              title={ACTUACIONES[a].descripcion}
              className={cn(
                'rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors',
                actuacion === a
                  ? 'border-generar-500 bg-generar-50 text-generar-800 dark:bg-generar-900/30 dark:text-generar-200'
                  : 'border-border bg-card hover:border-generar-300 hover:bg-generar-50/60 dark:hover:border-generar-700 dark:hover:bg-generar-900/20',
              )}
            >
              {ACTUACIONES[a].nombre}
            </button>
          ))}
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void empezar();
          }}
        >
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors focus-within:border-generar-400">
            <textarea
              ref={cajon}
              value={caso}
              maxLength={TOPE}
              onChange={(e) => setCaso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void empezar();
                }
              }}
              rows={4}
              placeholder="Ej.: El contratista solicita una ampliación de plazo por falta de entrega de terreno."
              aria-label="Describe tu caso"
              className="w-full resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground"
            />
            <div className="mt-1 border-t border-border pt-3">
              <CajaDeDocumentos compacta alElegir={(fs) => setArchivos((prev) => [...prev, ...fs].slice(0, 30))} deshabilitada={yendo} />
              <ArchivosElegidos archivos={archivos} quitar={(i) => setArchivos((prev) => prev.filter((_, j) => j !== i))} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[11.5px] text-muted-foreground">
                {actuacion ? `Actuación: ${ACTUACIONES[actuacion].nombre}. ` : ''}A-LexIA no te pedirá lo que ya esté en los documentos.
              </span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {caso.length}/{TOPE}
              </span>
              <button
                type="submit"
                disabled={yendo || !listo}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-semibold transition-colors',
                  yendo || !listo ? 'cursor-not-allowed bg-muted text-muted-foreground' : 'bg-generar-500 text-white hover:bg-generar-600',
                )}
              >
                {yendo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {archivos.length ? 'Subiendo documentos…' : 'Abriendo el expediente…'}
                  </>
                ) : (
                  <>
                    {actuacion ? 'Analizar' : 'Analizar mi caso'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export function Rotulo({ numero, titulo, bajada }: { numero: string; titulo: string; bajada: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-generar-500 text-[13px] font-bold text-white">
        {numero}
      </span>
      <div className="min-w-0">
        <h2 className="text-[19px] font-bold tracking-tight">{titulo}</h2>
        <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">{bajada}</p>
      </div>
    </div>
  );
}
