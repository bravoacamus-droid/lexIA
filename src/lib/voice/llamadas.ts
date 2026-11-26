import type { SupabaseClient } from '@supabase/supabase-js';
import { usarHerramienta } from '@/lib/billing/creditos';

/**
 * Cierre y cobro de las llamadas de voz, del lado del servidor.
 *
 * POR QUÉ
 *
 * Hasta noviembre de 2026 el navegador decía cuánto había durado la
 * llamada y si había terminado bien, y solo se cobraba si mandaba
 * `completed` con una duración: colgar con `failed`, o no colgar, salía
 * gratis (auditoría del 26/11/2026, S4). Ahora la duración la mide el
 * servidor desde `started_at` (que se fija al entregar el token de la
 * sesión, ver `session-config`) y el cierre es condicional: dos cierres a
 * la vez no cobran dos veces.
 */

export interface LlamadaAbierta {
  id: string;
  user_id: string;
  started_at: string;
}

/** Una llamada que falla en sus primeros segundos no llegó a ser llamada: no se cobra. */
const GRACIA_SEGUNDOS = 30;

/**
 * Lo que dura como máximo una sesión: el token efímero vence a las dos
 * horas (`session-config`). Más allá, la conexión ya no existe.
 */
export const DURACION_MAXIMA_SEGUNDOS = 2 * 3600;

/**
 * Costo estimado en USD (precios de Gemini Live, junio 2026): audio de
 * entrada $0.005/min y de salida $0.018/min, suponiendo que el usuario
 * habla el 40 % del tiempo.
 */
export function costoEstimadoUSD(segundos: number): number {
  const minutos = segundos / 60;
  return parseFloat((minutos * 0.4 * 0.005 + minutos * 0.6 * 0.018).toFixed(6));
}

/**
 * Cierra una llamada abierta y cobra sus minutos.
 *
 * `fin`: cuándo terminó. Si no se sabe (la pestaña se cerró sin colgar),
 * se estima por el último turno de la transcripción.
 */
export async function cerrarLlamada(
  admin: SupabaseClient,
  llamada: LlamadaAbierta,
  opciones: { estado: 'completed' | 'failed'; fin?: Date },
): Promise<{ cerrada: boolean; segundos: number; minutosCobrados: number }> {
  const inicio = new Date(llamada.started_at).getTime();
  let segundos: number;
  if (opciones.fin) {
    segundos = Math.round((opciones.fin.getTime() - inicio) / 1000);
  } else {
    const { data: ultimo } = await admin
      .from('voice_call_transcripts')
      .select('timestamp_seconds')
      .eq('call_id', llamada.id)
      .order('timestamp_seconds', { ascending: false })
      .limit(1)
      .maybeSingle();
    const ts = (ultimo as { timestamp_seconds?: number } | null)?.timestamp_seconds;
    // Sin turnos no hubo conversación; con turnos, el último más lo que
    // tarda en decirse una respuesta.
    segundos = typeof ts === 'number' ? Math.round(ts) + 30 : 0;
  }
  segundos = Math.min(Math.max(0, segundos), DURACION_MAXIMA_SEGUNDOS);

  const { data: cerradas } = await admin
    .from('voice_calls')
    .update({
      status: opciones.estado,
      ended_at: (opciones.fin ?? new Date()).toISOString(),
      duration_seconds: segundos,
      cost_usd: segundos > 0 ? costoEstimadoUSD(segundos) : null,
    } as never)
    .eq('id', llamada.id)
    .eq('status', 'active')
    .select('id');
  if (!cerradas || cerradas.length === 0) return { cerrada: false, segundos, minutosCobrados: 0 };

  const cobrar = segundos > 0 && (opciones.estado === 'completed' || segundos >= GRACIA_SEGUNDOS);
  if (!cobrar) return { cerrada: true, segundos, minutosCobrados: 0 };

  // Hacia arriba: de 0:01 a 0:59 es un minuto.
  const minutos = Math.ceil(segundos / 60);
  // Con await: en Vercel lo que queda pendiente tras responder se corta.
  const uso = await usarHerramienta(llamada.user_id, 'consulta_voz', { unidades: minutos, detalle: `${minutos} min` });
  if (uso.ok) return { cerrada: true, segundos, minutosCobrados: minutos };
  // Si la llamada fue más larga que el saldo, se cobra lo que quedaba: la
  // conversación ya ocurrió y no puede quedar gratis.
  if (uso.body.error === 'sin_creditos' && (uso.body.disponibles ?? 0) > 0) {
    await usarHerramienta(llamada.user_id, 'consulta_voz', {
      creditos: uso.body.disponibles,
      detalle: `${minutos} min (saldo insuficiente)`,
    });
  }
  return { cerrada: true, segundos, minutosCobrados: minutos };
}

/**
 * Cierra las llamadas que siguen «en curso» sin que nadie colgara (se
 * cerró la pestaña, se cayó la red), cobrando hasta su último turno. Con
 * `antesDe`, solo las que empezaron antes; sin él, todas las del usuario
 * (al abrir una nueva: una persona no sostiene dos llamadas a la vez).
 */
export async function cerrarLlamadasAbiertas(
  admin: SupabaseClient,
  filtro: { userId?: string; antesDe?: Date },
): Promise<number> {
  let consulta = admin.from('voice_calls').select('id, user_id, started_at').eq('status', 'active').limit(200);
  if (filtro.userId) consulta = consulta.eq('user_id', filtro.userId);
  if (filtro.antesDe) consulta = consulta.lt('started_at', filtro.antesDe.toISOString());
  const { data } = await consulta;
  let n = 0;
  for (const llamada of (data || []) as LlamadaAbierta[]) {
    const r = await cerrarLlamada(admin, llamada, { estado: 'failed' });
    if (r.cerrada) n++;
  }
  return n;
}
