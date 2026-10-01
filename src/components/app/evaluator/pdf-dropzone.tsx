'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, X, Check, Loader2, Gauge } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  /**
   * Cuando el PDF pasó del límite de Storage y se subió partido: las
   * rutas de cada parte, en orden. `path` es la primera.
   */
  partes?: string[];
}

/**
 * Lo más que Storage acepta por archivo. El bucket dice 100 MB, pero el
 * límite del proyecto manda y es 50: un PDF de 68,8 MB volvía con «The
 * object exceeded the maximum allowed size» (César, 30/09/2026).
 */
const LIMITE_STORAGE = 50 * 1024 * 1024;
/** Por encima de esto se parte, con margen para lo que pdf-lib añade al reescribir. */
const UMBRAL_PARTIR = 45 * 1024 * 1024;
const TAMANO_PARTE = 40 * 1024 * 1024;

/**
 * Parte un PDF en piezas que quepan en Storage, por páginas y sin tocar
 * su contenido. Si una pieza sale todavía grande —un escaneo con páginas
 * más pesadas que otras—, se vuelve a partir por la mitad.
 */
async function partirPdf(file: File, alAvanzar: (texto: string) => void): Promise<Blob[]> {
  const { PDFDocument } = await import('pdf-lib');
  alAvanzar('Abriendo el PDF…');
  const origen = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = origen.getPageCount();

  async function armar(desde: number, hasta: number): Promise<Blob[]> {
    const doc = await PDFDocument.create();
    const indices = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
    const paginas = await doc.copyPages(origen, indices);
    paginas.forEach((pg) => doc.addPage(pg));
    const bytes = await doc.save();
    if (bytes.byteLength > UMBRAL_PARTIR) {
      if (hasta === desde) throw new Error(`la página ${desde + 1} sola pesa más de 45 MB`);
      const medio = Math.floor((desde + hasta) / 2);
      return [...(await armar(desde, medio)), ...(await armar(medio + 1, hasta))];
    }
    return [new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })];
  }

  const piezas = Math.max(2, Math.ceil(file.size / TAMANO_PARTE));
  const porPieza = Math.ceil(total / piezas);
  const partes: Blob[] = [];
  for (let desde = 0; desde < total; desde += porPieza) {
    alAvanzar(`Dividiendo en partes (${Math.min(desde + porPieza, total)} de ${total} páginas)…`);
    partes.push(...(await armar(desde, Math.min(desde + porPieza, total) - 1)));
  }
  return partes;
}

interface Props {
  folder: string;
  value?: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  label?: string;
  accept?: string;
  /**
   * Varios tipos a la vez, por mime y extensión. El requerimiento se
   * puede evaluar en PDF o en Word; las bases y las ofertas, solo en PDF.
   */
  tipos?: Record<string, string[]>;
  compact?: boolean;
  maxSize?: number;
  /**
   * Partir en el navegador los PDF que pasan del límite de Storage. Solo
   * donde quien lee después sabe juntar las partes (`partes`): la
   * evaluación de ofertas.
   */
  dividir?: boolean;
}

interface UploadStats {
  loaded: number;
  total: number;
  speedBps: number;
  etaSeconds: number | null;
}

function formatEta(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return '< 1s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

function formatSpeed(bps: number): string {
  if (!bps || !isFinite(bps)) return '—';
  return `${formatBytes(bps)}/s`;
}

/**
 * Sube el archivo directamente al endpoint REST de Supabase Storage usando
 * XHR para poder trackear progreso real (el SDK no expone onUploadProgress).
 *
 * Sin pasar por Vercel — el cliente envía el PDF directo al CDN de Supabase
 * autenticándose con el access_token de la sesión actual.
 */
async function uploadWithProgress(
  file: Blob,
  path: string,
  accessToken: string,
  onProgress: (stats: UploadStats) => void,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = `${supabaseUrl}/storage/v1/object/uploads/${path}`;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startedAt = Date.now();

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const elapsed = (Date.now() - startedAt) / 1000;
      const speedBps = elapsed > 0 ? e.loaded / elapsed : 0;
      const remainingBytes = e.total - e.loaded;
      const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : null;
      onProgress({
        loaded: e.loaded,
        total: e.total,
        speedBps,
        etaSeconds,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const json = JSON.parse(xhr.responseText);
          msg = json.message || json.error || msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red'));
    xhr.onabort = () => reject(new Error('Subida cancelada'));

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('x-upsert', 'false');
    // Si el navegador no dice el tipo, se deduce de la extensión: el
    // bucket rechaza lo que no reconoce.
    xhr.setRequestHeader(
      'Content-Type',
      file.type ||
        (file instanceof File && /\.docx$/i.test(file.name)
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf'),
    );
    xhr.send(file);

    // Expose abort para cancelar desde fuera (no usado por ahora)
    (xhr as XMLHttpRequest & { __abort?: () => void }).__abort = () => xhr.abort();
  });
}

export function PdfDropzone({
  folder,
  value,
  onChange,
  label = 'Arrastra el PDF o haz click',
  accept = 'application/pdf',
  tipos,
  compact = false,
  dividir = false,
  maxSize = dividir ? 400 * 1024 * 1024 : LIMITE_STORAGE,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [preparando, setPreparando] = useState<string | null>(null);
  const [parte, setParte] = useState<{ actual: number; total: number } | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (file.size > maxSize) {
        toast.error(
          `El archivo pesa ${formatBytes(file.size)} y aquí se aceptan hasta ${formatBytes(maxSize)}. Comprímelo (por ejemplo, en ilovepdf.com/es/comprimir_pdf) y vuelve a subirlo.`,
        );
        return;
      }
      setUploading(true);
      setStats({ loaded: 0, total: file.size, speedBps: 0, etaSeconds: null });
      try {
        const esPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        let piezas: Blob[] = [file];
        if (dividir && file.size > UMBRAL_PARTIR) {
          if (!esPdf) throw new Error('demasiado_grande');
          setPreparando('Preparando el archivo…');
          try {
            piezas = await partirPdf(file, setPreparando);
          } catch (e) {
            throw new Error(`No se pudo dividir el PDF: ${(e as Error).message}`);
          } finally {
            setPreparando(null);
          }
        }

        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user || !session?.access_token) {
          throw new Error('no_session');
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const base = `${session.user.id}/${folder}/${Date.now()}-${safeName}`;
        const rutas: string[] = [];
        const totalBytes = piezas.reduce((s, b) => s + b.size, 0);
        let previos = 0;
        for (let i = 0; i < piezas.length; i++) {
          const ruta = piezas.length > 1 ? base.replace(/(\.pdf)?$/i, `-parte${i + 1}.pdf`) : base;
          if (piezas.length > 1) setParte({ actual: i + 1, total: piezas.length });
          await uploadWithProgress(piezas[i], ruta, session.access_token, (s) => {
            const loaded = previos + s.loaded;
            setStats({
              loaded,
              total: totalBytes,
              speedBps: s.speedBps,
              etaSeconds: s.speedBps > 0 ? (totalBytes - loaded) / s.speedBps : null,
            });
          });
          previos += piezas[i].size;
          rutas.push(ruta);
        }
        const path = rutas[0];

        // Completar al 100% (si la última muestra del progress no llegó a 100)
        setStats({
          loaded: file.size,
          total: file.size,
          speedBps: 0,
          etaSeconds: 0,
        });

        onChange({ name: file.name, path, size: file.size, ...(rutas.length > 1 ? { partes: rutas } : {}) });
        toast.success(rutas.length > 1 ? `Archivo subido en ${rutas.length} partes` : 'Archivo subido');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'no_session') {
          toast.error('Tu sesión expiró. Recarga la página.');
        } else if (msg === 'demasiado_grande' || /maximum allowed size/i.test(msg)) {
          toast.error(
            `El archivo pesa ${formatBytes(file.size)} y Storage acepta hasta ${formatBytes(LIMITE_STORAGE)}. Comprímelo (por ejemplo, en ilovepdf.com/es/comprimir_pdf) y vuelve a subirlo.`,
          );
        } else {
          toast.error(`No se pudo subir: ${msg.slice(0, 80)}`);
        }
      } finally {
        setUploading(false);
        setStats(null);
        setParte(null);
        xhrRef.current = null;
      }
    },
    [folder, maxSize, onChange, dividir],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: tipos ?? { [accept]: ['.pdf'] },
    multiple: false,
    disabled: uploading || !!value,
  });

  if (value) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/30 px-5 py-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{value.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatBytes(value.size)}
              {value.partes && value.partes.length > 1 ? ` · subido en ${value.partes.length} partes` : ''} · Listo para evaluar
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(null)}
          aria-label="Quitar archivo"
        >
          <X className="h-4 w-4" />
        </Button>
      </motion.div>
    );
  }

  const percent =
    stats && stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0;

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer text-center',
        compact ? 'px-5 py-6' : 'px-8 py-12',
        isDragActive
          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40'
          : 'border-border hover:border-brand-400 hover:bg-secondary/30',
        uploading && 'cursor-progress',
      )}
    >
      <input {...getInputProps()} />
      {uploading && preparando ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-brand-600 dark:text-brand-400 animate-spin" />
          <p className="font-medium text-sm">{preparando}</p>
        </div>
      ) : uploading && stats ? (
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 className="h-5 w-5 text-brand-600 dark:text-brand-400 animate-spin" />
            <p className="font-medium text-sm">
              {parte ? `Subiendo parte ${parte.actual} de ${parte.total}…` : 'Subiendo…'}{' '}
              <span className="font-mono text-brand-700 dark:text-brand-400">
                {percent.toFixed(0)}%
              </span>
            </p>
          </div>

          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
              animate={{ width: `${percent}%` }}
              transition={{ ease: 'linear', duration: 0.2 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div>
              <p className="text-muted-foreground uppercase tracking-wider font-semibold">
                Transferido
              </p>
              <p className="font-mono text-foreground mt-0.5">
                {formatBytes(stats.loaded)} / {formatBytes(stats.total)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 justify-center">
                <Gauge className="h-3 w-3" />
                Velocidad
              </p>
              <p className="font-mono text-foreground mt-0.5 text-center">
                {formatSpeed(stats.speedBps)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider font-semibold text-right">
                Restante
              </p>
              <p className="font-mono text-foreground mt-0.5 text-right">
                {formatEta(stats.etaSeconds)}
              </p>
            </div>
          </div>

          {stats.total > 30 * 1024 * 1024 && (
            <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
              Archivo grande detectado. La subida puede tardar más en
              conexiones lentas. No cierres esta ventana.
            </p>
          )}
        </div>
      ) : (
        <>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-3 group-hover:scale-110 transition-transform">
            <Upload className="h-5 w-5" />
          </span>
          <p className="font-medium text-sm">{label}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Formato {tipos && Object.values(tipos).flat().includes('.docx') ? 'PDF o Word (.docx)' : 'PDF'} · máximo{' '}
            {formatBytes(maxSize)}
          </p>
        </>
      )}
    </div>
  );
}
