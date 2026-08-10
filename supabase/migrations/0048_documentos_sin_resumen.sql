-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 48: traer solo el texto que el resumen necesita
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (10/08/2026): la generación por lotes avanzaba a 15 documentos
-- cada 10 minutos, cuando la muestra había medido 1.7 s por documento.
--
-- CAUSA: el lote pedía raw_text COMPLETO de 200 documentos. Ese campo
-- llega a 567 mil caracteres en la Ley, 345 mil en resoluciones
-- directorales y 214 mil en bases estándar, así que cada lote arrastraba
-- decenas de megabytes por la red antes de generar nada.
--
-- Y era desperdicio puro: el generador trunca a 24,000 caracteres antes
-- de enviar el texto al modelo. Todo lo demás viajaba para ser
-- descartado.
--
-- SOLUCIÓN: recortar en el servidor. La función devuelve los documentos
-- pendientes con el texto ya truncado, así que por la red viaja como
-- mucho lo que el modelo va a leer.
--
-- No es SECURITY DEFINER: se ejecuta con los permisos de quien llama y
-- las políticas RLS de normative_documents siguen aplicando.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.documentos_sin_resumen(
  limite integer default 200,
  excluir_tce boolean default false,
  max_chars integer default 24000
)
returns table (
  id uuid,
  type text,
  number text,
  title text,
  texto text
)
language sql
stable
as $$
  select
    d.id,
    d.type,
    d.number,
    d.title,
    left(d.raw_text, max_chars) as texto
  from public.normative_documents d
  where d.ai_summary is null
    and d.raw_text is not null
    and (not excluir_tce or d.type <> 'resolucion_tce')
  -- La normativa primero: si la corrida se corta, lo más consultado ya
  -- tiene resumen. 'resolucion_tce' queda al final por orden alfabético
  -- inverso de la comparación.
  order by (d.type = 'resolucion_tce'), d.type
  limit limite;
$$;

grant execute on function public.documentos_sin_resumen(integer, boolean, integer)
  to anon, authenticated, service_role;
