-- ════════════════════════════════════════════════════════════════════
-- 0094 · Régimen y objeto de la evaluación de un requerimiento
--
-- POR QUÉ
--
-- Reunión con César del 27/11/2026: el evaluador de requerimientos
-- revisaba igual un contrato menor (≤ 8 UIT) que un procedimiento de
-- selección. El usuario ya elegía el régimen al subir el documento, pero
-- solo servía para cobrar: no se guardaba ni llegaba al auditor. Ahora se
-- guarda, junto con el objeto (bienes, servicios, consultoría de obras,
-- obras), y el auditor revisa según los dos.
--
-- Las dos columnas las escribe el servidor al crear la evaluación (el
-- navegador no inserta en evaluations desde la 0089). Aditiva: se puede
-- aplicar antes del deploy.
-- ════════════════════════════════════════════════════════════════════

alter table public.evaluations
  add column if not exists regimen text
    check (regimen in ('menor_8uit', 'seleccion')),
  add column if not exists objeto_contratacion text
    check (objeto_contratacion in ('bienes', 'servicios', 'consultoria_obras', 'obras'));

comment on column public.evaluations.regimen is
  'Requerimiento: contrato menor (menor_8uit) o procedimiento de selección. Lo usa el auditor (0094).';
comment on column public.evaluations.objeto_contratacion is
  'Requerimiento: bienes, servicios, consultoria_obras u obras. Lo usa el auditor (0094).';
