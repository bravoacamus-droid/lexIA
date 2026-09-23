/**
 * Lectura y escritura de los pliegos de consultas.
 *
 * Las filas de la base y los tipos del dominio no tienen la misma forma
 * —la base usa `snake_case` y guarda el cuerpo en `jsonb`—, así que la
 * traducción vive aquí y no repartida por cada ruta.
 */
import { createClient } from '@/lib/supabase/server';
import type {
  Absolucion,
  AvisoDeCita,
  Decision,
  Formulacion,
  Pliego,
  TipoFormulacion,
  Tramo,
} from '@/lib/consultas/tipos';

export type CaraDelPliego = 'formulacion' | 'absolucion';

export interface PliegoGuardado extends Pliego {
  id: string;
  cara: CaraDelPliego;
  status: 'draft' | 'listo' | 'presentado';
  basesNombre: string | null;
  actualizado: string;
}

interface FilaPliego {
  id: string;
  cara: CaraDelPliego;
  procedimiento: string;
  numero_procedimiento: string;
  objeto: string;
  participante: string;
  bases_nombre: string | null;
  status: 'draft' | 'listo' | 'presentado';
  updated_at: string;
}

interface FilaEntrada {
  id: string;
  numero: number;
  tipo: TipoFormulacion;
  participante: string;
  tema: string;
  seccion: 'General' | 'Específica';
  numeral: string;
  literal: string;
  pagina: string;
  cuerpo: Tramo[] | null;
  norma_vulnerada: string;
  decision: Decision | null;
  fundamentos: Tramo[] | null;
  conclusion: string;
  precision_en_bases: string;
  avisos_formulacion: AvisoDeCita[] | null;
  avisos_absolucion: AvisoDeCita[] | null;
}

const COLUMNAS_ENTRADA =
  'id, numero, tipo, participante, tema, seccion, numeral, literal, pagina, cuerpo, norma_vulnerada, decision, fundamentos, conclusion, precision_en_bases, avisos_formulacion, avisos_absolucion';

function aFormulacion(f: FilaEntrada): Formulacion {
  return {
    id: f.id,
    numero: f.numero,
    tipo: f.tipo,
    participante: f.participante ?? '',
    tema: f.tema ?? '',
    ubicacion: {
      seccion: f.seccion,
      numeral: f.numeral,
      literal: f.literal,
      pagina: f.pagina,
    },
    cuerpo: Array.isArray(f.cuerpo) ? f.cuerpo : [],
    normaVulnerada: f.norma_vulnerada ?? '',
    avisos: Array.isArray(f.avisos_formulacion) ? f.avisos_formulacion : [],
  };
}

function aAbsolucion(f: FilaEntrada): Absolucion | null {
  if (!f.decision && (!f.fundamentos || f.fundamentos.length === 0)) return null;
  return {
    id: f.id,
    numero: f.numero,
    decision: f.decision ?? 'no_acoge',
    fundamentos: Array.isArray(f.fundamentos) ? f.fundamentos : [],
    conclusion: f.conclusion ?? '',
    precisionEnBases: f.precision_en_bases ?? '',
    avisos: Array.isArray(f.avisos_absolucion) ? f.avisos_absolucion : [],
  };
}

/** Un pliego con todas sus entradas, o `null` si no es de quien pregunta. */
export async function leerPliego(id: string): Promise<PliegoGuardado | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: p } = await supabase
    .from('pliegos_consultas')
    .select(
      'id, cara, procedimiento, numero_procedimiento, objeto, participante, bases_nombre, status, updated_at',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!p) return null;
  const fila = p as FilaPliego;

  const { data: e } = await supabase
    .from('entradas_consulta')
    .select(COLUMNAS_ENTRADA)
    .eq('pliego_id', id)
    .order('numero', { ascending: true });
  const entradas = (e ?? []) as FilaEntrada[];

  return {
    id: fila.id,
    cara: fila.cara,
    status: fila.status,
    basesNombre: fila.bases_nombre,
    actualizado: fila.updated_at,
    encabezado: {
      procedimiento: fila.procedimiento,
      numeroProcedimiento: fila.numero_procedimiento,
      objeto: fila.objeto,
      participante: fila.participante || undefined,
    },
    formulaciones: entradas.map(aFormulacion),
    absoluciones: entradas.map(aAbsolucion).filter((a): a is Absolucion => a !== null),
  };
}

/** El siguiente número libre del pliego. */
export async function siguienteNumero(pliegoId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from('entradas_consulta')
    .select('numero')
    .eq('pliego_id', pliegoId)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { numero: number } | null)?.numero ?? 0) + 1;
}

/** ¿Es de quien pregunta? Devuelve el pliego al que pertenece la entrada. */
export async function pliegoDeLaEntrada(
  entradaId: string,
): Promise<{ pliegoId: string; cara: CaraDelPliego } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('entradas_consulta')
    .select('pliego_id, pliegos_consultas!inner(cara)')
    .eq('id', entradaId)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as {
    pliego_id: string;
    pliegos_consultas: { cara: CaraDelPliego } | Array<{ cara: CaraDelPliego }>;
  };
  const p = Array.isArray(d.pliegos_consultas) ? d.pliegos_consultas[0] : d.pliegos_consultas;
  return { pliegoId: d.pliego_id, cara: p?.cara ?? 'formulacion' };
}
