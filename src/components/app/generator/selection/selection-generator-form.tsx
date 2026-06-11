'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatBytes } from '@/lib/utils';
import type { ProcurementObject } from '@/lib/generators/template-loader';

/** Cualquier slug válido del catálogo de generadores. */
export type AnyGeneratorSlug =
  | 'consultas_observaciones'
  | 'pliego_absolucion'
  | 'bases_estandar'
  | 'apelaciones'
  | 'tdr_eett'
  | 'estrategia_contratacion'
  | 'cambio_personal_clave'
  | 'resolucion_contrato'
  | 'cambio_bienes'
  | 'descargo_penalidades'
  | 'solicitud_sancion'
  | 'rnp_aumento_cmc'
  | 'rnp_actualizacion_financiera';

export interface SelectionFormField {
  name: string;
  label: string;
  hint?: string;
  type?: 'text' | 'textarea';
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

interface Props {
  slug: AnyGeneratorSlug;
  /** Endpoint del backend que recibe la generación. Default: /api/generators/selection. */
  endpoint?: string;
  pageTitle: string;
  pageDescription: string;
  pageInfoBullets?: string[];
  /** Si true, muestra un selector de tipo de objeto (Bienes/Servicios/Obras/...). */
  showObjectType?: boolean;
  /** Si true, muestra el dropzone de PDF (para subir Bases o acto impugnado). */
  showPdfUpload?: boolean;
  pdfUploadLabel?: string;
  pdfUploadHint?: string;
  fields: SelectionFormField[];
}

const OBJECT_OPTIONS: Array<{ value: ProcurementObject; label: string }> = [
  { value: 'bienes', label: 'Bienes' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'obras', label: 'Obras' },
  { value: 'consultoria_obras', label: 'Consultoría de obras' },
  { value: 'consultoria_general', label: 'Consultoría general' },
  { value: 'mixto', label: 'Mixto / Otro' },
];

export function SelectionGeneratorForm({
  slug,
  endpoint = '/api/generators/selection',
  pageTitle,
  pageDescription,
  pageInfoBullets,
  showObjectType = false,
  showPdfUpload = false,
  pdfUploadLabel = 'Sube el PDF de las Bases',
  pdfUploadHint = 'Formato PDF · máx 30 MB. Se procesa en memoria y no se guarda.',
  fields,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [objectType, setObjectType] = useState<ProcurementObject | ''>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [pdfFile, setPdfFile] = useState<{ name: string; size: number } | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setField(name: string, value: string) {
    setFormData((p) => ({ ...p, [name]: value }));
  }

  async function handlePdfDrop(files: File[]) {
    const f = files[0];
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) {
      toast.error('Máximo 30 MB');
      return;
    }
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/generators/extract-pdf', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || 'No se pudo extraer');
      }
      setPdfFile({ name: f.name, size: f.size });
      setPdfText(json.text);
      toast.success(`PDF cargado · ${json.pages} páginas`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  const dropzone = useDropzone({
    onDrop: handlePdfDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: extracting || !!pdfFile,
  });

  function clearPdf() {
    setPdfFile(null);
    setPdfText('');
  }

  async function submit() {
    if (!title.trim()) {
      toast.error('Asigna un título al documento');
      return;
    }
    if (showObjectType && !objectType) {
      toast.error('Selecciona el tipo de objeto');
      return;
    }
    for (const f of fields) {
      if (f.required && !formData[f.name]?.trim()) {
        toast.error(`Completa el campo "${f.label}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: title.trim(),
          object_type: objectType || undefined,
          input_data: formData,
          base_text: pdfText || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || 'No se pudo generar');
      }
      toast.success('Documento generado');
      router.push(`/generador/${json.document_id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <header>
        <h1 className="font-semibold text-3xl tracking-tight">{pageTitle}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{pageDescription}</p>
      </header>

      {pageInfoBullets && pageInfoBullets.length > 0 && (
        <Card className="p-5 bg-brand-50/50 dark:bg-brand-950/30 border-brand-100 dark:border-brand-900">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
            <ul className="space-y-1 text-[13px] text-foreground/80">
              {pageInfoBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <Card className="p-7 space-y-5">
        <Field
          label="Título interno del documento"
          hint="Solo para tu organización; no aparece en el documento final."
          required
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Consultas LP 005-2026 PROVIAS — Carretera Tacna Sur"
            maxLength={160}
          />
        </Field>

        {showObjectType && (
          <Field label="Tipo de objeto contractual" required>
            <Select
              value={objectType || undefined}
              onValueChange={(v) => setObjectType(v as ProcurementObject)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {showPdfUpload && (
          <Field label={pdfUploadLabel} hint={pdfUploadHint}>
            {pdfFile ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/30 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{pdfFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(pdfFile.size)} · {pdfText.length.toLocaleString()} chars extraídos
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearPdf}
                  aria-label="Quitar archivo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...dropzone.getRootProps()}
                className={cn(
                  'group flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 cursor-pointer text-center transition-colors',
                  dropzone.isDragActive
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40'
                    : 'border-border hover:border-brand-400 hover:bg-secondary/30',
                  extracting && 'cursor-progress',
                )}
              >
                <input {...dropzone.getInputProps()} />
                {extracting ? (
                  <>
                    <Loader2 className="h-6 w-6 text-brand-600 dark:text-brand-400 animate-spin mb-2" />
                    <p className="text-sm font-medium">Extrayendo texto…</p>
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-2">
                      <Upload className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-medium">Arrastra el PDF o haz click</p>
                  </>
                )}
              </div>
            )}
          </Field>
        )}

        {fields.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            hint={f.hint}
            required={f.required}
          >
            {f.type === 'textarea' ? (
              <Textarea
                value={formData[f.name] || ''}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={f.placeholder}
                rows={f.rows ?? 5}
              />
            ) : (
              <Input
                value={formData[f.name] || ''}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={f.placeholder}
                maxLength={400}
              />
            )}
          </Field>
        ))}

        <div className="flex justify-end pt-2">
          <Button
            onClick={submit}
            loading={submitting}
            size="lg"
            variant="glow"
            disabled={extracting}
          >
            <Sparkles className="h-4 w-4" />
            Generar documento
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
