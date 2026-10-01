-- La evaluación por etapas avanza por pasos y guarda lo hecho.
--
-- Una oferta escaneada de 140 páginas son diez tramos de transcripción;
-- dos ofertas así, uno tras otro, pasaban de los trece minutos que una
-- función puede durar. Vercel la cortaba, la fila se quedaba en
-- «processing» para siempre y al recargar no había nada que retomar
-- (César, 30/09/2026).
--
--   progreso          lo hecho hasta ahora: textos leídos, tramos
--                     transcritos, lectura de las Bases y etapas de cada
--                     postor. Con eso, la vuelta siguiente sigue donde
--                     quedó la anterior.
--   corriendo_hasta   el turno: quien lo tiene trabaja; si muere sin
--                     soltarlo, vence solo y otra vuelta lo toma.
--   bases_partes      las Bases, cuando el navegador tuvo que partir el
--                     PDF para subirlo (Storage no acepta más de 50 MB).

alter table public.evaluations
  add column if not exists progreso jsonb,
  add column if not exists corriendo_hasta timestamptz,
  add column if not exists bases_partes jsonb;

-- Tomar el turno sin carreras: dos pestañas, o una pestaña y la vuelta
-- que se encadena sola, no pueden evaluar a la vez la misma fila.
create or replace function public.tomar_turno_evaluacion(p_id uuid, p_segundos int)
returns boolean
language sql
security definer
set search_path = public
as $$
  with tomada as (
    update public.evaluations
       set corriendo_hasta = now() + make_interval(secs => p_segundos)
     where id = p_id
       and (corriendo_hasta is null or corriendo_hasta < now())
    returning 1
  )
  select exists (select 1 from tomada);
$$;

revoke all on function public.tomar_turno_evaluacion(uuid, int) from public, anon, authenticated;
grant execute on function public.tomar_turno_evaluacion(uuid, int) to service_role;
