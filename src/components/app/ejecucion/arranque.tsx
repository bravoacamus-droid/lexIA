'use client';

/**
 * El arranque del generador de documentos de ejecución contractual.
 *
 * César (27/09/2026): «A-LexIA debe atender tanto a quien sabe
 * exactamente qué documento quiere como a quien solo puede describir el
 * problema». Por eso dos entradas igual de visibles —«Sé qué documento
 * necesito» y «Ayúdame a identificarlo»— y, debajo, en nombre de quién se
 * elabora. Elegir un documento no obliga a concluir que la figura existe:
 * indica lo que el usuario quiere evaluar; A-LexIA lo analiza y, si no
 * corresponde, lo dice (ver «Solicitaste / Resultado del análisis»).
 */
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, FileSignature, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ACTUACIONES, ORDEN_ACTUACIONES, PERFILES, type Actuacion, type Perfil } from '@/lib/ejecucion/catalogo';
import { documentoRecomendado } from '@/lib/ejecucion/matriz';
import { ArchivosElegidos, CajaDeDocumentos, subirArchivos } from './subida';
import { ICONO_PERFIL } from './perfiles';

const TOPE = 4000;
const A_LA_VISTA = 5;

type Modo = 'documento' | 'identificar';

const ENTRADAS = [
  {
    m: 'documento' as const,
    icono: FileSignature,
    titulo: 'Sé qué documento necesito',
    texto: 'Elige el documento. A-LexIA lo prepara como hipótesis, examina el caso y confirma si la figura y el documento corresponden.',
    ejemplo: '«Soy de la DEC. Quiero un informe técnico sobre un adicional del Contrato N.°…»',
  },
  {
    m: 'identificar' as const,
    icono: Sparkles,
    titulo: 'Ayúdame a identificarlo',
    texto: 'Cuéntame qué ocurrió. A-LexIA identifica las figuras posibles, explica cuál encaja mejor y propone el primer documento.',
    ejemplo: '«El contratista propone cambiar componentes y no sé cómo tramitarlo.»',
  },
];

export function ArranqueDelExpediente({ permitidos }: { permitidos: Perfil[] }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(permitidos[0] ?? null);
  const [todos, setTodos] = useState(false);
  const [actuacion, setActuacion] = useState<Actuacion | null>(null);
  const [caso, setCaso] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [yendo, setYendo] = useState(false);
  const cajon = useRef<HTMLTextAreaElement>(null);

  const alaVista = todos ? permitidos : permitidos.slice(0, A_LA_VISTA);
  const ocultos = permitidos.length - alaVista.length;
  const listo =
    !!perfil && !!modo && (modo === 'documento' ? !!actuacion : caso.trim().length >= 8 || archivos.length > 0);

  // El documento que cada actuación le toca al perfil elegido: quien sabe
  // lo que necesita elige un documento, no una figura abstracta.
  const documentos = useMemo(() => {
    if (!perfil) return [];
    const ctx = { perfil, tipo: null, sistemaEntrega: null, supervisado: null, regimen: 'ley_32069' as const, respuestas: {} };
    return ORDEN_ACTUACIONES.filter((a) => a !== 'diagnostico').map((a) => ({
      actuacion: a,
      titulo: documentoRecomendado(perfil, a, ctx).titulo,
    }));
  }, [perfil]);

  function elegirModo(m: Modo) {
    setModo(m);
    if (m === 'identificar') setActuacion(null);
    requestAnimationFrame(() => document.getElementById('perfil-emisor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

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
          actuacion: modo === 'documento' ? actuacion : null,
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
      {/* ── 1 · Cómo empezar ── */}
      <section>
        <Rotulo
          numero="1"
          titulo="¿Cómo quieres empezar?"
          bajada="Las dos entradas llevan al mismo control: A-LexIA comprueba la figura, la evidencia, la competencia y la secuencia del trámite."
        />
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          {ENTRADAS.map((o) => {
            const marcado = modo === o.m;
            return (
              <button
                key={o.m}
                type="button"
                onClick={() => elegirModo(o.m)}
                aria-pressed={marcado}
                className={cn(
                  'relative flex flex-col items-start gap-1.5 rounded-2xl border-2 p-4 text-left transition-all',
                  marcado
                    ? 'border-generar-500 bg-generar-50/70 shadow-glow dark:bg-generar-900/25'
                    : 'border-border bg-card hover:border-generar-300 dark:hover:border-generar-700',
                )}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-generar-100 text-generar-700 dark:bg-generar-900/40 dark:text-generar-300">
                  <o.icono className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15.5px] font-bold tracking-tight">{o.titulo}</span>
                <span className="text-pretty text-[12.5px] leading-relaxed text-muted-foreground">{o.texto}</span>
                <span className="text-pretty text-[12px] italic text-muted-foreground/80">{o.ejemplo}</span>
                {marcado && (
                  <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-generar-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {modo && (
        <>
          {/* ── 2 · En nombre de quién ── */}
          <section id="perfil-emisor" className="scroll-mt-20">
            <Rotulo
              numero="2"
              titulo="¿En nombre de quién se elaborará?"
              bajada="El documento se adapta al perfil: el Área Usuaria sustenta, la DEC analiza, Asesoría Jurídica opina, la autoridad decide."
            />
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
                    <Icono
                      className={cn('h-4.5 w-4.5 shrink-0', marcado ? 'text-generar-600 dark:text-generar-400' : 'text-muted-foreground')}
                      strokeWidth={1.9}
                    />
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
            {perfil && (
              <p className="mt-2.5 text-pretty text-[12.5px] leading-relaxed text-muted-foreground">{PERFILES[perfil].descripcion}</p>
            )}
          </section>

          {/* ── 3 · El documento o el caso ── */}
          <section>
            <Rotulo
              numero="3"
              titulo={modo === 'documento' ? '¿Qué documento necesitas?' : 'Cuéntame qué ocurrió'}
              bajada={
                modo === 'documento'
                  ? 'Elegir un documento no obliga a A-LexIA a concluir que la figura existe: la analiza y, si no corresponde, te lo explica y te ofrece cómo seguir.'
                  : 'No hace falta conocer la figura jurídica: cuéntalo con tus palabras y adjunta lo que tengas. A-LexIA identifica la actuación y pide solo lo indispensable.'
              }
            />
            {modo === 'documento' && (
              <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                {documentos.map((d) => (
                  <button
                    key={d.actuacion}
                    type="button"
                    onClick={() => setActuacion(d.actuacion)}
                    aria-pressed={actuacion === d.actuacion}
                    title={ACTUACIONES[d.actuacion].descripcion}
                    className={cn(
                      'flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                      actuacion === d.actuacion
                        ? 'border-generar-500 bg-generar-50 dark:bg-generar-900/30'
                        : 'border-border bg-card hover:border-generar-300 hover:bg-generar-50/60 dark:hover:border-generar-700 dark:hover:bg-generar-900/20',
                    )}
                  >
                    <FileSignature
                      className={cn('mt-0.5 h-4 w-4 shrink-0', actuacion === d.actuacion ? 'text-generar-600' : 'text-muted-foreground')}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-snug">{d.titulo}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{ACTUACIONES[d.actuacion].nombre}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

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
                  placeholder={
                    modo === 'documento'
                      ? 'Datos del caso (opcional): contrato, hechos, fechas, lo que pide la otra parte…'
                      : 'Ej.: El contratista propone cambiar componentes del equipo y no sé cómo tramitarlo.'
                  }
                  aria-label="Describe tu caso"
                  className="w-full resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground"
                />
                <div className="mt-1 border-t border-border pt-3">
                  <CajaDeDocumentos compacta alElegir={(fs) => setArchivos((prev) => [...prev, ...fs].slice(0, 30))} deshabilitada={yendo} />
                  <ArchivosElegidos archivos={archivos} quitar={(i) => setArchivos((prev) => prev.filter((_, j) => j !== i))} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-[11.5px] text-muted-foreground">
                    {modo === 'documento' && actuacion ? `Documento: ${documentos.find((d) => d.actuacion === actuacion)?.titulo}. ` : ''}
                    A-LexIA no te pedirá lo que ya esté en los documentos.
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
                        {modo === 'documento' ? 'Preparar y verificar' : 'Analizar mi caso'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </>
      )}
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
