-- ════════════════════════════════════════════════════════════════════
-- 0091 · Los requerimientos los crea el servidor (cobro de créditos)
--
-- Crear un requerimiento es lo que se cobra (40 créditos); generarlo,
-- redactarlo y revisarlo después ya está pagado. Con `for all`, el
-- usuario podía insertar la fila desde el navegador con la anon key,
-- saltándose el cobro, y luego usar gratis las rutas de IA sobre ella.
-- También podía cambiar `plantilla_id` o `regimen` de un requerimiento
-- de contrato menor (plan Consulta) a uno de procedimiento de selección
-- (desde Profesional).
--
-- Ahora: el servidor inserta (con service role, después de cobrar); el
-- usuario sigue leyendo, editando sus respuestas y borrando lo suyo.
--
-- APLICAR DESPUÉS DE DESPLEGAR el código que crea estas filas (y los
-- mensajes del generador) con `createAdminClient()` (api/generadores/
-- requerimientos, api/requerimientos, api/generator-chat): el anterior
-- insertaba con la sesión del usuario.
--
-- OJO: los permisos de UPDATE son por columna y no se heredan. Una
-- columna nueva que la pantalla deba editar necesita su grant.
-- ════════════════════════════════════════════════════════════════════

-- ── requerimientos_plantilla (generador con las plantillas de César) ─
revoke insert, update on public.requerimientos_plantilla from anon, authenticated;
grant update (denominacion, cuantia, monto_contrato, respuestas, status, updated_at)
  on public.requerimientos_plantilla to authenticated;

-- ── entity_requirements (generador anterior, de cláusulas) ───────────
revoke insert, update on public.entity_requirements from anon, authenticated;
grant update (
  nro, anio, objeto, area_usuaria, denominacion, organo_unidad_organica,
  actividad_poi, clauses, entregas, items, status, updated_at
) on public.entity_requirements to authenticated;

-- ── generator_messages: el precio sale de lo que A-LexIA ya entregó ──
-- El primer documento de una conversación cuesta 20 créditos y cada
-- repregunta 1. El servidor cuenta las respuestas guardadas; si el
-- usuario pudiera insertar mensajes, con una respuesta falsa cada
-- documento nuevo le costaría 1. Los guarda /api/generator-chat con
-- service role. Borrar sigue permitido (borrar no abarata nada).
revoke insert, update on public.generator_messages from anon, authenticated;
