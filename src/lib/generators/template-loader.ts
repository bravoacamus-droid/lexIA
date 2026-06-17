import { createClient } from '@/lib/supabase/server';

export type GeneratorSlug =
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

export type GeneratorAudience = 'entity' | 'provider' | 'consultant';

export type ProcurementObject =
  | 'bienes'
  | 'servicios'
  | 'obras'
  | 'consultoria_obras'
  | 'consultoria_general'
  | 'mixto';

export interface GeneratorTemplate {
  id: string;
  slug: GeneratorSlug;
  audience: GeneratorAudience;
  object_type: ProcurementObject | null;
  label: string;
  source_path: string;
  sample_text: string;
  notes: string | null;
}

/**
 * Recupera las plantillas oficiales asociadas a un generador.
 * Las plantillas se inyectan como few-shot en el prompt para que el LLM
 * reproduzca el estilo, vocabulario y estructura del modelo OECE.
 *
 * Si `objectType` se provee, filtra por tipo de objeto (bienes, obras, etc).
 */
export async function loadTemplates(opts: {
  slug: GeneratorSlug;
  objectType?: ProcurementObject;
  limit?: number;
}): Promise<GeneratorTemplate[]> {
  const supabase = createClient();
  let q = supabase
    .from('generator_templates')
    .select('id, slug, audience, object_type, label, source_path, sample_text, notes')
    .eq('slug', opts.slug)
    .eq('active', true);

  if (opts.objectType) {
    q = q.or(`object_type.eq.${opts.objectType},object_type.is.null`);
  }

  const { data, error } = await q.limit(opts.limit ?? 3);
  if (error) {
    console.error('[template-loader] query falló:', error);
    return [];
  }
  return (data || []) as GeneratorTemplate[];
}

/**
 * Compone los bloques few-shot a partir de las plantillas cargadas, truncando
 * cada uno para no inflar el prompt. Por defecto cap de 3500 chars por template.
 */
export function composeFewShot(
  templates: GeneratorTemplate[],
  maxCharsPerTemplate = 3500,
): string {
  if (templates.length === 0) return '';
  return templates
    .map((t, i) => {
      const text = t.sample_text.slice(0, maxCharsPerTemplate);
      return `MODELO ${i + 1} — ${t.label}\n${'─'.repeat(60)}\n${text}`;
    })
    .join('\n\n');
}
