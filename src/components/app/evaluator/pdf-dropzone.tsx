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
}

interface Props {
  folder: string;
  value?: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  label?: string;
  accept?: string;
  compact?: boolean;
  maxSize?: number;
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
  file: File,
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
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');
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
  compact = false,
  maxSize = 100 * 1024 * 1024,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (file.size > maxSize) {
        toast.error(
          `El archivo es demasiado grande (max ${formatBytes(maxSize)})`,
        );
        return;
      }
      setUploading(true);
      setStats({ loaded: 0, total: file.size, speedBps: 0, etaSeconds: null });
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user || !session?.access_token) {
          throw new Error('no_session');
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${session.user.id}/${folder}/${Date.now()}-${safeName}`;

        await uploadWithProgress(file, path, session.access_token, (s) => {
          setStats(s);
        });

        // Completar al 100% (si la última muestra del progress no llegó a 100)
        setStats({
          loaded: file.size,
          total: file.size,
          speedBps: 0,
          etaSeconds: 0,
        });

        onChange({ name: file.name, path, size: file.size });
        toast.success('Archivo subido');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'no_session') {
          toast.error('Tu sesión expiró. Recarga la página.');
        } else {
          toast.error(`No se pudo subir: ${msg.slice(0, 80)}`);
        }
      } finally {
        setUploading(false);
        setStats(null);
        xhrRef.current = null;
      }
    },
    [folder, maxSize, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { [accept]: ['.pdf'] },
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
              {formatBytes(value.size)} · Listo para evaluar
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
      {uploading && stats ? (
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 className="h-5 w-5 text-brand-600 dark:text-brand-400 animate-spin" />
            <p className="font-medium text-sm">
              Subiendo…{' '}
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
            Formato PDF · máximo {formatBytes(maxSize)}
          </p>
        </>
      )}
    </div>
  );
}
