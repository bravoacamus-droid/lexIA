-- ════════════════════════════════════════════════════════════════════
-- A-LexIA — Etapa 64: los avisos del auditor de citas
-- ════════════════════════════════════════════════════════════════════
-- POR QUÉ
--
-- Al redactar, A-LexIA cita normas, y hay que comprobarlas después. En la
-- primera prueba del pliego, el escrito atribuyó el principio de libertad
-- de concurrencia al «artículo 2 de la Ley de Contrataciones del Estado»:
-- el régimen derogado, copiado de las resoluciones del Tribunal que
-- llenan la biblioteca y que citan la ley vieja con razón, porque
-- resuelven casos de entonces. El prompt ya lo prohibía; no bastó.
--
-- Se comprueba cada cita contra el sustento que se consultó y contra la
-- biblioteca, y lo que no cuadra se guarda aquí.
--
-- No se borra la cita: un escrito que va a una entidad no puede llevar
-- un texto recortado por un programa sin que nadie lo vea. Se marca, la
-- fila pasa a «Requieren revisión» y lo mira un abogado.
--
-- Forma: [{ "cita": "Ley N° 29990", "motivo": "no está en la biblioteca…" }]
--
-- RLS: la columna entra en `entradas_consulta`, que ya tiene sus
-- políticas de la etapa 62. Añadir una columna no las cambia.
-- ════════════════════════════════════════════════════════════════════

alter table public.entradas_consulta
  add column if not exists avisos_formulacion jsonb not null default '[]'::jsonb,
  add column if not exists avisos_absolucion  jsonb not null default '[]'::jsonb;

comment on column public.entradas_consulta.avisos_formulacion is
  'Citas dudosas del escrito del participante, según el auditor de citas.';
comment on column public.entradas_consulta.avisos_absolucion is
  'Citas dudosas de la absolución del comité, según el auditor de citas.';
