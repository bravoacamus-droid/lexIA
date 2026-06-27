'use client';

/**
 * GeneratorFormV2 — refactor del flujo de generadores pedido por César
 * en la reunión del 26/06/2026.
 *
 * Cambios respecto al SelectionGeneratorForm anterior:
 *
 * 1. Quitamos los campos burocráticos (postor, RUC, representante).
 *    El usuario solo carga sus documentos del caso y el LLM redacta
 *    en general. Esos datos se rellenan en Word después si el usuario
 *    quiere personalizar.
 *
 * 2. Multi-documento: el usuario puede subir hasta 5 PDFs del caso
 *    (Bases + Consultas + Adendas, por ejemplo). Internamente se
 *    concatenan y se pasan al LLM como contexto.
 *
 * 3. Panel "Qué evaluará LexIA": muestra explícitamente los criterios
 *    que el sistema aplica de forma automática. El usuario no tiene
 *    que escribir prompts — el sistema ya sabe qué buscar.
 *
 * 4. Campo opcional "Algo específico que quieras enfatizar": para
 *    refinar si el usuario lo desea. Ejemplos visibles.
 *
 * 5. Aviso explícito: "Las fuentes normativas (Ley 32069, Reglamento,
 *    opiniones, pronunciamientos) ya están cargadas en LexIA. No
 *    necesitas subirlas."
 */

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
  CheckCircle2,
  BookOpen,
  PlusCircle,
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
import {
  getCriteriaFor,
  type GeneratorCriteria,
} from '@/lib/generators/criteria-display';

export type AnyGeneratorSlug =
  | 'consultas_observaciones'
  | 'pliego_absolucion'
  | 'bases_estandar'
  | 'apelaciones'
  | 'armado_oferta'
  | 'tdr_eett'
  | 'estrategia_contratacion'
  | 'cambio_personal_clave'
  | 'resolucion_contrato'
  | 'cambio_bienes'
  | 'descargo_penalidades'
  | 'solicitud_sancion'
  | 'rnp_aumento_cmc'
  | 'rnp_actualizacion_financiera';

interface Props {
  slug: AnyGeneratorSlug;
  /** Endpoint del backend que recibe la generación. */
  endpoint?: string;
  pageTitle: string;
  pageDescription: string;
  /** Si true, muestra un selector de tipo de objeto (Bienes/Servicios/Obras/...). */
  showObjectType?: boolean;
  /** Mínimo de PDFs requeridos. 0 = opcional. */
  minDocuments?: number;
  /** Máximo permitido. */
  maxDocuments?: number;
}

const OBJECT_OPTIONS: Array<{ value: ProcurementObject; label: string }> = [
  { value: 'bienes', label: 'Bienes' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'obras', label: 'Obras' },
  { value: 'consultoria_obras', label: 'Consultoría de obras' },
  { value: 'consultoria_general', label: 'Consultoría general' },
  { value: 'mixto', label: 'Mixto / Otro' },
];

interface UploadedDoc {
  name: string;
  size: number;
  pages: number;
  text: string; // texto extraído
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export function GeneratorFormV2({
  slug,
  endpoint = '/api/generators/selection',
  pageTitle,
  pageDescription,
  showObjectType = false,
  minDocuments = 1,
  maxDocuments = 5,
}: Props) {
  const router = useRouter();
  const criteria = getCriteriaFor(slug);

  const [title, setTitle] = useState('');
  const [objectType, setObjectType] = useState<ProcurementObject | ''>('');
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function extractPdf(file: File): Promise<UploadedDoc | null> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/generators/extract-pdf', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.error === 'pdf_needs_ocr') {
        toast.error(
          `"${file.name}" está escaneado. Pásalo por OCR antes de subirlo.`,
        );
      } else {
        toast.error(
          `No se pudo procesar "${file.name}": ${json?.detail || res.status}`,
        );
      }
      return null;
    }
    const { text, pages } = (await res.json()) as { text: string; pages: number };
    return {
      name: file.name,
      size: file.size,
      pages,
      text,
    };
  }

  async function onDrop(files: File[]) {
    if (docs.length + files.length > maxDocuments) {
      toast.error(`Máximo ${maxDocuments} documentos.`);
      return;
    }
    setExtracting(true);
    const newDocs: UploadedDoc[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" supera 100 MB.`);
        continue;
      }
      const doc = await extractPdf(f);
      if (doc) newDocs.push(doc);
    }
    setDocs((prev) => [...prev, ...newDocs]);
    setExtracting(false);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: extracting || docs.length >= maxDocuments,
  });

  function removeDoc(idx: number) {
    setDocs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function generate() {
    if (!title.trim() || title.trim().length < 5) {
      toast.error('Pon un nombre/identificación del caso para guardar el documento.');
      return;
    }
    if (showObjectType && !objectType) {
      toast.error('Selecciona el objeto contractual.');
      return;
    }
    if (docs.length < minDocuments) {
      toast.error(
        minDocuments === 1
          ? 'Sube al menos un documento del caso.'
          : `Sube al menos ${minDocuments} documentos del caso.`,
      );
      return;
    }

    setGenerating(true);
    try {
      // Concatenar los documentos con un separador claro para el LLM
      const baseText = docs
        .map(
          (d, i) =>
            `═══════════════════════════════════════\n` +
            `DOCUMENTO ${i + 1}: ${d.name} (${d.pages} páginas)\n` +
            `═══════════════════════════════════════\n\n${d.text}`,
        )
        .join('\n\n');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: title.trim(),
          object_type: objectType || undefined,
          input_data: {
            // Conservamos compatibilidad con endpoint actual
            additional_user_prompt: additionalPrompt.trim() || undefined,
            documents_uploaded: docs.map((d) => ({
              name: d.name,
              pages: d.pages,
            })),
          },
          base_text: baseText.slice(0, 80_000), // límite razonable
          additional_user_prompt: additionalPrompt.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(
          json?.message || json?.detail || json?.error || `HTTP ${res.status}`,
        );
      }
      const json = (await res.json()) as { document_id?: string };
      if (json.document_id) {
        toast.success('Documento generado');
        router.push(`/generador/${json.document_id}`);
      } else {
        toast.success('Documento generado');
      }
    } catch (e) {
      toast.error((e as Error).message.slice(0, 120));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="container max-w-4xl py-6 space-y-5">
      <header>
        <h1 className="font-semibold text-3xl tracking-tight">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          {pageDescription}
        </p>
      </header>

      {/* Aviso clave: las fuentes normativas YA están cargadas */}
      <Card className="p-4 bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-500/30">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
              Las fuentes normativas ya están cargadas
            </p>
            <p className="text-xs text-emerald-900/70 dark:text-emerald-100/80 mt-0.5 leading-relaxed">
              LexIA ya tiene la Ley 32069, su Reglamento DS 009-2025-EF, todas
              las directivas DGA / OECE / Perú Compras, opiniones DTN,
              pronunciamientos y resoluciones del Tribunal. Tú solo subes los
              documentos específicos de tu caso.
            </p>
          </div>
        </div>
      </Card>

      {/* Criterios que LexIA aplica automáticamente */}
      {criteria && (
        <CriteriaPanel criteria={criteria} />
      )}

      <Card className="p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Identificación del caso <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Licitación Pública N° 005-2026-MTC/20 — Boca del Río"
            maxLength={160}
          />
          <p className="text-[11px] text-muted-foreground">
            Solo para identificar este documento en tu historial. LexIA leerá los
            datos específicos directamente del PDF que subas.
          </p>
        </div>

        {showObjectType && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Objeto contractual <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={objectType || undefined}
              onValueChange={(v) => setObjectType(v as ProcurementObject)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el objeto" />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      {/* Multi-doc dropzone */}
      <Card className="p-6 space-y-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documentos del caso{' '}
            <span className="text-rose-500">{minDocuments > 0 && '*'}</span>
          </Label>
          {criteria?.documents_required && criteria.documents_required.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {criteria.documents_required.map((d, i) => (
                <p key={i}>• {d}</p>
              ))}
            </div>
          )}
        </div>

        {docs.length < maxDocuments && (
          <div
            {...getRootProps()}
            className={cn(
              'rounded-xl border-2 border-dashed transition-all cursor-pointer text-center px-6 py-8',
              isDragActive
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40'
                : 'border-border hover:border-brand-400 hover:bg-secondary/30',
              (extracting || docs.length >= maxDocuments) && 'cursor-not-allowed opacity-60',
            )}
          >
            <input {...getInputProps()} />
            {extracting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-brand-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Extrayendo texto del PDF…</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">
                  Arrastra los PDFs o haz click para seleccionar
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Puedes subir hasta {maxDocuments} documentos · máx 100 MB c/u
                </p>
              </>
            )}
          </div>
        )}

        {docs.length > 0 && (
          <div className="space-y-2">
            {docs.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/30 px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(d.size)} · {d.pages} págs · {d.text.length.toLocaleString()} caracteres extraídos
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeDoc(i)}
                  aria-label="Quitar documento"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Prompt opcional del usuario */}
      <Card className="p-6 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" />
            Algo específico que quieras enfatizar (opcional)
          </Label>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            LexIA ya aplica todos los criterios del panel de arriba. Si además
            quieres que enfoque algo puntual de tu caso, descríbelo aquí. Si no,
            déjalo vacío.
          </p>
        </div>

        <Textarea
          value={additionalPrompt}
          onChange={(e) => setAdditionalPrompt(e.target.value.slice(0, 1500))}
          placeholder={
            criteria?.example_additional_prompts?.[0] ||
            'Ej. Pon especial énfasis en la incongruencia entre el cronograma valorizado y el plazo de ejecución.'
          }
          rows={4}
          maxLength={1500}
        />
        <p className="text-[10px] text-right font-mono text-muted-foreground">
          {additionalPrompt.length}/1500
        </p>

        {criteria?.example_additional_prompts && criteria.example_additional_prompts.length > 1 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Ver más ejemplos
            </summary>
            <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
              {criteria.example_additional_prompts.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={generate} loading={generating} size="lg" variant="glow">
          <Sparkles className="h-4 w-4" />
          Generar documento
        </Button>
      </div>
    </div>
  );
}

function CriteriaPanel({ criteria }: { criteria: GeneratorCriteria }) {
  return (
    <Card className="p-5 bg-brand-50/40 dark:bg-brand-950/30 border-brand-500/30">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-brand-900 dark:text-brand-100">
            {criteria.title}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-brand-900/80 dark:text-brand-100/85 leading-relaxed">
            {criteria.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
