-- ════════════════════════════════════════════════════════════════════
-- A-LexIA — Etapa 63: el participante y el tema, por solicitud
-- ════════════════════════════════════════════════════════════════════
-- El mockup de la pantalla de absolución (setiembre de 2026) lista las
-- solicitudes con dos columnas que faltaban en el modelo: **quién** la
-- presenta y de **qué tema** trata.
--
-- En la formulación el participante es uno solo —quien escribe— y vive
-- en el encabezado del pliego. En la absolución cada fila viene de un
-- postor distinto, así que ahí el dato es de la fila.
--
-- El tema es el rótulo corto con el que se reconoce la solicitud en la
-- tabla: «Experiencia del postor en la especialidad». No sustituye al
-- escrito; lo encabeza.
-- ════════════════════════════════════════════════════════════════════

alter table public.entradas_consulta
  add column if not exists participante text not null default '',
  add column if not exists tema text not null default '';

comment on column public.entradas_consulta.participante is
  'Quién presenta la solicitud. Solo se usa en la cara de absolución.';
comment on column public.entradas_consulta.tema is
  'Rótulo corto para la tabla: «Experiencia del personal clave».';
