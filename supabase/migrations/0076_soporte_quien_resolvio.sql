-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 76: quién marcó resuelta una conversación de soporte
-- ════════════════════════════════════════════════════════════════════
-- 30/09/2026: el ticket #26 pasó de «respondido» a «resuelto» segundos
-- después de la respuesta del equipo y no había forma de saber si lo
-- resolvió el usuario o el equipo. Desde ahora queda anotado quién lo
-- hizo, lo pone la base (no el navegador) y nadie puede cambiarlo a mano.
-- ════════════════════════════════════════════════════════════════════

alter table public.soporte_tickets
  add column if not exists resuelto_por uuid references auth.users(id) on delete set null;

create or replace function public.soporte_tickets_fechas()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.estado = 'resuelto' and old.estado <> 'resuelto' then
    new.resuelto_at := now();
    new.resuelto_por := auth.uid();
  elsif new.estado <> 'resuelto' then
    new.resuelto_at := null;
    new.resuelto_por := null;
    new.calificacion := null;
  else
    -- Sigue resuelto: quién y cuándo no se reescriben.
    new.resuelto_at := old.resuelto_at;
    new.resuelto_por := old.resuelto_por;
  end if;
  return new;
end;
$$;
