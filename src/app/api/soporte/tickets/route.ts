import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { COLUMNAS_DE_TICKET, comoResumen, esAdmin, leerMensaje, type FilaDeTicket } from '@/lib/soporte/servidor';
import { asuntoDesde, CATEGORIAS, type CategoriaDeTicket } from '@/lib/soporte/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/soporte/tickets — los tickets propios, del más reciente al
 * más antiguo. Con `?resumen=1` devuelve solo cuántos tienen respuesta
 * sin leer (el globo del botón «Ayuda») y, para el equipo, cuántos
 * esperan respuesta.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('soporte_tickets')
    .select(COLUMNAS_DE_TICKET)
    .eq('user_id', user.id)
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(50);
  const tickets = ((data || []) as FilaDeTicket[]).map((t) => comoResumen(t, false));

  if (new URL(req.url).searchParams.get('resumen') === '1') {
    let porAtender: number | null = null;
    if (await esAdmin(supabase, user.id)) {
      const { count } = await supabase
        .from('soporte_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'abierto')
        .neq('user_id', user.id);
      porAtender = count ?? 0;
    }
    return NextResponse.json({ sin_leer: tickets.filter((t) => t.sin_leer).length, por_atender: porAtender });
  }
  return NextResponse.json({ tickets });
}

/**
 * POST /api/soporte/tickets — abre una conversación. Formulario:
 * categoria, cuerpo, adjunto (opcional), pagina, contexto (JSON).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const categoria = String(form.get('categoria') || 'consulta') as CategoriaDeTicket;
  if (!(categoria in CATEGORIAS)) return NextResponse.json({ error: 'Categoría no válida.' }, { status: 400 });

  // Un tope sencillo contra envíos repetidos: 10 conversaciones por hora.
  const { count } = await supabase
    .from('soporte_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Abriste muchas conversaciones en la última hora. Continúa en una de ellas o escríbenos por WhatsApp.' },
      { status: 429 },
    );
  }

  let contexto: unknown = {};
  try {
    contexto = JSON.parse(String(form.get('contexto') || '{}'));
  } catch {
    contexto = {};
  }

  // Primero el mensaje (y su adjunto): si no cumple, no queda una
  // conversación vacía, que el usuario tampoco podría borrar.
  const id = randomUUID();
  const mensaje = await leerMensaje(form, user.id, id);
  if ('error' in mensaje) return NextResponse.json({ error: mensaje.error }, { status: 400 });

  const { error } = await supabase.from('soporte_tickets').insert({
    id,
    user_id: user.id,
    asunto: asuntoDesde(mensaje.cuerpo, categoria),
    categoria,
    pagina: String(form.get('pagina') || '').slice(0, 500) || null,
    contexto: contextoLimpio(contexto),
  });
  if (error) return NextResponse.json({ error: 'No se pudo abrir la conversación.' }, { status: 500 });

  const { error: errorMensaje } = await supabase
    .from('soporte_mensajes')
    .insert({ ticket_id: id, autor_id: user.id, ...mensaje });
  if (errorMensaje) return NextResponse.json({ error: 'No se pudo enviar el mensaje.' }, { status: 500 });

  return NextResponse.json({ id });
}

/**
 * El contexto lo arma el navegador (página, pantalla, errores recientes):
 * se aceptan solo textos, números y listas de textos, recortados, para
 * que nadie guarde aquí lo que quiera.
 */
function contextoLimpio(crudo: unknown): Record<string, unknown> {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return {};
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(crudo).slice(0, 15)) {
    const k = clave.slice(0, 40);
    if (typeof valor === 'string') limpio[k] = valor.slice(0, 500);
    else if (typeof valor === 'number' || typeof valor === 'boolean') limpio[k] = valor;
    else if (Array.isArray(valor)) limpio[k] = valor.filter((v) => typeof v === 'string').slice(0, 8).map((v: string) => v.slice(0, 300));
  }
  return limpio;
}
