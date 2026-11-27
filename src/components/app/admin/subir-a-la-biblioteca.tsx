'use client';

/**
 * Subir documentos a la Biblioteca Normativa (/admin/biblioteca).
 *
 * Reunión con César del 27/11/2026: «uno para subir manual, sería genial
 * para yo subirlo manualmente». Se sube el archivo, A-LexIA lee el texto y
 * propone la ficha (tipo, número, título, fecha), avisa si ya estaba, y al
 * confirmar lo trocea, lo indexa y lo resume como el resto de la
 * biblioteca. Permiso «biblioteca» (bibliotecario, administrador,
 * superadmin). Ver `src/lib/biblioteca/subir.ts`.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, FileText, Library, Loader2, RefreshCw, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { getDocTypeMeta } from '@/lib/utils';
import { TIPOS_SUBIBLES, type FichaPropuesta } from '@/lib/biblioteca/tipos';
import type { DocumentoExistente, Lectura, ResultadoDeSubida } from '@/lib/biblioteca/subir';

const SELECT =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ETAPAS = ['Leyendo el documento', 'Troceando el texto', 'Indexando en la biblioteca', 'Resumiendo'];

interface Ficha {
  tipo: string;
  numero: string;
  titulo: string;
  fecha: string;
  ley: 'ley_32069' | 'ley_30225';
  fuente: string;
}

interface Elemento {
  clave: string;
  nombre: string;
  ruta: string;
  estado: 'leyendo' | 'revisar' | 'subiendo' | 'hecho' | 'error';
  lectura?: Lectura;
  ficha: Ficha;
  etapa?: number;
  resultado?: ResultadoDeSubida;
  error?: string;
  duplicado?: DocumentoExistente | null;
}

interface Reciente {
  id: string;
  tipo: string;
  numero: string | null;
  titulo: string;
  fecha: string | null;
  subidoEn: string;
  conResumen: boolean;
}

const fichaDe = (p: FichaPropuesta): Ficha => ({
  tipo: p.tipo ?? '',
  numero: p.numero,
  titulo: p.titulo,
  fecha: p.fecha,
  ley: p.ley,
  fuente: '',
});

async function pedir<T>(url: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const j = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string; documento?: DocumentoExistente };
  if (!res.ok) throw Object.assign(new Error(j?.message || j?.error || 'No se pudo completar'), { datos: j });
  return j;
}

function TarjetaDeArchivo({
  e,
  onCambiar,
  onSubir,
  onQuitar,
}: {
  e: Elemento;
  onCambiar: (f: Partial<Ficha>) => void;
  onSubir: () => void;
  onQuitar: () => void;
}) {
  const f = e.ficha;
  const listo = !!f.tipo && f.numero.trim().length > 0 && f.titulo.trim().length > 0;
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <FileText className="h-4 w-4 shrink-0 text-brand-600" /> {e.nombre}
          </p>
          {e.lectura && (
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {e.lectura.paginas ? `${e.lectura.paginas} página(s) · ` : ''}
              {e.lectura.caracteres.toLocaleString('es-PE')} caracteres
              {e.lectura.ocr ? ' · escaneado, se leyó transcribiendo la imagen' : ''}
              {e.lectura.propuesta.origen === 'reglas'
                ? ' · ficha reconocida del encabezado'
                : e.lectura.propuesta.origen === 'modelo'
                  ? ' · ficha propuesta por A-LexIA: revísala'
                  : ''}
            </p>
          )}
        </div>
        {e.estado !== 'subiendo' && e.estado !== 'leyendo' && (
          <Button variant="ghost" size="icon-sm" onClick={onQuitar} aria-label="Quitar de la lista">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {e.estado === 'leyendo' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" /> Leyendo el documento y proponiendo la ficha…
        </p>
      )}

      {e.estado === 'error' && !e.lectura && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {e.error}
        </p>
      )}

      {e.estado === 'hecho' && e.resultado && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" role="status">
          <p className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Agregado a la biblioteca: {e.resultado.numero}
          </p>
          <p className="mt-1 text-[12.5px]">
            {e.resultado.fragmentos} fragmentos indexados · resumen {e.resultado.resumen === 'listo' ? 'listo' : 'pendiente (se completa solo)'}. Ya lo encuentran el chat, la voz y los
            evaluadores.
          </p>
          <Link href={`/biblioteca/documento/${e.resultado.id}`} target="_blank" className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium underline-offset-2 hover:underline">
            Ver el documento <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {e.lectura && e.estado !== 'hecho' && (
        <>
          {e.duplicado && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ya está en la biblioteca{e.duplicado.por === 'archivo' ? ' (el mismo archivo)' : ' (mismo tipo y número)'}:{' '}
                <Link href={`/biblioteca/documento/${e.duplicado.id}`} target="_blank" className="font-semibold underline-offset-2 hover:underline">
                  {e.duplicado.number ?? e.duplicado.title}
                </Link>
                . No se vuelve a agregar.
              </span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${e.clave}-tipo`}>Tipo *</Label>
              <select id={`${e.clave}-tipo`} className={SELECT} value={f.tipo} onChange={(x) => onCambiar({ tipo: x.target.value })} disabled={e.estado === 'subiendo'}>
                <option value="">Elige el tipo…</option>
                {TIPOS_SUBIBLES.map((t) => (
                  <option key={t} value={t}>
                    {getDocTypeMeta(t).label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor={`${e.clave}-numero`}>Número *</Label>
              <Input id={`${e.clave}-numero`} value={f.numero} maxLength={200} onChange={(x) => onCambiar({ numero: x.target.value })} disabled={e.estado === 'subiendo'} placeholder="Informe IVN N° 032-2025/DSAT" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${e.clave}-fecha`}>Fecha</Label>
              <Input id={`${e.clave}-fecha`} type="date" value={f.fecha} onChange={(x) => onCambiar({ fecha: x.target.value })} disabled={e.estado === 'subiendo'} />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor={`${e.clave}-titulo`}>Título o sumilla *</Label>
              <Input id={`${e.clave}-titulo`} value={f.titulo} maxLength={500} onChange={(x) => onCambiar({ titulo: x.target.value })} disabled={e.estado === 'subiendo'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${e.clave}-ley`}>Ley aplicable</Label>
              <select id={`${e.clave}-ley`} className={SELECT} value={f.ley} onChange={(x) => onCambiar({ ley: x.target.value as Ficha['ley'] })} disabled={e.estado === 'subiendo'}>
                <option value="ley_32069">Ley N° 32069</option>
                <option value="ley_30225">Ley N° 30225</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
              <Label htmlFor={`${e.clave}-fuente`}>Enlace a la fuente oficial (opcional)</Label>
              <Input id={`${e.clave}-fuente`} value={f.fuente} maxLength={1000} onChange={(x) => onCambiar({ fuente: x.target.value })} disabled={e.estado === 'subiendo'} placeholder="https://www.gob.pe/…" />
            </div>
          </div>
          <details className="mt-3 text-[12px] text-muted-foreground">
            <summary className="cursor-pointer">Ver el inicio del texto leído</summary>
            <p className="mt-1.5 whitespace-pre-line rounded-md bg-secondary/40 p-2">{e.lectura.muestra}</p>
          </details>
          {e.error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {e.error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-muted-foreground" aria-live="polite">
              {e.estado === 'subiendo' ? `${ETAPAS[e.etapa ?? 0]}…` : 'Revisa la ficha antes de agregarlo.'}
            </p>
            <Button onClick={onSubir} disabled={!listo || !!e.duplicado || e.estado === 'subiendo'} aria-busy={e.estado === 'subiendo'}>
              {e.estado === 'subiendo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4" />}
              Agregar a la biblioteca
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

export function SubirALaBiblioteca() {
  const [cola, setCola] = useState<Elemento[]>([]);
  const [recientes, setRecientes] = useState<Reciente[] | null>(null);

  const cargarRecientes = useCallback(async () => {
    try {
      const r = await pedir<{ documentos: Reciente[] }>('/api/admin/biblioteca');
      setRecientes(r.documentos);
    } catch {
      setRecientes([]);
    }
  }, []);
  useEffect(() => {
    cargarRecientes();
  }, [cargarRecientes]);

  const actualizar = (clave: string, cambio: Partial<Elemento> | ((e: Elemento) => Partial<Elemento>)) =>
    setCola((prev) => prev.map((e) => (e.clave === clave ? { ...e, ...(typeof cambio === 'function' ? cambio(e) : cambio) } : e)));

  async function agregarArchivo(a: { name: string; path: string } | null) {
    if (!a) return;
    const clave = `${a.path}-${Date.now()}`;
    setCola((prev) => [
      { clave, nombre: a.name, ruta: a.path, estado: 'leyendo', ficha: { tipo: '', numero: '', titulo: '', fecha: '', ley: 'ley_32069', fuente: '' } },
      ...prev,
    ]);
    try {
      const lectura = await pedir<Lectura>('/api/admin/biblioteca/leer', { ruta: a.path });
      actualizar(clave, { estado: 'revisar', lectura, ficha: fichaDe(lectura.propuesta), duplicado: lectura.duplicado });
    } catch (err) {
      actualizar(clave, { estado: 'error', error: (err as Error).message });
    }
  }

  async function subir(e: Elemento) {
    actualizar(e.clave, { estado: 'subiendo', etapa: 0, error: undefined });
    // Las etapas avanzan solas mientras el servidor trabaja (una sola llamada).
    const reloj = setInterval(() => actualizar(e.clave, (x) => ({ etapa: Math.min((x.etapa ?? 0) + 1, ETAPAS.length - 1) })), 6000);
    try {
      const r = await pedir<ResultadoDeSubida>('/api/admin/biblioteca/subir', {
        ruta: e.ruta,
        ficha: {
          tipo: e.ficha.tipo,
          numero: e.ficha.numero,
          titulo: e.ficha.titulo,
          fecha: e.ficha.fecha || null,
          ley: e.ficha.ley,
          fuente: e.ficha.fuente.trim() || null,
        },
      });
      actualizar(e.clave, { estado: 'hecho', resultado: r });
      toast.success(`Agregado: ${r.numero}`);
      cargarRecientes();
    } catch (err) {
      const datos = (err as Error & { datos?: { documento?: DocumentoExistente } }).datos;
      actualizar(e.clave, { estado: 'revisar', error: (err as Error).message, ...(datos?.documento ? { duplicado: datos.documento } : {}) });
    } finally {
      clearInterval(reloj);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Panel
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Subir a la biblioteca</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Leyes, decretos, directivas, acuerdos de Sala Plena, pronunciamientos, informes de vicio de nulidad, dictámenes… en PDF o Word. A-LexIA
          lee el documento, propone su ficha y, al confirmarla, lo deja disponible para el chat, la voz y los evaluadores.
        </p>
      </header>

      <Card className="p-5">
        <PdfDropzone
          folder="biblioteca"
          value={null}
          onChange={agregarArchivo}
          tipos={{
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          }}
          label="Arrastra un PDF o Word, o haz clic para elegirlo. Puedes subir varios, uno tras otro."
        />
      </Card>

      {cola.length > 0 && (
        <section className="space-y-3" aria-label="Documentos por agregar">
          {cola.map((e) => (
            <TarjetaDeArchivo
              key={e.clave}
              e={e}
              onCambiar={(f) => actualizar(e.clave, (x) => ({ ficha: { ...x.ficha, ...f } }))}
              onSubir={() => subir(e)}
              onQuitar={() => setCola((prev) => prev.filter((x) => x.clave !== e.clave))}
            />
          ))}
        </section>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Subidos recientemente</h2>
          <Button variant="ghost" size="sm" onClick={cargarRecientes} aria-label="Actualizar lista">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {recientes === null ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </p>
        ) : recientes.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Aún no se ha subido nada desde aquí.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recientes.map((d) => {
              const meta = getDocTypeMeta(d.tipo);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                    {meta.label}
                  </Badge>
                  <Link href={`/biblioteca/documento/${d.id}`} target="_blank" className="font-medium underline-offset-2 hover:underline">
                    {d.numero ?? d.titulo}
                  </Link>
                  <span className="text-[12px] text-muted-foreground">
                    {d.fecha ? `${d.fecha} · ` : ''}subido {new Date(d.subidoEn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {d.conResumen ? '' : ' · resumen pendiente'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
