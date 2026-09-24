/**
 * Lo que hacen las rutas del expediente, en un solo sitio.
 *
 * Todas trabajan con el cliente de la sesión: las políticas RLS hacen
 * que cada usuario solo lea y escriba su propio expediente, y el bucket
 * `uploads` solo le deja leer su carpeta.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DocumentoIlegibleError, extraerTextoDocumento } from '@/lib/ai/texto-documento';
import { CLASES, type Actuacion, type Perfil } from './catalogo';
import { auditarDocumento } from './auditoria';
import { comprenderActuacion, componerAnalisis, interpretarConModelo, prepararCaso } from './diagnostico';
import { documentoEnMarkdown } from './documento';
import { reconstruirFicha } from './ficha';
import { leerDocumento } from './lectura';
import { redactarDocumento } from './redaccion';
import { hoyISO } from './regimen';
import type { ActuacionDelExpediente } from './estado';
import type {
  AnalisisDeActuacion,
  AuditoriaDelDocumento,
  BorradorDeDocumento,
  DocumentoDelExpediente,
  Ficha,
  NivelDeSalida,
  Respuesta,
} from './tipos';

export type Actuacion_ = ActuacionDelExpediente;

export interface Expediente {
  id: string;
  user_id: string;
  titulo: string;
  ficha: Ficha;
  created_at: string;
  updated_at: string;
}

export async function cargarExpediente(supabase: SupabaseClient, id: string) {
  const [{ data: exp }, { data: docs }, { data: acts }] = await Promise.all([
    supabase.from('expedientes').select('*').eq('id', id).maybeSingle(),
    supabase.from('expediente_documentos').select('*').eq('expediente_id', id).order('created_at', { ascending: true }),
    supabase.from('expediente_actuaciones').select('*').eq('expediente_id', id).order('created_at', { ascending: true }),
  ]);
  if (!exp) return null;
  return {
    expediente: exp as Expediente,
    documentos: (docs ?? []) as DocumentoDelExpediente[],
    actuaciones: (acts ?? []) as Actuacion_[],
  };
}

/** Para mandar al navegador: sin el texto completo de cada documento. */
export function sinTexto(d: DocumentoDelExpediente): Omit<DocumentoDelExpediente, 'texto'> & { texto: null; caracteres: number } {
  return { ...d, texto: null, caracteres: d.texto?.length ?? 0 };
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Lee los documentos que falten, de a tres. */
export async function leerPendientes(supabase: SupabaseClient, documentos: DocumentoDelExpediente[], usuario: string) {
  const pendientes = documentos.filter((d) => d.origen === 'cargado' && (d.lectura === 'pendiente' || d.lectura === 'leyendo') && d.ruta);
  const cola = [...pendientes];
  async function trabajador() {
    while (cola.length) {
      const d = cola.shift()!;
      await supabase.from('expediente_documentos').update({ lectura: 'leyendo', error: null }).eq('id', d.id);
      try {
        const { data, error } = await supabase.storage.from('uploads').download(d.ruta!);
        if (error || !data) throw new Error(`No se pudo descargar: ${error?.message ?? 'sin datos'}`);
        const ext = d.nombre.toLowerCase().split('.').pop() ?? '';
        const archivo = new File([await data.arrayBuffer()], d.nombre, { type: MIME[ext] ?? data.type });
        const { texto, paginas } = await extraerTextoDocumento(archivo, { ocr: true, nombre: d.nombre });
        const lectura = await leerDocumento(d.nombre, texto, usuario);
        const cambios = {
          lectura: 'leido' as const,
          texto,
          paginas: paginas ?? null,
          datos: lectura,
          // La carpeta la decide la clase, salvo que el usuario ya la movió.
          clase: d.clase ?? lectura.clase,
          carpeta: d.carpeta ?? CLASES[d.clase ?? lectura.clase].carpeta,
        };
        await supabase.from('expediente_documentos').update(cambios).eq('id', d.id);
        Object.assign(d, cambios);
      } catch (e) {
        const msg =
          e instanceof DocumentoIlegibleError ? `${e.message} ${e.sugerencia}` : `No se pudo leer el documento: ${(e as Error).message}`;
        await supabase.from('expediente_documentos').update({ lectura: 'error', error: msg }).eq('id', d.id);
        Object.assign(d, { lectura: 'error', error: msg });
      }
    }
  }
  await Promise.all([trabajador(), trabajador(), trabajador()]);
}

export async function analizar(
  supabase: SupabaseClient,
  expedienteId: string,
  actuacionId: string,
  usuario: string,
  cambiarA?: Actuacion | null,
): Promise<Actuacion_> {
  const cargado = await cargarExpediente(supabase, expedienteId);
  if (!cargado) throw new Error('Expediente no encontrado');
  const act = cargado.actuaciones.find((a) => a.id === actuacionId);
  if (!act) throw new Error('Actuación no encontrada');
  await supabase.from('expediente_actuaciones').update({ estado: 'analizando', error: null }).eq('id', act.id);
  try {
    await leerPendientes(supabase, cargado.documentos, usuario);
    let actuacion = cambiarA ?? act.actuacion ?? act.analisis?.actuacion ?? null;
    let pedida: Actuacion | null = cambiarA ?? act.actuacion;
    if (!actuacion) {
      actuacion = (await comprenderActuacion({ perfil: act.perfil, pedido: act.pedido, documentos: cargado.documentos }, usuario)).actuacion;
      pedida = null;
    }
    const caso = prepararCaso({
      perfil: act.perfil,
      actuacion,
      actuacionPedida: pedida,
      pedido: act.pedido,
      documentos: cargado.documentos,
      fichaUsuario: cargado.expediente.ficha ?? {},
      respuestas: act.respuestas ?? [],
      hoy: hoyISO(),
    });
    const { lectura, sustento } = await interpretarConModelo(supabase, caso, usuario);
    const analisis = componerAnalisis(caso, lectura, sustento);
    const cambios = {
      estado: 'listo' as const,
      analisis,
      actuacion: cambiarA ?? act.actuacion,
      updated_at: new Date().toISOString(),
    };
    await supabase.from('expediente_actuaciones').update(cambios).eq('id', act.id);
    await supabase.from('expedientes').update({ updated_at: new Date().toISOString() }).eq('id', expedienteId);
    return { ...act, ...cambios };
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from('expediente_actuaciones').update({ estado: 'error', error: msg }).eq('id', act.id);
    throw e;
  }
}

export async function redactar(
  supabase: SupabaseClient,
  expedienteId: string,
  actuacionId: string,
  nivel: NivelDeSalida,
  usuario: { id: string; nombre: string },
): Promise<Actuacion_> {
  const cargado = await cargarExpediente(supabase, expedienteId);
  if (!cargado) throw new Error('Expediente no encontrado');
  const act = cargado.actuaciones.find((a) => a.id === actuacionId);
  if (!act?.analisis) throw new Error('Primero hay que analizar el caso');
  if (!act.analisis.nivelesPermitidos.includes(nivel)) throw new Error('El expediente no alcanza ese nivel de salida');
  await supabase.from('expediente_actuaciones').update({ estado: 'redactando', error: null }).eq('id', act.id);
  try {
    const { ficha } = reconstruirFicha(cargado.documentos, cargado.expediente.ficha ?? {});
    const version = (act.borrador?.version ?? 0) + 1;
    const borrador = await redactarDocumento({
      perfil: act.perfil,
      nivel,
      analisis: act.analisis,
      ficha,
      documentos: cargado.documentos,
      pedido: act.pedido,
      respuestas: act.respuestas ?? [],
      version,
      usuario: usuario.id,
    });
    const auditoria = await auditarBorrador(cargado, act, borrador, ficha, usuario.id);

    // El documento de LexIA entra al expediente, en la carpeta 11, como
    // borrador: no es un documento oficial.
    const generacion = {
      fecha: borrador.generadoEn,
      usuario: usuario.nombre,
      perfil: act.perfil,
      actuacion: act.analisis.actuacion,
      fuentes: cargado.documentos.filter((d) => d.origen === 'cargado' && d.lectura === 'leido').map((d) => d.nombre),
      version,
      nivel,
    };
    const clase =
      borrador.tipo === 'informe_tecnico'
        ? 'informe_area_usuaria'
        : borrador.tipo === 'informe_dec'
          ? 'informe_dec'
          : borrador.tipo === 'informe_legal'
            ? 'informe_legal'
            : borrador.tipo === 'informe_supervisor'
              ? 'informe_supervisor'
              : borrador.tipo === 'resolucion'
                ? 'resolucion'
                : borrador.tipo === 'carta'
                  ? act.perfil === 'contratista'
                    ? 'solicitud_contratista'
                    : 'carta_entidad'
                  : borrador.tipo === 'acta'
                    ? /reinicio/i.test(act.respuestas?.find((r) => r.preguntaId === 'suspension_o_reinicio')?.respuesta ?? '')
                      ? 'acta_reinicio'
                      : 'acta_suspension'
                    : borrador.tipo === 'adenda'
                      ? 'adenda'
                      : 'otro';
    const existente = cargado.documentos.find((d) => d.origen === 'lexia' && d.actuacion_id === act.id);
    const fila = {
      nombre: `${borrador.titulo} (v${version})`,
      origen: 'lexia',
      estado: 'generado',
      carpeta: 11,
      clase,
      lectura: 'leido',
      generacion,
      actuacion_id: act.id,
    };
    let documentoId = existente?.id;
    if (existente) {
      await supabase.from('expediente_documentos').update(fila).eq('id', existente.id);
    } else {
      const { data } = await supabase
        .from('expediente_documentos')
        .insert({ ...fila, expediente_id: expedienteId, user_id: usuario.id })
        .select('id')
        .single();
      documentoId = (data as { id: string } | null)?.id;
    }
    borrador.documentoId = documentoId;
    const cambios = { estado: 'listo' as const, borrador, auditoria, updated_at: new Date().toISOString() };
    await supabase.from('expediente_actuaciones').update(cambios).eq('id', act.id);
    await supabase.from('expedientes').update({ updated_at: new Date().toISOString() }).eq('id', expedienteId);
    return { ...act, ...cambios };
  } catch (e) {
    await supabase.from('expediente_actuaciones').update({ estado: 'listo', error: (e as Error).message }).eq('id', act.id);
    throw e;
  }
}

async function auditarBorrador(
  cargado: NonNullable<Awaited<ReturnType<typeof cargarExpediente>>>,
  act: Actuacion_,
  borrador: BorradorDeDocumento,
  ficha: Ficha,
  usuario: string,
): Promise<AuditoriaDelDocumento> {
  const texto = documentoEnMarkdown({ borrador, perfil: act.perfil, ficha, anio: Number(hoyISO().slice(0, 4)) });
  return auditarDocumento({
    texto,
    analisis: act.analisis!,
    ficha,
    documentos: cargado.documentos,
    respuestas: act.respuestas ?? [],
    pedido: act.pedido,
    perfil: act.perfil,
    hoy: hoyISO(),
    version: borrador.version,
    usuario,
  });
}

export async function reauditar(supabase: SupabaseClient, expedienteId: string, actuacionId: string, usuario: string) {
  const cargado = await cargarExpediente(supabase, expedienteId);
  if (!cargado) throw new Error('Expediente no encontrado');
  const act = cargado.actuaciones.find((a) => a.id === actuacionId);
  if (!act?.borrador || !act.analisis) throw new Error('No hay documento que auditar');
  const { ficha } = reconstruirFicha(cargado.documentos, cargado.expediente.ficha ?? {});
  const auditoria = await auditarBorrador(cargado, act, act.borrador, ficha, usuario);
  await supabase.from('expediente_actuaciones').update({ auditoria, updated_at: new Date().toISOString() }).eq('id', act.id);
  return { ...act, auditoria };
}
