-- ════════════════════════════════════════════════════════════════════
-- LexIA v2 — Etapa 31: Subtipos jerárquicos del Generador de
-- Requerimiento. Feedback César 02/07/2026.
-- ════════════════════════════════════════════════════════════════════
-- El "objeto" contractual (bien | servicio | obra | consultoria_obra)
-- resultó demasiado plano para el uso real. La OECE distingue entre:
--
--   I.  Contrataciones menores a 8 UIT (3 subtipos)
--   II. Procedimientos de Selección (13 subtipos agrupados en 4
--       categorías: Bienes, Servicios, Consultoría de Obras, Ejecución
--       de Obras)
--
-- Los subtipos son los que determinan el prompt de la IA (RNP, Ficha
-- Técnica de Perú Compras, Gestión de Instalaciones, Diseño y
-- Construcción, etc.), pero seguimos mapeando cada subtipo a uno de los
-- 4 objetos base para reutilizar el catálogo de cláusulas.
-- ════════════════════════════════════════════════════════════════════

begin;

alter table public.entity_requirements
  add column if not exists regimen text
    check (regimen in ('menor_8uit', 'seleccion')),
  add column if not exists subtipo text;

-- Backfill: filas antiguas se marcan como 'seleccion' (asumimos que
-- todo lo creado hasta hoy fue procedimiento formal, no contratación
-- menor). El subtipo específico se deja NULL para no inventar datos.
update public.entity_requirements
  set regimen = 'seleccion'
  where regimen is null;

commit;
