'use client';

/**
 * La pantalla del expediente contractual: las tres zonas de la sección
 * 17 —Caso, Fuentes, Resultado— y, arriba, las actuaciones del
 * expediente, una por perfil. Pasar del Área Usuaria a la DEC no abre
 * una conversación nueva: es otra actuación sobre el mismo expediente.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ACTUACIONES, PERFILES, type Actuacion, type Perfil } from '@/lib/ejecucion/catalogo';
import type { ActuacionDelExpediente, EstadoDelExpediente } from '@/lib/ejecucion/estado';
import type { CampoFicha, NivelDeSalida, PreguntaDecisiva } from '@/lib/ejecucion/tipos';
import { ICONO_PERFIL } from './perfiles';
import { Luz } from './semaforos';
import type { ArchivoSubido } from './subida';
import { ZonaCaso } from './zona-caso';
import { ZonaFuentes } from './zona-fuentes';
import { ZonaResultado, type Ocupacion } from './zona-resultado';

/** Si una actuación lleva más que esto «analizando», el proceso murió. */
const ANALISIS_COLGADO_MS = 6 * 60 * 1000;

export function VistaDelExpediente({ inicial, permitidos }: { inicial: EstadoDelExpediente; permitidos: Perfil[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [estado, setEstado] = useState(inicial);
  const [activa, setActiva] = useState<string>(
    params.get('a') && inicial.actuaciones.some((x) => x.id === params.get('a'))
      ? params.get('a')!
      : inicial.actuaciones[inicial.actuaciones.length - 1]?.id ?? '',
  );
  const [ocupado, setOcupado] = useState<Ocupacion>(null);
  const arrancado = useRef(false);
  const base = `/api/expedientes/${estado.expediente.id}`;
  const act = estado.actuaciones.find((x) => x.id === activa) ?? estado.actuaciones[estado.actuaciones.length - 1];

  const llamar = useCallback(
    async (url: string, metodo: 'POST' | 'PATCH' | 'DELETE' = 'POST', cuerpo?: unknown): Promise<EstadoDelExpediente | null> => {
      const res = await fetch(url, {
        method: metodo,
        headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.detail || json?.message || json?.error || `Error ${res.status}`;
        throw new Error(typeof msg === 'string' ? msg : 'No se pudo completar la acción');
      }
      if (json?.expediente) setEstado(json as EstadoDelExpediente);
      return json?.expediente ? (json as EstadoDelExpediente) : null;
    },
    [],
  );

  const conOcupacion = useCallback(
    async (que: Ocupacion, f: () => Promise<unknown>) => {
      setOcupado(que);
      try {
        await f();
      } catch (e) {
        toast.error((e as Error).message);
        // Lo que haya quedado en la base (el error de la actuación, por ejemplo).
        const r = await fetch(base).catch(() => null);
        if (r?.ok) setEstado(await r.json());
      } finally {
        setOcupado(null);
      }
    },
    [base],
  );

  const analizar = useCallback(
    (aid: string, como?: Actuacion) => conOcupacion('analizando', () => llamar(`${base}/actuaciones/${aid}/analizar`, 'POST', como ? { actuacion: como } : {})),
    [base, conOcupacion, llamar],
  );

  // Una actuación recién creada —desde el arranque— se analiza sola. Una
  // que falló no: se reintenta con el botón, para no gastar sin avisar.
  useEffect(() => {
    if (arrancado.current || !act) return;
    arrancado.current = true;
    if (!act.analisis && act.estado === 'pendiente') void analizar(act.id);
  }, [act, analizar]);

  // Si otra pestaña está analizando, se espera a que termine.
  useEffect(() => {
    if (!act || act.estado !== 'analizando' || ocupado) return;
    if (Date.now() - new Date(act.updated_at).getTime() > ANALISIS_COLGADO_MS) return;
    const id = setInterval(async () => {
      const r = await fetch(base).catch(() => null);
      if (r?.ok) setEstado(await r.json());
    }, 5000);
    return () => clearInterval(id);
  }, [act, base, ocupado]);

  // La URL recuerda la actuación abierta, sin volver a analizar al recargar.
  useEffect(() => {
    if (!act) return;
    const url = `/generador/expedientes/${estado.expediente.id}?a=${act.id}`;
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url);
  }, [act, estado.expediente.id]);

  const pendienteOficial = useMemo(() => {
    if (!act?.continua_de) return null;
    const previa = estado.actuaciones.find((x) => x.id === act.continua_de);
    const docId = previa?.borrador?.documentoId;
    if (!previa || !docId) return null;
    const oficial = estado.documentos.some((d) => d.version_de === docId && d.origen === 'cargado');
    if (oficial) return null;
    const doc = estado.documentos.find((d) => d.id === docId);
    return doc ? { documentoId: docId, nombre: doc.nombre, perfil: previa.perfil } : null;
  }, [act, estado]);

  if (!act) return <p className="text-sm text-muted-foreground">Este expediente no tiene actuaciones.</p>;

  const respuestaCambia = async (p: PreguntaDecisiva, respuesta: string) =>
    conOcupacion('respondiendo', () =>
      llamar(`${base}/actuaciones/${act.id}/responder`, 'POST', { preguntaId: p.id, pregunta: p.texto, respuesta, campo: p.campo }),
    );

  const subirYAnalizar = async (subidos: ArchivoSubido[], versionDe?: string) => {
    await conOcupacion('analizando', async () => {
      await llamar(`${base}/documentos`, 'POST', { archivos: subidos.map((s) => ({ nombre: s.nombre, ruta: s.ruta })), versionDe });
      toast.success(subidos.length === 1 ? 'Documento añadido y leído' : `${subidos.length} documentos añadidos y leídos`);
      await llamar(`${base}/actuaciones/${act.id}/analizar`, 'POST', {});
    });
  };

  return (
    <div className="space-y-5">
      <Cabecera
        estado={estado}
        alRenombrar={async (titulo) => {
          await llamar(base, 'PATCH', { titulo });
          setEstado((e) => ({ ...e, expediente: { ...e.expediente, titulo } }));
        }}
        alBorrar={async () => {
          await llamar(base, 'DELETE');
          toast.success('Expediente eliminado');
          router.push('/generador');
        }}
      />

      {/* Las actuaciones del expediente */}
      <nav aria-label="Actuaciones del expediente" className="flex flex-wrap gap-2">
        {estado.actuaciones.map((x) => (
          <PestanaDeActuacion key={x.id} x={x} activa={x.id === act.id} alElegir={() => !ocupado && setActiva(x.id)} />
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 space-y-5">
          <ZonaCaso act={act} ficha={estado.ficha} />
          <ZonaFuentes
            ficha={estado.ficha}
            contradicciones={estado.contradicciones}
            documentos={estado.documentos}
            analisis={act.analisis}
            ocupado={ocupado !== null}
            alCorregir={(campo: CampoFicha, valor: string) =>
              conOcupacion('analizando', async () => {
                await llamar(`${base}/ficha`, 'PATCH', { campo, valor });
                await llamar(`${base}/actuaciones/${act.id}/analizar`, 'POST', {});
              })
            }
            alSubir={(s) => subirYAnalizar(s)}
            alCambiarDocumento={async (id, cambios) => {
              await conOcupacion('subiendo', () => llamar(`${base}/documentos/${id}`, 'PATCH', cambios));
            }}
            alBorrar={async (id) => {
              await conOcupacion('subiendo', () => llamar(`${base}/documentos/${id}`, 'DELETE'));
            }}
          />
        </div>
        <ZonaResultado
          expedienteId={estado.expediente.id}
          act={act}
          ocupado={ocupado}
          permitidos={permitidos}
          pendienteOficial={pendienteOficial}
          alResponder={respuestaCambia}
          alAnalizar={(como) => analizar(act.id, como)}
          alRedactar={(nivel: NivelDeSalida) => conOcupacion('redactando', () => llamar(`${base}/actuaciones/${act.id}/redactar`, 'POST', { nivel }))}
          alAuditar={() => conOcupacion('auditando', () => llamar(`${base}/actuaciones/${act.id}/auditar`, 'POST'))}
          alContinuar={(perfil) =>
            conOcupacion('analizando', async () => {
              const res = await fetch(`${base}/actuaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perfil, continuaDe: act.id }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.detail || json?.error || 'No se pudo continuar');
              setActiva(json.actuacionId);
              await llamar(`${base}/actuaciones/${json.actuacionId}/analizar`, 'POST', {});
              toast.success(`Expediente continuado en el perfil ${PERFILES[perfil].nombre}`);
            })
          }
          alSubirOficial={(s, versionDe) => subirYAnalizar(s, versionDe)}
        />
      </div>
    </div>
  );
}

function PestanaDeActuacion({ x, activa, alElegir }: { x: ActuacionDelExpediente; activa: boolean; alElegir: () => void }) {
  const Icono = ICONO_PERFIL[x.perfil];
  const act = x.analisis?.actuacion ?? x.actuacion;
  return (
    <button
      type="button"
      onClick={alElegir}
      aria-current={activa ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12.5px] transition-colors',
        activa ? 'border-generar-500 bg-generar-50 dark:bg-generar-900/30' : 'border-border bg-card hover:border-generar-300',
      )}
    >
      <Icono className={cn('h-4 w-4', activa ? 'text-generar-600' : 'text-muted-foreground')} />
      <span>
        <span className="block font-semibold">{PERFILES[x.perfil].nombre}</span>
        <span className="block text-[11px] text-muted-foreground">{act ? ACTUACIONES[act].nombre : 'Por analizar'}</span>
      </span>
      {x.analisis && <Luz color={x.analisis.procedencia.semaforo} className="ml-1" />}
      {x.estado === 'analizando' && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </button>
  );
}

function Cabecera({
  estado,
  alRenombrar,
  alBorrar,
}: {
  estado: EstadoDelExpediente;
  alRenombrar: (t: string) => Promise<void>;
  alBorrar: () => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(estado.expediente.titulo);
  useEffect(() => setTitulo(estado.expediente.titulo), [estado.expediente.titulo]);
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-generar-700 dark:text-generar-400">Expediente contractual</p>
        {editando ? (
          <form
            className="mt-1 flex items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await alRenombrar(titulo.trim());
                setEditando(false);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-lg font-bold outline-none focus:border-generar-400" aria-label="Nombre del expediente" />
            <button type="submit" className="rounded-md bg-generar-500 p-1.5 text-white" aria-label="Guardar nombre">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setEditando(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Cancelar">
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <h1 className="group mt-0.5 flex items-start gap-2 text-balance text-2xl font-bold tracking-tight">
            <span className="min-w-0">{estado.expediente.titulo}</span>
            <button type="button" onClick={() => setEditando(true)} className="mt-1.5 shrink-0 rounded p-1 text-muted-foreground opacity-60 hover:bg-secondary hover:text-foreground group-hover:opacity-100" aria-label="Renombrar el expediente">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </h1>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm('¿Eliminar el expediente, sus documentos y sus análisis? No se puede deshacer.')) void alBorrar().catch((e) => toast.error((e as Error).message));
        }}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-3.5 w-3.5" /> Eliminar expediente
      </button>
    </header>
  );
}
