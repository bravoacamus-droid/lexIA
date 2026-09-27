/**
 * La lista precisa de evidencia por obtener.
 *
 * César (27/09/2026), cuando falta evidencia: la primera salida es una
 * «lista precisa de evidencia por obtener», para cuando «el usuario
 * necesita saber qué acreditar y quién puede producir cada documento». Y
 * la solicitud debe ser «específica y explicada»: qué documento, por qué y
 * quién lo emite. Si el documento no existe, «ofrecer una forma legítima
 * de reconstruir el hecho mediante otros antecedentes disponibles; nunca
 * inventar un acta ni sugerir presentarla como emitida oportunamente».
 *
 * Se arma con los requisitos que el diagnóstico ya evaluó: no llama al
 * modelo.
 */
import { CLASES, type ClaseDocumental } from './catalogo';
import { MATRIZ } from './matriz';
import type { AnalisisDeActuacion } from './tipos';

/** Quién emite o tiene cada clase de documento. */
export const EMISOR_DE_CLASE: Record<ClaseDocumental, string> = {
  contrato: 'DEC (expediente de contratación)',
  adenda: 'DEC (expediente de contratación)',
  orden: 'DEC (expediente de contratación)',
  bases: 'DEC o comité de selección',
  oferta: 'Contratista (oferta presentada) o DEC',
  garantia: 'Contratista (la emite la entidad financiera)',
  consorcio: 'Contratista',
  tdr: 'Área Usuaria',
  expediente_tecnico: 'Área Usuaria u órgano técnico',
  plan_trabajo: 'Contratista',
  solicitud_contratista: 'Contratista',
  informe_area_usuaria: 'Área Usuaria',
  conformidad: 'Área Usuaria',
  informe_dec: 'DEC',
  informe_legal: 'Asesoría Jurídica',
  resolucion: 'AGA o Titular de la Entidad',
  delegacion: 'Titular de la Entidad (resolución de delegación)',
  carta_entidad: 'Entidad (AGA o DEC)',
  documento_control: 'Órgano de control',
  acta_suspension: 'Entidad y contratista (suscriben el acta)',
  acta_reinicio: 'Entidad y contratista (suscriben el acta)',
  acta_recepcion: 'Comité de recepción o Área Usuaria, con el contratista',
  acta_entrega_terreno: 'Entidad y contratista (suscriben el acta)',
  cronograma: 'Contratista, aprobado por la Entidad',
  otra_acta: 'Quienes intervinieron en el acto',
  certificacion_presupuestal: 'Oficina de presupuesto',
  valorizacion: 'Contratista y supervisor',
  pago: 'Tesorería',
  estructura_costos: 'Área Usuaria o contratista',
  liquidacion: 'Contratista (o la Entidad, si él no la presenta)',
  informe_supervisor: 'Supervisor o inspector',
  cuaderno_obra: 'Residente y supervisor',
  evidencia: 'Quien tenga el registro (correos, fotografías, registros)',
  otro: 'Quien corresponda según el caso',
};

export interface EvidenciaPorObtener {
  que: string;
  porQue: string;
  quien: string;
  prioridad: 'Indispensable' | 'Necesaria según el caso' | 'Complementaria';
  /** Existe solo como declaración del usuario. */
  soloDeclarada: boolean;
}

export function evidenciaPorObtener(a: AnalisisDeActuacion): EvidenciaPorObtener[] {
  const reglas = MATRIZ[a.actuacion].requisitos;
  return a.requisitos
    .filter((r) => r.estado === 'falta' || r.estado === 'declarado')
    .sort((x, y) => x.nivel - y.nivel)
    .map((r) => {
      const regla = reglas.find((x) => x.id === r.id);
      const clases = regla?.acreditaCon ?? [];
      // Sin repetir: «Área Usuaria» sobra si también está «Área Usuaria u
      // órgano técnico».
      const emisores = [...new Set(clases.map((c) => EMISOR_DE_CLASE[c]))];
      const distintos = emisores.filter((e) => !emisores.some((o) => o !== e && o.includes(e)));
      const quien = clases.length
        ? distintos.slice(0, 2).join('; o ')
        : 'Quien tenga la prueba del hecho (comunicaciones, registros, actas, informes)';
      const otros = clases.length > 1 ? ` Lo acredita cualquiera de: ${clases.map((c) => CLASES[c].nombre.toLowerCase()).join(', ')}.` : '';
      return {
        que: r.texto,
        porQue: `${r.porQue}${otros}`,
        quien,
        prioridad: r.nivel === 1 ? 'Indispensable' : r.nivel === 2 ? 'Necesaria según el caso' : 'Complementaria',
        soloDeclarada: r.estado === 'declarado',
      };
    });
}

export const SI_NO_EXISTE =
  'Si alguno de estos documentos no existe, no se elabora hoy con fecha pasada ni se presenta como si se hubiera emitido a tiempo. El hecho se reconstruye con otros antecedentes que lo prueben —comunicaciones, registros de ejecución, informes, correos, actas de otras diligencias— y el documento que se emita ahora lleva su fecha real y dice qué reconstruye.';

