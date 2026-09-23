'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  ChevronRight,
  Eye,
  Search,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleSlash,
  FileText,
  X,
  MessageCircleQuestion,
  TriangleAlert,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  TEXTO_DECISION,
  faltasDeAbsolucion,
  faltasDeFormulacion,
  tramoTieneTexto,
  type Absolucion,
  type AvisoDeCita,
  type Decision,
  type Formulacion,
  type Tramo,
} from '@/lib/consultas/tipos';
import type { PliegoGuardado } from '@/lib/consultas/repositorio';

/**
 * El pliego de consultas y observaciones, sobre el mockup de César.
 *
 * La pantalla es la tabla del documento —número, participante, tipo,
 * tema, resultado, folio— con sus contadores arriba y, al pulsar una
 * fila, un cajón lateral con el escrito entero. Es la misma forma que
 * él dibujó para la absolución y para la evaluación de ofertas.
 *
 * Dentro del cajón, el escrito **no** es una caja de texto: son sus
 * tramos —referencia, sustento fáctico, sustento jurídico, solicitud—
 * cada uno editable por separado. Esa estructura es la que viaja al
 * Word, y es lo que César viene reclamando: «los formatos que están en
 * el software aún no están de acuerdo a la estructura alcanzada».
 */

type Entrada = Formulacion & { absolucion: Absolucion | null };
type Filtro = 'todas' | 'consultas' | 'observaciones' | 'revisar';

function unir(p: PliegoGuardado): Entrada[] {
  const porNumero = new Map(p.absoluciones.map((a) => [a.numero, a]));
  return p.formulaciones.map((f) => ({ ...f, absolucion: porNumero.get(f.numero) ?? null }));
}

/** En qué estado está una fila, con las palabras del mockup. */
function estadoDe(e: Entrada, esAbsolucion: boolean) {
  if (esAbsolucion) {
    if (!e.absolucion) return { clave: 'pendiente', texto: 'Sin absolver' } as const;
    return faltasDeAbsolucion(e.absolucion).length === 0
      ? ({ clave: 'lista', texto: 'Propuesta lista' } as const)
      : ({ clave: 'revisar', texto: 'Revisar' } as const);
  }
  const faltas = faltasDeFormulacion(e);
  if (e.cuerpo.length === 0) return { clave: 'pendiente', texto: 'Sin redactar' } as const;
  return faltas.length === 0
    ? ({ clave: 'lista', texto: 'Lista' } as const)
    : ({ clave: 'revisar', texto: 'Revisar' } as const);
}

const TINTE_ESTADO = {
  lista: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  revisar: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  pendiente: 'bg-secondary text-muted-foreground',
} as const;

export function EditorDePliego({ pliego }: { pliego: PliegoGuardado }) {
  const esAbsolucion = pliego.cara === 'absolucion';
  const [encabezado, setEncabezado] = useState(pliego.encabezado);
  const [entradas, setEntradas] = useState<Entrada[]>(() => unir(pliego));
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [abierta, setAbierta] = useState<string | null>(null);
  const [anadiendo, setAnadiendo] = useState(false);

  // El encabezado se guarda solo, un segundo después de dejar de teclear.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const t = setTimeout(() => {
      void fetch(`/api/consultas/pliegos/${pliego.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encabezado),
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [encabezado, pliego.id]);

  const cuentas = useMemo(() => {
    const consultas = entradas.filter((e) => e.tipo === 'consulta').length;
    const observaciones = entradas.filter((e) => e.tipo === 'observacion').length;
    const revisar = entradas.filter((e) => estadoDe(e, esAbsolucion).clave !== 'lista').length;
    return { total: entradas.length, consultas, observaciones, revisar };
  }, [entradas, esAbsolucion]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return entradas.filter((e) => {
      if (filtro === 'consultas' && e.tipo !== 'consulta') return false;
      if (filtro === 'observaciones' && e.tipo !== 'observacion') return false;
      if (filtro === 'revisar' && estadoDe(e, esAbsolucion).clave === 'lista') return false;
      if (!q) return true;
      return [e.participante, e.tema, e.ubicacion.numeral, String(e.numero)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [entradas, filtro, busqueda, esAbsolucion]);

  async function guardarEntrada(id: string, cambio: Record<string, unknown>) {
    const res = await fetch(`/api/consultas/entradas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambio),
    });
    if (!res.ok) toast.error('No se pudo guardar');
  }

  async function anadir() {
    setAnadiendo(true);
    try {
      const res = await fetch(`/api/consultas/pliegos/${pliego.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'consulta' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail ?? 'No se pudo añadir');
      const nueva: Entrada = {
        id: j.id,
        numero: j.numero,
        tipo: 'consulta',
        participante: esAbsolucion ? '' : (encabezado.participante ?? ''),
        tema: '',
        ubicacion: { seccion: 'Específica', numeral: '', literal: '', pagina: '' },
        cuerpo: [],
        normaVulnerada: '',
        avisos: [],
        absolucion: null,
      };
      setEntradas((p) => [...p, nueva]);
      setAbierta(j.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAnadiendo(false);
    }
  }

  async function borrar(id: string) {
    const res = await fetch(`/api/consultas/entradas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo eliminar');
      return;
    }
    setEntradas((p) => p.filter((x) => x.id !== id));
    setAbierta((a) => (a === id ? null : a));
    setMarcadas((m) => {
      const n = new Set(m);
      n.delete(id);
      return n;
    });
  }

  const entradaAbierta = entradas.find((e) => e.id === abierta) ?? null;

  return (
    <>
      {/* ── Los datos del procedimiento, que encabezan el documento ── */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-evaluar-500/12">
            <FileText className="h-4 w-4 text-evaluar-600 dark:text-evaluar-400" strokeWidth={2} />
          </span>
          <h2 className="text-[15px] font-bold tracking-tight">Datos del procedimiento</h2>
          <span className="text-[12.5px] text-muted-foreground">
            Encabezan el documento, como en el formato oficial.
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_250px]">
          <div>
            <Label htmlFor="procedimiento" className="text-[12px]">
              Denominación del procedimiento
            </Label>
            <Input
              id="procedimiento"
              value={encabezado.procedimiento}
              onChange={(e) => setEncabezado((p) => ({ ...p, procedimiento: e.target.value }))}
              placeholder="Concurso público para servicio de mantenimiento vial"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="numero" className="text-[12px]">
              Número
            </Label>
            <Input
              id="numero"
              value={encabezado.numeroProcedimiento}
              onChange={(e) =>
                setEncabezado((p) => ({ ...p, numeroProcedimiento: e.target.value }))
              }
              placeholder="006-2026-GRA-DRTCA/CS-1"
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_250px]">
          <div>
            <Label htmlFor="objeto" className="text-[12px]">
              Objeto de la convocatoria
            </Label>
            <textarea
              id="objeto"
              value={encabezado.objeto}
              onChange={(e) => setEncabezado((p) => ({ ...p, objeto: e.target.value }))}
              rows={2}
              placeholder="Contratación del servicio para la ejecución del proyecto denominado…"
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[13.5px] outline-none focus:border-evaluar-400"
            />
          </div>
          {!esAbsolucion && (
            <div>
              <Label htmlFor="participante" className="text-[12px]">
                Participante que formula
              </Label>
              <Input
                id="participante"
                value={encabezado.participante ?? ''}
                onChange={(e) => setEncabezado((p) => ({ ...p, participante: e.target.value }))}
                placeholder="Razón social del postor"
                className="mt-1.5"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Los contadores ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Contador
          icono={FileText}
          valor={cuentas.total}
          rotulo={esAbsolucion ? 'Solicitudes' : 'Formulaciones'}
          tinte="text-evaluar-600 dark:text-evaluar-400"
          fondo="bg-evaluar-500/12"
        />
        <Contador
          icono={MessageCircleQuestion}
          valor={cuentas.consultas}
          rotulo="Consultas"
          tinte="text-sky-600 dark:text-sky-400"
          fondo="bg-sky-500/12"
        />
        <Contador
          icono={TriangleAlert}
          valor={cuentas.observaciones}
          rotulo="Observaciones"
          tinte="text-amber-600 dark:text-amber-400"
          fondo="bg-amber-500/12"
        />
        <Contador
          icono={Clock}
          valor={cuentas.revisar}
          rotulo="Requieren revisión"
          tinte="text-rose-600 dark:text-rose-400"
          fondo="bg-rose-500/12"
        />
      </div>

      {/* ── Pestañas, buscador y la tabla ── */}
      <section className="rounded-2xl border border-border bg-card shadow-soft">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {(
            [
              ['todas', `Todas (${cuentas.total})`],
              ['consultas', `Consultas (${cuentas.consultas})`],
              ['observaciones', `Observaciones (${cuentas.observaciones})`],
              ['revisar', `Requieren revisión (${cuentas.revisar})`],
            ] as Array<[Filtro, string]>
          ).map(([clave, texto]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setFiltro(clave)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                filtro === clave
                  ? 'bg-evaluar-500 text-white'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {texto}
            </button>
          ))}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por participante, tema o numeral…"
              className="h-9 pl-8 text-[12.5px]"
            />
          </div>
          <Button size="sm" onClick={anadir} loading={anadiendo}>
            <Plus className="h-3.5 w-3.5" />
            Añadir
          </Button>
        </header>

        {visibles.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13.5px] text-muted-foreground">
            {entradas.length === 0
              ? 'Todavía no hay ninguna. Pulsa «Añadir» para empezar la primera.'
              : 'Ninguna coincide con el filtro.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className={cn(
                'w-full text-left',
                esAbsolucion ? 'min-w-[820px]' : 'min-w-[660px]',
              )}
            >
              <thead>
                <tr className="border-b border-border text-[11.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Marcar todas"
                      checked={visibles.length > 0 && visibles.every((e) => marcadas.has(e.id))}
                      onChange={(ev) =>
                        setMarcadas(
                          ev.target.checked ? new Set(visibles.map((e) => e.id)) : new Set(),
                        )
                      }
                      className="h-4 w-4 rounded border-border accent-[#7A4FEE]"
                    />
                  </th>
                  <th className="w-12 px-2 py-2.5 font-semibold">N.°</th>
                  {esAbsolucion && (
                    <th className="px-2 py-2.5 font-semibold">Participante</th>
                  )}
                  <th className="w-32 px-2 py-2.5 font-semibold">Tipo</th>
                  <th className="px-2 py-2.5 font-semibold">Tema / numeral cuestionado</th>
                  <th className="w-36 px-2 py-2.5 font-semibold">
                    {esAbsolucion ? 'Resultado' : 'Estado'}
                  </th>
                  <th className="w-16 px-2 py-2.5 font-semibold">Folio</th>
                  <th className="w-12 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibles.map((e) => {
                  const estado = estadoDe(e, esAbsolucion);
                  return (
                    <tr
                      key={e.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-secondary/40',
                        abierta === e.id && 'bg-evaluar-50/60 dark:bg-evaluar-900/20',
                      )}
                      onClick={() => setAbierta(e.id)}
                    >
                      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Marcar la solicitud ${e.numero}`}
                          checked={marcadas.has(e.id)}
                          onChange={(ev) =>
                            setMarcadas((m) => {
                              const n = new Set(m);
                              if (ev.target.checked) n.add(e.id);
                              else n.delete(e.id);
                              return n;
                            })
                          }
                          className="h-4 w-4 rounded border-border accent-[#7A4FEE]"
                        />
                      </td>
                      <td className="px-2 py-3 font-mono text-[12.5px] text-muted-foreground">
                        {String(e.numero).padStart(2, '0')}
                      </td>
                      {esAbsolucion && (
                        <td className="px-2 py-3 text-[13px]">
                          {e.participante || (
                            <span className="text-muted-foreground">Sin indicar</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium',
                            e.tipo === 'observacion'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
                          )}
                        >
                          {e.tipo === 'observacion' ? (
                            <TriangleAlert className="h-3 w-3" />
                          ) : (
                            <CircleHelp className="h-3 w-3" />
                          )}
                          {e.tipo === 'observacion' ? 'Observación' : 'Consulta'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[13px]">
                        {e.tema || (
                          <span className="text-muted-foreground">
                            {e.ubicacion.numeral
                              ? `Numeral ${e.ubicacion.numeral}`
                              : 'Sin tema'}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium',
                            TINTE_ESTADO[estado.clave],
                          )}
                        >
                          {estado.clave === 'lista' ? (
                            <CircleCheck className="h-3 w-3" />
                          ) : estado.clave === 'revisar' ? (
                            <CircleAlert className="h-3 w-3" />
                          ) : (
                            <CircleSlash className="h-3 w-3" />
                          )}
                          {estado.texto}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[12.5px] text-muted-foreground">
                        {e.ubicacion.pagina || '—'}
                      </td>
                      <td className="px-2 py-3">
                        <Eye className="h-4 w-4 text-evaluar-500" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── La barra de abajo, con lo marcado ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-evaluar-100 bg-evaluar-50/60 px-4 py-3.5 dark:border-evaluar-900/60 dark:bg-evaluar-900/20">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-evaluar-500 text-[12px] font-bold text-white">
          {marcadas.size || entradas.length}
        </span>
        <span className="text-[13px] font-semibold">
          {marcadas.size > 0
            ? `${marcadas.size} ${marcadas.size === 1 ? 'marcada' : 'marcadas'}`
            : 'Todas las del pliego'}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          Se descarga un documento en Word con la tabla del formato oficial.
        </span>
        <Button asChild className="ml-auto">
          <a href={`/api/consultas/pliegos/${pliego.id}/export`}>
            <FileText className="h-4 w-4" />
            {esAbsolucion ? 'Generar proyecto de absolución' : 'Generar el escrito'}
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* ── El cajón con el detalle ── */}
      {entradaAbierta && (
        <CajonDeEntrada
          entrada={entradaAbierta}
          esAbsolucion={esAbsolucion}
          onCerrar={() => setAbierta(null)}
          onGuardar={guardarEntrada}
          onBorrar={() => borrar(entradaAbierta.id)}
          onCambio={(nueva) =>
            setEntradas((p) => p.map((x) => (x.id === nueva.id ? nueva : x)))
          }
        />
      )}
    </>
  );
}

function Contador({
  icono: Icono,
  valor,
  rotulo,
  tinte,
  fondo,
}: {
  icono: typeof FileText;
  valor: number;
  rotulo: string;
  tinte: string;
  fondo: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-soft">
      <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', fondo)}>
        <Icono className={cn('h-5 w-5', tinte)} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className={cn('block text-2xl font-bold leading-none', tinte)}>{valor}</span>
        <span className="mt-1 block truncate text-[12px] text-muted-foreground">{rotulo}</span>
      </span>
    </div>
  );
}

/** El cajón lateral con el escrito de una solicitud. */
function CajonDeEntrada({
  entrada,
  esAbsolucion,
  onCerrar,
  onGuardar,
  onBorrar,
  onCambio,
}: {
  entrada: Entrada;
  esAbsolucion: boolean;
  onCerrar: () => void;
  onGuardar: (id: string, cambio: Record<string, unknown>) => Promise<void>;
  onBorrar: () => void;
  onCambio: (e: Entrada) => void;
}) {
  const [relato, setRelato] = useState('');
  const [bases, setBases] = useState('');
  const [redactando, setRedactando] = useState(false);
  const [decision, setDecision] = useState<Decision | ''>(entrada.absolucion?.decision ?? '');

  useEffect(() => {
    setRelato('');
    setBases('');
    setDecision(entrada.absolucion?.decision ?? '');
  }, [entrada.id, entrada.absolucion?.decision]);

  /**
   * Guarda el escrito un segundo después de la última tecla.
   *
   * Sin esto cada pulsación mandaba un PATCH con el `jsonb` entero de
   * los tramos, que son varios miles de caracteres. Un solo
   * temporizador: el último cambio gana, y se vacía al cerrar el
   * cajón para no dejar una escritura en el aire.
   */
  const pendiente = useRef<{
    reloj: ReturnType<typeof setTimeout>;
    id: string;
    cambios: Record<string, unknown>;
  } | null>(null);

  const guardarYa = useRef<() => void>(() => {});
  guardarYa.current = () => {
    const p = pendiente.current;
    if (!p) return;
    clearTimeout(p.reloj);
    pendiente.current = null;
    void onGuardar(p.id, p.cambios);
  };

  function guardarConRetardo(cambio: Record<string, unknown>) {
    // Al pasar a otra fila, lo que quedaba pendiente se escribe en la
    // suya antes de empezar a acumular para la nueva.
    if (pendiente.current && pendiente.current.id !== entrada.id) {
      guardarYa.current();
    }
    const cambios = { ...(pendiente.current?.cambios ?? {}), ...cambio };
    if (pendiente.current) clearTimeout(pendiente.current.reloj);
    const id = entrada.id;
    pendiente.current = {
      id,
      cambios,
      reloj: setTimeout(() => {
        pendiente.current = null;
        void onGuardar(id, cambios);
      }, 1000),
    };
  }

  // Al cerrar el cajón no se pierde el último segundo de escritura.
  useEffect(() => () => guardarYa.current(), []);

  // Escape cierra, como cualquier cajón.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  const tramos = esAbsolucion ? (entrada.absolucion?.fundamentos ?? []) : entrada.cuerpo;

  async function redactar() {
    setRedactando(true);
    try {
      const res = await fetch(`/api/consultas/entradas/${entrada.id}/redactar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          que: esAbsolucion ? 'absolucion' : 'formulacion',
          relato,
          textoDeBases: bases || undefined,
          decision: esAbsolucion && decision ? decision : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail ?? j?.message ?? 'No se pudo redactar');

      if (esAbsolucion) {
        onCambio({
          ...entrada,
          absolucion: {
            id: entrada.id,
            numero: entrada.numero,
            decision: j.decision,
            fundamentos: j.fundamentos,
            conclusion: j.conclusion,
            precisionEnBases: j.precisionEnBases,
            avisos: j.avisos ?? [],
          },
        });
        setDecision(j.decision);
      } else {
        onCambio({
          ...entrada,
          cuerpo: j.cuerpo,
          normaVulnerada: j.normaVulnerada,
          avisos: j.avisos ?? [],
        });
      }
      const avisos = (j.avisos ?? []) as AvisoDeCita[];
      if (avisos.length > 0) {
        toast.warning(
          avisos.length === 1
            ? `Redactado, pero revisa «${avisos[0].cita}»`
            : `Redactado, pero revisa ${avisos.length} citas`,
        );
      } else {
        toast.success('Redactado');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRedactando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-noche-950/40 backdrop-blur-[2px]"
        onClick={onCerrar}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={`Solicitud ${entrada.numero}`}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-border bg-background shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-evaluar-500 text-[13px] font-bold text-white">
            {String(entrada.numero).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold tracking-tight">
              {entrada.tema || (entrada.tipo === 'observacion' ? 'Observación' : 'Consulta')}
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              Sección {entrada.ubicacion.seccion}
              {entrada.ubicacion.numeral && ` · numeral ${entrada.ubicacion.numeral}`}
              {entrada.ubicacion.literal && ` ${entrada.ubicacion.literal}`}
              {entrada.ubicacion.pagina && ` · folio ${entrada.ubicacion.pagina}`}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onCerrar} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-5 px-5 py-5">
          {/* Quién y de qué */}
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoCorto
              rotulo="Participante"
              valor={entrada.participante}
              ejemplo="Constructora Andina S.A.C."
              onGuardar={(v) => {
                onCambio({ ...entrada, participante: v });
                void onGuardar(entrada.id, { participante: v });
              }}
            />
            <CampoCorto
              rotulo="Tema"
              valor={entrada.tema}
              ejemplo="Experiencia del personal clave"
              onGuardar={(v) => {
                onCambio({ ...entrada, tema: v });
                void onGuardar(entrada.id, { tema: v });
              }}
            />
          </div>

          {/* Dónde recae */}
          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <Label className="text-[11.5px]">Tipo</Label>
              <select
                value={entrada.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as 'consulta' | 'observacion';
                  onCambio({ ...entrada, tipo });
                  void onGuardar(entrada.id, { tipo });
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[13px]"
              >
                <option value="consulta">Consulta</option>
                <option value="observacion">Observación</option>
              </select>
            </div>
            <div>
              <Label className="text-[11.5px]">Sección</Label>
              <select
                value={entrada.ubicacion.seccion}
                onChange={(e) => {
                  const seccion = e.target.value as 'General' | 'Específica';
                  onCambio({ ...entrada, ubicacion: { ...entrada.ubicacion, seccion } });
                  void onGuardar(entrada.id, { seccion });
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[13px]"
              >
                <option value="General">General</option>
                <option value="Específica">Específica</option>
              </select>
            </div>
            {(
              [
                ['numeral', 'Numeral', '3.5.1'],
                ['literal', 'Literal', 'A.'],
                ['pagina', 'Folio', '67'],
              ] as const
            ).map(([clave, rotulo, ejemplo]) => (
              <div key={clave}>
                <Label className="text-[11.5px]">{rotulo}</Label>
                <Input
                  value={entrada.ubicacion[clave]}
                  placeholder={ejemplo}
                  onChange={(e) =>
                    onCambio({
                      ...entrada,
                      ubicacion: { ...entrada.ubicacion, [clave]: e.target.value },
                    })
                  }
                  onBlur={(e) => void onGuardar(entrada.id, { [clave]: e.target.value })}
                  className="mt-1 h-9 text-[13px]"
                />
              </div>
            ))}
          </div>

          {/* En la absolución hace falta delante lo que presentó el
              participante: es lo que se absuelve. Se transcribe o se
              pega, y A-LexIA lo tiene para fundamentar. En el modelo de
              César la columna del documento lleva la respuesta, no la
              solicitud, así que esto no sale al Word: sirve para
              trabajar. */}
          {esAbsolucion && (
            <div>
              <Label className="text-[11.5px]">Lo que presentó el participante</Label>
              <textarea
                value={entrada.cuerpo
                  .map((t) => t.parrafos.join('\n\n'))
                  .join('\n\n')}
                onChange={(e) => {
                  const parrafos = e.target.value
                    .split(/\n\n+/)
                    .filter((x) => x.trim());
                  const cuerpo: Tramo[] =
                    parrafos.length > 0 ? [{ rotulo: null, parrafos }] : [];
                  onCambio({ ...entrada, cuerpo });
                }}
                onBlur={() => void onGuardar(entrada.id, { cuerpo: entrada.cuerpo })}
                rows={5}
                placeholder="Transcribe o pega aquí la consulta u observación tal como la presentó el postor."
                className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-evaluar-400"
              />
              {entrada.cuerpo.length === 0 && (
                <p className="mt-1 text-[11.5px] text-amber-600 dark:text-amber-400">
                  Sin esto no se puede absolver: A-LexIA necesita saber qué se le pregunta.
                </p>
              )}
            </div>
          )}

          {/* Lo que se le cuenta a A-LexIA */}
          <div className="rounded-xl border border-evaluar-100 bg-evaluar-50/50 p-4 dark:border-evaluar-900/60 dark:bg-evaluar-900/15">
            {esAbsolucion && (
              <div className="mb-3 sm:max-w-xs">
                <Label className="text-[11.5px]">Decisión del comité</Label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as Decision | '')}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[13px]"
                >
                  <option value="">Que A-LexIA la proponga</option>
                  {(Object.keys(TEXTO_DECISION) as Decision[]).map((d) => (
                    <option key={d} value={d}>
                      {TEXTO_DECISION[d]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Label className="text-[11.5px]">
              {esAbsolucion
                ? 'Qué quiere argumentar el comité'
                : 'Cuenta el caso con tus palabras'}
            </Label>
            <textarea
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              rows={3}
              placeholder={
                esAbsolucion
                  ? 'Ej.: la exigencia se sostiene por la envergadura del tramo, 91 km y S/ 5.3 millones…'
                  : 'Ej.: las bases limitan la experiencia a vías departamentales y dejan fuera la red vecinal, que es técnicamente idéntica…'
              }
              className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-evaluar-400"
            />
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] font-medium text-muted-foreground hover:text-foreground">
                Pegar el extremo de las bases (opcional, mejora la redacción)
              </summary>
              <textarea
                value={bases}
                onChange={(e) => setBases(e.target.value)}
                rows={4}
                placeholder="Copia aquí el texto del numeral, tal como figura en las bases."
                className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[12.5px] outline-none focus:border-evaluar-400"
              />
            </details>
            <Button
              size="sm"
              onClick={redactar}
              disabled={redactando || (esAbsolucion && entrada.cuerpo.length === 0)}
              className="mt-3"
            >
              {redactando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {esAbsolucion ? 'Redactar la absolución' : 'Redactar con A-LexIA'}
            </Button>
          </div>

          <CitasPorRevisar
            avisos={esAbsolucion ? (entrada.absolucion?.avisos ?? []) : entrada.avisos}
          />

          {/* El escrito, tramo por tramo */}
          <TramosEditables
            tramos={tramos}
            vacio={
              esAbsolucion
                ? 'Todavía no hay absolución. Elige la decisión, cuenta el argumento y pulsa «Redactar la absolución».'
                : 'Todavía no hay escrito. Cuenta el caso arriba y pulsa «Redactar con A-LexIA».'
            }
            onCambio={(nuevos) => {
              if (esAbsolucion && entrada.absolucion) {
                onCambio({
                  ...entrada,
                  absolucion: { ...entrada.absolucion, fundamentos: nuevos },
                });
                guardarConRetardo({ fundamentos: nuevos });
              } else {
                onCambio({ ...entrada, cuerpo: nuevos });
                guardarConRetardo({ cuerpo: nuevos });
              }
            }}
          />

          {esAbsolucion ? (
            <>
              <CampoLargo
                rotulo="Conclusión"
                valor={entrada.absolucion?.conclusion ?? ''}
                ejemplo="En consecuencia, se ratifica el requisito conforme a las bases originales."
                onGuardar={(v) => {
                  if (entrada.absolucion) {
                    onCambio({
                      ...entrada,
                      absolucion: { ...entrada.absolucion, conclusion: v },
                    });
                  }
                  void onGuardar(entrada.id, { conclusion: v });
                }}
              />
              <CampoLargo
                rotulo="Precisión que se incorpora a las bases integradas"
                valor={entrada.absolucion?.precisionEnBases ?? ''}
                ejemplo="Se reformula el numeral 3.5.1.A incorporando la red vial vecinal o rural."
                onGuardar={(v) => {
                  if (entrada.absolucion) {
                    onCambio({
                      ...entrada,
                      absolucion: { ...entrada.absolucion, precisionEnBases: v },
                    });
                  }
                  void onGuardar(entrada.id, { precisionEnBases: v });
                }}
              />
            </>
          ) : (
            entrada.tipo === 'observacion' && (
              <CampoLargo
                rotulo="Artículo y norma que se vulnera"
                valor={entrada.normaVulnerada}
                ejemplo="Artículo 46.3 de la Ley N° 32069 y numeral 44.6 de su Reglamento."
                onGuardar={(v) => {
                  onCambio({ ...entrada, normaVulnerada: v });
                  void onGuardar(entrada.id, { normaVulnerada: v });
                }}
              />
            )
          )}

          <div className="border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={onBorrar} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar esta solicitud
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/**
 * Las citas que el auditor no pudo respaldar.
 *
 * No se borran del escrito ni se corrigen solas: se enseñan aquí para
 * que quien firma decida. Un escrito que va a una entidad no puede
 * llevar una norma que un programa quitó por su cuenta, ni una que
 * nadie comprobó.
 */
function CitasPorRevisar({ avisos }: { avisos: AvisoDeCita[] }) {
  if (avisos.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-amber-800 dark:text-amber-300">
        <TriangleAlert className="h-3.5 w-3.5" />
        {avisos.length === 1 ? 'Una cita por comprobar' : `${avisos.length} citas por comprobar`}
      </p>
      <ul className="mt-2 space-y-1.5">
        {avisos.map((a, i) => (
          <li key={i} className="text-[12px] leading-relaxed text-amber-900 dark:text-amber-200">
            <span className="font-semibold">{a.cita}</span> — {a.motivo}.
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-amber-700 dark:text-amber-400">
        A-LexIA no las borra. Corrígelas o quítalas del texto antes de presentar el
        escrito.
      </p>
    </div>
  );
}

/** Los tramos del escrito, cada uno editable por separado. */
function TramosEditables({
  tramos,
  vacio,
  onCambio,
}: {
  tramos: Tramo[];
  vacio: string;
  onCambio: (t: Tramo[]) => void;
}) {
  /**
   * Cambia, o quita con `null`, la viñeta `k` del tramo `i`.
   *
   * El Sustento Jurídico viene en viñetas y una de sus normas puede
   * estar mal citada: sin esto habría que rehacer el tramo entero para
   * corregir un artículo.
   */
  function onVineta(
    i: number,
    k: number,
    cambio: { titulo?: string; texto?: string } | null,
  ) {
    onCambio(
      tramos.map((t, j) => {
        if (j !== i) return t;
        const vinetas = [...(t.vinetas ?? [])];
        if (cambio === null) vinetas.splice(k, 1);
        else vinetas[k] = { ...vinetas[k], ...cambio };
        return { ...t, vinetas };
      }),
    );
  }

  if (tramos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[12.5px] text-muted-foreground">
        {vacio}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {tramos.map((t, i) => (
        <div
          key={`${t.rotulo ?? 'sin'}-${i}`}
          className="rounded-xl border border-border bg-card p-3.5"
        >
          <p
            data-rotulo-tramo
            className="text-[11px] font-bold uppercase tracking-[0.1em] text-evaluar-600 dark:text-evaluar-400"
          >
            {t.rotulo ?? 'Cierre'}
          </p>
          <textarea
            value={t.parrafos.join('\n\n')}
            onChange={(e) => {
              const parrafos = e.target.value.split(/\n\n+/).filter((x) => x.trim());
              onCambio(tramos.map((x, j) => (j === i ? { ...x, parrafos } : x)));
            }}
            rows={Math.min(14, Math.max(3, Math.ceil(t.parrafos.join(' ').length / 90)))}
            className="mt-1.5 w-full resize-y bg-transparent text-[13px] leading-relaxed outline-none"
          />
          {(t.vinetas ?? []).length > 0 && (
            <ul className="mt-2 space-y-2.5 border-t border-border pt-2.5">
              {(t.vinetas ?? []).map((v, k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-evaluar-400" />
                  <div className="min-w-0 flex-1">
                    <input
                      value={v.titulo ?? ''}
                      onChange={(e) => onVineta(i, k, { titulo: e.target.value })}
                      placeholder="Norma o principio"
                      className="w-full bg-transparent text-[12.5px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    />
                    <textarea
                      value={v.texto}
                      onChange={(e) => onVineta(i, k, { texto: e.target.value })}
                      rows={Math.min(6, Math.max(2, Math.ceil(v.texto.length / 80)))}
                      className="w-full resize-y bg-transparent text-[12.5px] leading-relaxed text-muted-foreground outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onVineta(i, k, null)}
                    title="Quitar esta norma"
                    className="mt-1 h-6 w-6 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <X className="mx-auto h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function CampoCorto({
  rotulo,
  valor,
  ejemplo,
  onGuardar,
}: {
  rotulo: string;
  valor: string;
  ejemplo: string;
  onGuardar: (v: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  return (
    <div>
      <Label className="text-[11.5px]">{rotulo}</Label>
      <Input
        value={texto}
        placeholder={ejemplo}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => texto !== valor && onGuardar(texto)}
        className="mt-1 h-9 text-[13px]"
      />
    </div>
  );
}

function CampoLargo({
  rotulo,
  valor,
  ejemplo,
  onGuardar,
}: {
  rotulo: string;
  valor: string;
  ejemplo: string;
  onGuardar: (v: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  return (
    <div>
      <Label className="text-[11.5px]">{rotulo}</Label>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => texto !== valor && onGuardar(texto)}
        rows={2}
        placeholder={ejemplo}
        className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-evaluar-400"
      />
    </div>
  );
}
