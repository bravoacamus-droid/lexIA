/**
 * La salud del actualizador, para el panel de administración.
 *
 * El actualizador estuvo diecisiete días sin correr (del 07/09 al
 * 24/09/2026) y nada lo dijo: la biblioteca simplemente dejó de crecer.
 * Y en la primera corrida de prueba del 24/09 falló el cien por ciento
 * de los documentos con la corrida marcada «ok». Este módulo junta lo
 * que un administrador tiene que ver sin buscarlo: si corre, si corre
 * bien, y qué quedó pendiente.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Corre a diario: pasado este tiempo sin corridas, algo lo detuvo. */
export const HORAS_SIN_CORRER_ALARMA = 30;

export type NivelDeSalud = 'ok' | 'atencion' | 'problema';

export interface CorridaResumida {
  id: string;
  fuente: string;
  started_at: string;
  status: string;
  docs_new: number;
  docs_fallidos: number;
  docs_en_espera: number;
  docs_existentes: number;
  docs_omitidos: number;
  error_message: string | null;
}

export interface SaludDelActualizador {
  nivel: NivelDeSalud;
  avisos: string[];
  ultimaCorrida: string | null;
  horasSinCorrer: number | null;
  porFuente: Array<{ fuente: string; ultima: CorridaResumida | null; publicadosDesde: string | null }>;
  corridasConProblemas: CorridaResumida[];
  fallosAgotados: Array<{ url: string; motivo: string; intentos: number; ultimo_intento: string }>;
  fallosEnEspera: number;
  anterioresAlCorte: Array<{ url: string; motivo: string; ultimo_intento: string }>;
}

const MALOS = new Set(['failed', 'con_errores', 'abandonada', 'partial']);

export async function saludDelActualizador(supabase: SupabaseClient): Promise<SaludDelActualizador> {
  const hace7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: fuentes }, { data: corridas }, { data: fallos }] = await Promise.all([
    supabase.from('scraping_sources').select('id, label, active, publicados_desde').order('label'),
    supabase
      .from('scraping_runs')
      .select('id, source_id, started_at, status, docs_new, docs_fallidos, docs_en_espera, docs_existentes, docs_omitidos, error_message')
      .neq('status', 'prueba_invalida')
      .order('started_at', { ascending: false })
      .limit(200),
    supabase.from('scraping_fallos').select('url, motivo, intentos, ultimo_intento, proximo_intento, tipo').order('ultimo_intento', { ascending: false }).limit(500),
  ]);
  const nombre = new Map(((fuentes ?? []) as Array<{ id: string; label: string }>).map((f) => [f.id, f.label]));
  const lista: CorridaResumida[] = ((corridas ?? []) as Array<Omit<CorridaResumida, 'fuente'> & { source_id: string }>).map((c) => ({
    ...c,
    fuente: nombre.get(c.source_id) ?? 'Fuente eliminada',
  }));

  const avisos: string[] = [];
  let nivel: NivelDeSalud = 'ok';
  const subir = (n: NivelDeSalud) => {
    if (n === 'problema' || (n === 'atencion' && nivel === 'ok')) nivel = n;
  };

  const ultima = lista[0]?.started_at ?? null;
  const horas = ultima ? Math.floor((Date.now() - new Date(ultima).getTime()) / 3600000) : null;
  if (horas === null) {
    subir('problema');
    avisos.push('El actualizador no tiene ninguna corrida registrada.');
  } else if (horas > HORAS_SIN_CORRER_ALARMA) {
    subir('problema');
    avisos.push(
      `El actualizador no corre desde hace ${horas} horas (debería correr cada día). Revisa en Vercel: Settings → Cron Jobs, y que CRON_SECRET esté en el entorno de producción.`,
    );
  }

  const activas = ((fuentes ?? []) as Array<{ id: string; label: string; active: boolean; publicados_desde: string | null }>).filter((f) => f.active);
  const porFuente = activas.map((f) => ({
    fuente: f.label,
    ultima: lista.find((c) => c.fuente === f.label) ?? null,
    publicadosDesde: f.publicados_desde,
  }));
  for (const f of porFuente) {
    if (f.ultima && (f.ultima.status === 'failed' || f.ultima.status === 'abandonada')) {
      subir('problema');
      avisos.push(`La última corrida de «${f.fuente}» terminó como ${f.ultima.status === 'failed' ? 'fallida' : 'abandonada'}: ${f.ultima.error_message ?? 'sin detalle'}`);
    } else if (f.ultima && f.ultima.status === 'con_errores') {
      subir('atencion');
      avisos.push(`La última corrida de «${f.fuente}» tuvo ${f.ultima.docs_fallidos} ${f.ultima.docs_fallidos === 1 ? 'documento' : 'documentos'} con error.`);
    }
  }

  const todos = (fallos ?? []) as Array<{ url: string; motivo: string; intentos: number; ultimo_intento: string; proximo_intento: string; tipo: string }>;
  const fallosAgotados = todos.filter((f) => f.tipo === 'fallo' && f.intentos >= 3);
  const fallosEnEspera = todos.filter((f) => f.tipo === 'fallo' && f.intentos < 3).length;
  const anterioresAlCorte = todos.filter((f) => f.tipo === 'anterior_al_corte');
  if (fallosAgotados.length) {
    subir('atencion');
    avisos.push(`${fallosAgotados.length} ${fallosAgotados.length === 1 ? 'documento agotó' : 'documentos agotaron'} sus intentos y ya no se reintentan solos: hay que cargarlos a mano.`);
  }
  if (anterioresAlCorte.length) {
    subir('atencion');
    avisos.push(
      `${anterioresAlCorte.length} ${anterioresAlCorte.length === 1 ? 'documento publicado tiene' : 'documentos publicados tienen'} fecha anterior a la de corte: el actualizador no los trae; hay que cargarlos con la ingesta manual.`,
    );
  }

  return {
    nivel,
    avisos,
    ultimaCorrida: ultima,
    horasSinCorrer: horas,
    porFuente,
    corridasConProblemas: lista.filter((c) => MALOS.has(c.status) && c.started_at >= hace7).slice(0, 20),
    fallosAgotados: fallosAgotados.slice(0, 50),
    fallosEnEspera,
    anterioresAlCorte: anterioresAlCorte.slice(0, 50),
  };
}
