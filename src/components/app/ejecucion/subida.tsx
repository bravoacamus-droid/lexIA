'use client';

/**
 * Subir los documentos del expediente, varios a la vez.
 *
 * Van directo del navegador al bucket `uploads`, a la carpeta del
 * usuario: no pasan por el servidor de la aplicación, que tiene tope de
 * tamaño. El servidor solo recibe la ruta y los lee desde el bucket.
 */
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn, formatBytes } from '@/lib/utils';

export interface ArchivoSubido {
  nombre: string;
  ruta: string;
  tamano: number;
}

const TIPOS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};
const MAXIMO = 60 * 1024 * 1024;

export async function subirArchivos(archivos: File[]): Promise<ArchivoSubido[]> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Tu sesión expiró. Recarga la página.');
  const subidos: ArchivoSubido[] = [];
  for (const f of archivos) {
    const limpio = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ruta = `${session.user.id}/expedientes/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${limpio}`;
    const tipo =
      f.type ||
      (/\.docx$/i.test(f.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
    const { error } = await supabase.storage.from('uploads').upload(ruta, f, { contentType: tipo, upsert: false });
    if (error) throw new Error(`No se pudo subir «${f.name}»: ${error.message}`);
    subidos.push({ nombre: f.name, ruta, tamano: f.size });
  }
  return subidos;
}

/**
 * La caja donde se sueltan los archivos. Si `alSubir` existe, sube en el
 * acto; si no, junta los archivos y los devuelve con `alElegir` para que
 * quien la usa decida cuándo subirlos.
 */
export function CajaDeDocumentos({
  alElegir,
  alSubir,
  compacta = false,
  texto = 'Arrastra aquí el contrato, la solicitud, los informes… o haz clic para elegirlos',
  deshabilitada = false,
}: {
  alElegir?: (archivos: File[]) => void;
  alSubir?: (subidos: ArchivoSubido[]) => void | Promise<void>;
  compacta?: boolean;
  texto?: string;
  deshabilitada?: boolean;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const onDrop = useCallback(
    async (aceptados: File[], rechazados: Array<{ file: File }>) => {
      if (rechazados.length)
        toast.error(`${rechazados.map((r) => r.file.name).join(', ')}: solo PDF o Word (.docx) de hasta ${formatBytes(MAXIMO)}.`);
      if (!aceptados.length) return;
      if (alElegir) alElegir(aceptados);
      if (alSubir) {
        setSubiendo(true);
        try {
          await alSubir(await subirArchivos(aceptados));
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setSubiendo(false);
        }
      }
    },
    [alElegir, alSubir],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: TIPOS,
    maxSize: MAXIMO,
    multiple: true,
    disabled: subiendo || deshabilitada,
  });
  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed transition-colors',
        compacta ? 'px-3 py-2.5' : 'px-4 py-4',
        isDragActive
          ? 'border-generar-500 bg-generar-50/70 dark:bg-generar-900/25'
          : 'border-border hover:border-generar-300 dark:hover:border-generar-700',
        (subiendo || deshabilitada) && 'cursor-wait opacity-70',
      )}
    >
      <input {...getInputProps()} aria-label="Adjuntar documentos" />
      {subiendo ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-generar-600" />
      ) : (
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={cn('text-pretty text-muted-foreground', compacta ? 'text-[12px]' : 'text-[13px]')}>
        {subiendo ? 'Subiendo…' : texto}
        {!compacta && <span className="block text-[11.5px] text-muted-foreground/80">PDF o Word (.docx). También escaneos.</span>}
      </span>
    </div>
  );
}

/** La lista de archivos elegidos antes de subirlos. */
export function ArchivosElegidos({ archivos, quitar }: { archivos: File[]; quitar: (i: number) => void }) {
  if (!archivos.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {archivos.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px]"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-generar-600" />
          <span className="truncate">{f.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatBytes(f.size)}</span>
          <button
            type="button"
            onClick={() => quitar(i)}
            className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={`Quitar ${f.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
