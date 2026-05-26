'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Check, Loader2 } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

export function PdfDropzone({
  folder,
  value,
  onChange,
  label = 'Arrastra el PDF o haz click',
  accept = 'application/pdf',
  compact = false,
  maxSize = 25 * 1024 * 1024,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (file.size > maxSize) {
        toast.error(`El archivo es demasiado grande (max ${formatBytes(maxSize)})`);
        return;
      }
      setUploading(true);
      setProgress(0);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);

        // XHR para tener progreso real de upload
        const result = await new Promise<UploadedFile>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(json);
              else reject(new Error(json.error || `HTTP ${xhr.status}`));
            } catch (err) {
              reject(err);
            }
          };
          xhr.onerror = () => reject(new Error('upload_failed'));
          xhr.send(fd);
        });

        onChange(result);
        toast.success('Archivo subido');
      } catch (err) {
        toast.error('No se pudo subir el archivo');
      } finally {
        setUploading(false);
        setProgress(0);
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
            <p className="text-[11px] text-muted-foreground">{formatBytes(value.size)} · Listo para evaluar</p>
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
      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 text-brand-600 dark:text-brand-400 animate-spin mb-3" />
          <p className="font-medium text-sm">Subiendo… {progress}%</p>
          <div className="mt-3 h-1 w-full max-w-xs bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
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
