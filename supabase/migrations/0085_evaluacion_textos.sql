-- Los textos ya leídos de una evaluación: Bases y ofertas, transcritas
-- cuando venían escaneadas.
--
-- Al terminar, el progreso se reducía a su resumen y los textos se
-- perdían. Hacen falta después: la segunda evaluación (subsanación,
-- rechazo, negociación; documento 13 de César, 10/10/2026) no vuelve a
-- evaluar las ofertas pero sí puede necesitar citarlas, y para revisar
-- por qué una ficha salió como salió hay que poder leer lo que leyó el
-- modelo. Transcribir de nuevo cuesta minutos y no da el mismo texto.
--
-- Va en su propia columna para que la pantalla, que lee el resultado y el
-- resumen del progreso, no arrastre megas de texto. La tabla ya tiene RLS
-- por usuario (solo el dueño la lee).
alter table public.evaluations
  add column if not exists textos jsonb;
