'use client';

/**
 * Zona 2 — Fuentes: los datos que A-LexIA identificó sola, el expediente
 * en sus doce carpetas y lo que falta.
 *
 * «No pedir lo que ya está en los documentos» (sección 10): la ficha se
 * muestra como «Datos identificados automáticamente» y el usuario solo
 * la toca si ve un error. Cada documento dice qué es, de dónde vino y en
 * qué estado está: original, generado por LexIA, firmado, presentado,
 * incorporado.
 */
import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CARPETAS, CLASES, ESTADOS_DOCUMENTO, LISTA_CLASES, type ClaseDocumental } from '@/lib/ejecucion/catalogo';
import { CAMPOS_FICHA, LISTA_CAMPOS, type CampoFicha, type AnalisisDeActuacion, type Contradiccion, type Ficha } from '@/lib/ejecucion/tipos';
import type { DocumentoParaVer } from '@/lib/ejecucion/estado';
import { CajaDeDocumentos, type ArchivoSubido } from './subida';
import { Zona } from './zona';

const NIVEL = {
  1: { texto: 'Indispensable', clase: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' },
  2: { texto: 'Necesaria según el caso', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  3: { texto: 'Complementaria', clase: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
} as const;

function formatoDato(campo: CampoFicha, valor: string): string {
  if (CAMPOS_FICHA[campo].formato === 'fecha' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-');
    return `${d}/${m}/${a}`;
  }
  return valor;
}

export function ZonaFuentes({
  ficha,
  contradicciones,
  documentos,
  analisis,
  ocupado,
  alCorregir,
  alSubir,
  alCambiarDocumento,
  alBorrar,
}: {
  ficha: Ficha;
  contradicciones: Contradiccion[];
  documentos: DocumentoParaVer[];
  analisis: AnalisisDeActuacion | null;
  ocupado: boolean;
  alCorregir: (campo: CampoFicha, valor: string) => Promise<void>;
  alSubir: (subidos: ArchivoSubido[]) => Promise<void>;
  alCambiarDocumento: (id: string, cambios: Record<string, unknown>) => Promise<void>;
  alBorrar: (id: string) => Promise<void>;
}) {
  const [todas, setTodas] = useState(false);
  const campos = LISTA_CAMPOS.filter((c) => ficha[c]);
  // La fuente de la mayoría se dice una vez; en cada fila solo la que difiere.
  const cuenta = new Map<string, number>();
  for (const c of campos) {
    const doc = ficha[c]?.documento;
    if (doc) cuenta.set(doc, (cuenta.get(doc) ?? 0) + 1);
  }
  const principal = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const faltan = LISTA_CAMPOS.filter((c) => !ficha[c] && ['numero_contrato', 'objeto', 'tipo_contratacion', 'monto_original', 'plazo_dias', 'fecha_convocatoria', 'contratista', 'entidad'].includes(c));
  const porCarpeta = new Map<number, DocumentoParaVer[]>();
  for (const d of documentos) {
    const c = d.carpeta ?? (d.origen === 'lexia' ? 11 : 2);
    porCarpeta.set(c, [...(porCarpeta.get(c) ?? []), d]);
  }
  const carpetas = Object.keys(CARPETAS)
    .map(Number)
    .filter((c) => todas || porCarpeta.has(c));

  return (
    <Zona numero="2" titulo="Fuentes" bajada="Lo que A-LexIA leyó, lo que identificó y lo que falta.">
      {/* Datos identificados */}
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Datos identificados automáticamente</h3>
        {principal && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">Tomados de «{principal}», salvo que se indique otro documento.</p>}
        {campos.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-muted-foreground">Todavía no hay datos del contrato: adjunta el contrato u otro documento que los tenga.</p>
        ) : (
          <dl className="mt-2 divide-y divide-border rounded-lg border border-border">
            {campos.map((c) => (
              <DatoEditable key={c} campo={c} dato={ficha[c]!} principal={principal} alGuardar={alCorregir} deshabilitado={ocupado} />
            ))}
          </dl>
        )}
        {faltan.length > 0 && (
          <details className="mt-2 text-[12px]">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Añadir un dato que no está en los documentos ({faltan.length})</summary>
            <dl className="mt-2 divide-y divide-border rounded-lg border border-dashed border-border">
              {faltan.map((c) => (
                <DatoEditable key={c} campo={c} dato={null} alGuardar={alCorregir} deshabilitado={ocupado} />
              ))}
            </dl>
          </details>
        )}
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">Corrígelos solo si ves un error: lo que cambies queda como declarado por ti, no como acreditado.</p>
      </div>

      {contradicciones.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            {contradicciones.length === 1 ? 'Una contradicción entre documentos' : `${contradicciones.length} contradicciones entre documentos`}
          </p>
          <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            {contradicciones.map((c, i) => (
              <li key={i}>{c.descripcion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* El expediente */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Expediente contractual · {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
          </h3>
          <button type="button" onClick={() => setTodas((v) => !v)} className="text-[11.5px] font-medium text-generar-700 hover:underline dark:text-generar-400">
            {todas ? 'Solo carpetas con documentos' : 'Ver las 12 carpetas'}
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {carpetas.length === 0 && <p className="text-[12.5px] text-muted-foreground">El expediente está vacío.</p>}
          {carpetas.map((c) => (
            <Carpeta
              key={c}
              numero={c}
              documentos={porCarpeta.get(c) ?? []}
              ocupado={ocupado}
              alCambiar={alCambiarDocumento}
              alBorrar={alBorrar}
            />
          ))}
        </div>
        <div className="mt-3">
          <CajaDeDocumentos compacta alSubir={alSubir} deshabilitada={ocupado} texto="Añadir documentos al expediente (PDF o Word)" />
        </div>
      </div>

      {/* Lo que falta */}
      {analisis && analisis.faltantes.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Documentos o datos faltantes</h3>
          <ul className="mt-2 space-y-2">
            {analisis.faltantes.map((f, i) => (
              <li key={i} className="rounded-lg border border-border bg-card p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-px text-[10.5px] font-semibold', NIVEL[f.nivel].clase)}>{NIVEL[f.nivel].texto}</span>
                  <span className="text-[12.5px] font-medium">{f.texto}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{f.porQue}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Zona>
  );
}

function DatoEditable({
  campo,
  dato,
  principal,
  alGuardar,
  deshabilitado,
}: {
  campo: CampoFicha;
  dato: Ficha[CampoFicha] | null;
  principal?: string;
  alGuardar: (campo: CampoFicha, valor: string) => Promise<void>;
  deshabilitado: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(dato?.valor ?? '');
  const [guardando, setGuardando] = useState(false);
  const esFecha = CAMPOS_FICHA[campo].formato === 'fecha';
  async function guardar(v: string) {
    setGuardando(true);
    try {
      await alGuardar(campo, v);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }
  return (
    <div className="flex items-start gap-2 px-3 py-2">
      <dt className="w-[38%] shrink-0 text-[11.5px] font-medium leading-snug text-muted-foreground">{CAMPOS_FICHA[campo].nombre}</dt>
      <dd className="min-w-0 flex-1 text-[12.5px] leading-snug">
        {editando ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void guardar(valor);
            }}
          >
            <input
              autoFocus
              type={esFecha ? 'date' : 'text'}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-[12.5px] outline-none focus:border-generar-400"
              aria-label={CAMPOS_FICHA[campo].nombre}
            />
            <button type="submit" disabled={guardando} className="rounded-md bg-generar-500 p-1 text-white hover:bg-generar-600" aria-label="Guardar">
              {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Cancelar">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <div className="group flex items-start gap-1.5">
            <span className={cn('min-w-0 flex-1 break-words', !dato && 'text-muted-foreground')} title={dato?.cita ? `«${dato.cita}» — ${dato.documento}` : undefined}>
              {dato ? formatoDato(campo, dato.valor) : '—'}
              {dato?.delUsuario && <span className="ml-1.5 rounded bg-secondary px-1 py-px text-[10px] text-muted-foreground">declarado por ti</span>}
              {dato?.documento && dato.documento !== principal && <span className="block truncate text-[10.5px] text-muted-foreground">de {dato.documento}</span>}
            </span>
            <button
              type="button"
              disabled={deshabilitado}
              onClick={() => {
                setValor(dato?.valor ?? '');
                setEditando(true);
              }}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-60 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100 disabled:opacity-30"
              aria-label={`Corregir ${CAMPOS_FICHA[campo].nombre}`}
            >
              <Pencil className="h-3 w-3" />
            </button>
            {dato?.delUsuario && (
              <button
                type="button"
                disabled={deshabilitado || guardando}
                onClick={() => void guardar('')}
                className="shrink-0 rounded px-1 text-[10.5px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Volver a lo que dicen los documentos"
              >
                deshacer
              </button>
            )}
          </div>
        )}
      </dd>
    </div>
  );
}

const ESTADO_PILL: Record<string, string> = {
  original: 'bg-secondary text-foreground/80',
  generado: 'bg-generar-100 text-generar-800 dark:bg-generar-900/40 dark:text-generar-200',
  revisado: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  firmado: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
  presentado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  incorporado: 'bg-emerald-600 text-white',
};

function Carpeta({
  numero,
  documentos,
  ocupado,
  alCambiar,
  alBorrar,
}: {
  numero: number;
  documentos: DocumentoParaVer[];
  ocupado: boolean;
  alCambiar: (id: string, cambios: Record<string, unknown>) => Promise<void>;
  alBorrar: (id: string) => Promise<void>;
}) {
  const [abierta, setAbierta] = useState(documentos.length > 0);
  return (
    <div className={cn('rounded-lg border', documentos.length ? 'border-border bg-card' : 'border-dashed border-border/70')}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={abierta}
      >
        {abierta ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <FolderOpen className={cn('h-3.5 w-3.5', documentos.length ? 'text-generar-600' : 'text-muted-foreground/60')} />
        <span className={cn('text-[12.5px] font-medium', !documentos.length && 'text-muted-foreground')}>
          {String(numero).padStart(2, '0')}. {CARPETAS[numero]}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{documentos.length}</span>
      </button>
      {abierta && documentos.length > 0 && (
        <ul className="space-y-1.5 border-t border-border px-3 py-2">
          {documentos.map((d) => (
            <FilaDeDocumento key={d.id} d={d} ocupado={ocupado} alCambiar={alCambiar} alBorrar={alBorrar} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilaDeDocumento({
  d,
  ocupado,
  alCambiar,
  alBorrar,
}: {
  d: DocumentoParaVer;
  ocupado: boolean;
  alCambiar: (id: string, cambios: Record<string, unknown>) => Promise<void>;
  alBorrar: (id: string) => Promise<void>;
}) {
  const [formalizando, setFormalizando] = useState(false);
  const esDeLexia = d.origen === 'lexia';
  return (
    <li className="rounded-md py-1">
      <div className="flex items-start gap-2">
        {esDeLexia ? <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-generar-600" /> : <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium" title={d.nombre}>
            {d.nombre}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={cn('rounded px-1.5 py-px font-medium', ESTADO_PILL[d.estado])}>{ESTADOS_DOCUMENTO[d.estado]}</span>
            {d.lectura === 'leyendo' || d.lectura === 'pendiente' ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> leyendo…
              </span>
            ) : d.lectura === 'error' ? (
              <span className="text-red-600 dark:text-red-400">no se pudo leer</span>
            ) : !esDeLexia ? (
              <select
                value={d.clase ?? 'otro'}
                disabled={ocupado}
                onChange={(e) => void alCambiar(d.id, { clase: e.target.value as ClaseDocumental })}
                className="w-auto max-w-[190px] rounded border border-transparent bg-transparent py-px pr-1 text-[11px] text-muted-foreground hover:border-border focus:border-generar-400"
                aria-label={`Qué documento es ${d.nombre}`}
                title="Si A-LexIA lo clasificó mal, corrígelo aquí"
              >
                {LISTA_CLASES.map((c) => (
                  <option key={c} value={c}>
                    {CLASES[c].nombre}
                  </option>
                ))}
              </select>
            ) : null}
            {d.datos?.fecha && <span className="text-muted-foreground">· {d.datos.fecha.split('-').reverse().join('/')}</span>}
            {d.formalizacion?.numero && <span className="text-muted-foreground">· N.° {d.formalizacion.numero}</span>}
          </div>
          {d.lectura === 'error' && d.error && <p className="mt-1 text-[11.5px] leading-snug text-red-700 dark:text-red-300">{d.error}</p>}
          {d.datos?.resumen && d.lectura === 'leido' && <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{d.datos.resumen}</p>}
          {esDeLexia && d.generacion && (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Generado por {d.generacion.usuario} el {new Date(d.generacion.fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })} · versión {d.generacion.version}. No es un documento oficial.
            </p>
          )}
          {esDeLexia && formalizando && (
            <FormularioDeFormalizacion
              inicial={{ ...(d.formalizacion ?? {}) }}
              alGuardar={async (f) => {
                await alCambiar(d.id, { formalizacion: f, estado: f.fechaPresentacion ? 'presentado' : 'firmado' });
                setFormalizando(false);
              }}
              alCancelar={() => setFormalizando(false)}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {esDeLexia && !formalizando && (
            <button type="button" disabled={ocupado} onClick={() => setFormalizando(true)} className="rounded px-1.5 py-0.5 text-[11px] font-medium text-generar-700 hover:bg-generar-50 dark:text-generar-400 dark:hover:bg-generar-900/30">
              Formalizar
            </button>
          )}
          {!esDeLexia && d.estado !== 'incorporado' && d.lectura === 'leido' && (
            <button type="button" disabled={ocupado} onClick={() => void alCambiar(d.id, { estado: 'incorporado' })} className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground" title="Marcarlo como formalmente incorporado al expediente (carpeta 12)">
              Incorporar
            </button>
          )}
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              if (confirm(`¿Quitar «${d.nombre}» del expediente?`)) void alBorrar(d.id);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            aria-label={`Quitar ${d.nombre}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

function FormularioDeFormalizacion({
  inicial,
  alGuardar,
  alCancelar,
}: {
  inicial: Record<string, string | undefined>;
  alGuardar: (f: Record<string, string>) => Promise<void>;
  alCancelar: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>({
    numero: inicial.numero ?? '',
    fecha: inicial.fecha ?? '',
    fechaPresentacion: inicial.fechaPresentacion ?? '',
    firmante: inicial.firmante ?? '',
    estadoTramite: inicial.estadoTramite ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const campo = (k: string, etiqueta: string, tipo = 'text') => (
    <label className="block">
      <span className="text-[10.5px] font-medium text-muted-foreground">{etiqueta}</span>
      <input
        type={tipo}
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-generar-400"
      />
    </label>
  );
  return (
    <form
      className="mt-2 space-y-2 rounded-md border border-border bg-secondary/30 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
          await alGuardar(Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim())));
        } finally {
          setGuardando(false);
        }
      }}
    >
      <p className="text-[11px] leading-snug text-muted-foreground">
        Datos de formalización del documento emitido. Para usarlo como antecedente formal de otro perfil, adjunta además la versión oficial firmada.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {campo('numero', 'Número oficial')}
        {campo('fecha', 'Fecha oficial', 'date')}
        {campo('firmante', 'Firmante')}
        {campo('fechaPresentacion', 'Fecha de presentación', 'date')}
      </div>
      {campo('estadoTramite', 'Estado de trámite')}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={alCancelar} className="rounded-md px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="inline-flex items-center gap-1 rounded-md bg-generar-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-generar-600">
          {guardando && <Loader2 className="h-3 w-3 animate-spin" />}
          Guardar
        </button>
      </div>
    </form>
  );
}
