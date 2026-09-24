-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 71: no volver a traer lo que ya se subió a mano
-- ════════════════════════════════════════════════════════════════════
-- Documentos que se cargaron a mano sin URL de origen (el Código de
-- Ética, directivas de la carpeta del cliente) no se reconocen por URL
-- ni por número: el actualizador los volvía a traer como nuevos (pasó el
-- 24/09/2026 con el Código de Ética). Antes de vectorizar, el ingestor
-- pregunta si ya hay un documento del mismo tipo con el mismo texto.
--
-- Solo para los tipos pequeños (directivas, lineamientos, códigos…): en
-- las resoluciones, opiniones y pronunciamientos, que son decenas de
-- miles, bastan la URL de la ficha y el número normalizado, y calcular el
-- hash de todos sus textos sería caro. La función lo rechaza por su
-- cuenta para esos tipos.
--
-- Solo la usa el servidor (clave de servicio): no se expone a usuarios.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.documento_con_el_mismo_texto(p_type text, p_md5 text)
returns uuid
language sql
stable
set search_path = public
as $$
  select id
    from public.normative_documents
   where type = p_type
     and p_type not in ('resolucion_tce', 'opinion', 'pronunciamiento')
     and md5(raw_text) = p_md5
   limit 1
$$;

revoke all on function public.documento_con_el_mismo_texto(text, text) from public, anon, authenticated;
grant execute on function public.documento_con_el_mismo_texto(text, text) to service_role;
