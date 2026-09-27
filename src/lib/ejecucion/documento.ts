/**
 * El documento y la ficha de control, pieza a pieza (sección 15).
 *
 * Producto 1, el documento formal, con la forma de los modelos de César:
 * las piezas las arma `plantillas.ts` —el informe, el memorándum, la
 * resolución, el acta, la carta— y aquí se componen en Word con la letra
 * de cada unidad. Lo que falta va entre corchetes y sale en rojo.
 *
 * Producto 2, la ficha de control LexIA: lo que el revisor humano
 * necesita para confiar o no en el documento. No se incorpora al
 * expediente necesariamente.
 */
import type { Pieza } from '@/lib/documentos/piezas';
import { aRomano } from '@/lib/documentos/numeracion';
import {
  FORMATO_ACTA_MODIFICACION,
  FORMATO_CARTA,
  FORMATO_DOCUMENTO,
  FORMATO_INFORME_DEC,
  FORMATO_INFORME_LEGAL,
  FORMATO_MEMORANDUM,
  FORMATO_RESOLUCION,
  piezasADocx,
  type Formato,
} from '@/lib/documentos/word';
import { piezasAMarkdown } from '@/lib/documentos/markdown';
import { ACTUACIONES, CLASES, ESTADOS_DOCUMENTO, PERFILES, TIPOS_CONTRATACION, type Perfil } from './catalogo';
import { fechaLarga } from './regimen';
import { TEXTO_INFORMACION, TEXTO_NIVEL, TEXTO_PROCEDENCIA } from './suficiencia';
import { rutaEnTexto } from './continuacion';
import { evidenciaPorObtener, SI_NO_EXISTE } from './evidencia';
import { piezasDelDocumento, type DatosDelDocumento } from './plantillas';
import {
  CAMPOS_FICHA,
  TIPO_DE_HALLAZGO,
  type AnalisisDeActuacion,
  type AuditoriaDelDocumento,
  type BorradorDeDocumento,
  type DocumentoDelExpediente,
  type Ficha,
} from './tipos';

export { piezasDelDocumento, piezasDeParrafos, piezasDelApartado, type DatosDelDocumento } from './plantillas';

/**
 * La letra y las medidas de cada documento, las de su unidad en los
 * modelos de César: Abastecimiento en Verdana 9, Asesoría Jurídica y la
 * resolución en Arial 10, el memorándum en Arial 11, el acta en carta.
 */
function formatoDe(b: BorradorDeDocumento): Formato {
  switch (b.tipo) {
    case 'carta':
      return FORMATO_CARTA;
    case 'informe_legal':
      return FORMATO_INFORME_LEGAL;
    case 'resolucion':
      return FORMATO_RESOLUCION;
    case 'memorandum':
      return FORMATO_MEMORANDUM;
    case 'acta':
      return FORMATO_ACTA_MODIFICACION;
    case 'adenda':
      return FORMATO_DOCUMENTO;
    default:
      return FORMATO_INFORME_DEC;
  }
}

export function documentoADocx(d: DatosDelDocumento): Promise<Buffer> {
  return piezasADocx(piezasDelDocumento(d), formatoDe(d.borrador));
}

/** El texto del documento, para auditarlo y para enseñarlo en pantalla. */
export function documentoEnMarkdown(d: DatosDelDocumento): string {
  return piezasAMarkdown(piezasDelDocumento(d));
}

// ── La ficha de control ──────────────────────────────────────────────

export interface DatosDeLaFicha {
  titulo: string;
  perfil: Perfil;
  analisis: AnalisisDeActuacion;
  documentos: DocumentoDelExpediente[];
  borrador: BorradorDeDocumento | null;
  auditoria: AuditoriaDelDocumento | null;
  ficha: Ficha;
}

const ESTADO_REQ = { acreditado: 'Cumplido', declarado: 'Declarado, no acreditado', falta: 'Pendiente', no_aplica: 'No aplica' };
const ESTADO_COND = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  no_acreditado: 'No acreditado',
  declarado: 'Declarado',
  no_aplica: 'No aplica',
};

export function piezasDeLaFicha(d: DatosDeLaFicha): Pieza[] {
  const a = d.analisis;
  const cargados = d.documentos.filter((x) => x.origen === 'cargado');
  const acreditados = a.hechos.filter((h) => h.estado === 'acreditado');
  const declarados = a.hechos.filter((h) => h.estado !== 'acreditado');
  const cumplidos = a.requisitos.filter((r) => r.estado === 'acreditado');
  const pendientesReq = a.requisitos.filter((r) => r.estado !== 'acreditado');
  const siguiente = a.cadena.find((p) => !p.hecho && p.perfil !== d.perfil);
  const advertencias = [
    ...a.advertencias,
    ...(d.auditoria?.hallazgos ?? []).map((h) => `${h.gravedad === 'error' ? 'Inconsistencia' : 'Advertencia'} (${TIPO_DE_HALLAZGO[h.tipo].toLowerCase()}): ${h.texto}`),
    ...(a.documento.advertencia ? [a.documento.advertencia] : []),
  ];
  let n = 0;
  const apartado = (texto: string): Pieza => ({ clase: 'titulo', nivel: 1, numero: `${aRomano(++n)}.`, texto });
  const lista = (xs: string[], vacio: string): Pieza =>
    xs.length ? { clase: 'lista', marca: 'literal', elementos: xs } : { clase: 'parrafo', texto: vacio };

  return [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'FICHA DE SUSTENTO Y PENDIENTES' },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: d.titulo },
    {
      clase: 'nota',
      texto: 'Ficha para la revisión humana del documento: de dónde salió cada dato, qué está pendiente y cómo continúa el trámite. No forma parte del documento formal.',
    },
    {
      clase: 'datos',
      filas: [
        { etiqueta: 'Figura identificada', valor: `${a.figura.nombre}${a.figura.corresponde ? '' : ' (la figura solicitada no corresponde)'}` },
        { etiqueta: 'Perfil emisor', valor: PERFILES[d.perfil].nombre },
        { etiqueta: 'Actuación', valor: ACTUACIONES[a.actuacion].nombre },
        { etiqueta: 'Contrato', valor: [d.ficha.numero_contrato?.valor, d.ficha.objeto?.valor].filter(Boolean).join(' — ') || '[No identificado]' },
        { etiqueta: 'Tipo de contratación', valor: a.tipo ? TIPOS_CONTRATACION[a.tipo] : 'No determinado' },
        { etiqueta: 'Régimen aplicable', valor: a.regimen.texto },
        { etiqueta: 'Nivel de suficiencia', valor: `${a.suficiencia} % — ${TEXTO_INFORMACION[a.semaforoInformacion]}` },
        { etiqueta: 'Semáforo de procedencia', valor: TEXTO_PROCEDENCIA[a.procedencia.semaforo] },
        { etiqueta: 'Competencia por verificar', valor: `${a.competencia.organo} (${a.competencia.base}). ${a.competencia.verificar}` },
        ...(d.borrador
          ? [
              { etiqueta: 'Documento generado', valor: `${d.borrador.titulo} — ${TEXTO_NIVEL[d.borrador.nivel]}, versión ${d.borrador.version}` },
              { etiqueta: 'Auditoría', valor: d.auditoria ? (d.auditoria.bloquea ? 'Con inconsistencias: no emitir sin revisarlas' : d.auditoria.hallazgos.length ? 'Sin inconsistencias; con advertencias' : 'Sin observaciones') : 'No ejecutada' },
            ]
          : []),
      ],
    },
    // César (27/09/2026): la ficha «mostraría de dónde salió cada hecho
    // relevante». Cada dato del contrato con su documento y su frase.
    apartado('Datos del contrato y su fuente'),
    Object.keys(d.ficha).length
      ? {
          clase: 'tabla',
          columnas: ['Dato', 'Valor', 'Fuente'],
          conContenido: Object.keys(d.ficha).length,
          filas: (Object.entries(d.ficha) as Array<[keyof typeof CAMPOS_FICHA, NonNullable<Ficha[keyof Ficha]>]>).map(([campo, v]) => [
            CAMPOS_FICHA[campo]?.nombre ?? campo,
            v.valor,
            v.delUsuario ? 'Declarado por el usuario' : v.documento ? `${v.documento}${v.cita ? `: «${v.cita.slice(0, 160)}»` : ''}` : '—',
          ]),
        }
      : { clase: 'parrafo', texto: 'No se identificaron datos del contrato.' },
    apartado('Documentos analizados'),
    cargados.length
      ? {
          clase: 'tabla',
          columnas: ['Documento', 'Clase', 'Fecha', 'Estado'],
          conContenido: cargados.length,
          filas: cargados.map((x) => [
            x.nombre,
            x.clase ? CLASES[x.clase].nombre : 'Sin clasificar',
            x.datos.fecha ? fechaLarga(x.datos.fecha) : '—',
            ESTADOS_DOCUMENTO[x.estado],
          ]),
        }
      : { clase: 'parrafo', texto: 'No se cargaron documentos: todo el análisis se apoya en lo declarado por el usuario.' },
    apartado('Información acreditada'),
    lista(
      acreditados.map((h) => `${h.fecha ? `${fechaLarga(h.fecha)}: ` : ''}${h.hecho} (${h.documento})`),
      'Ningún hecho se encuentra acreditado documentalmente.',
    ),
    apartado('Información declarada'),
    lista(
      declarados.map((h) => `${h.fecha ? `${fechaLarga(h.fecha)}: ` : ''}${h.hecho}${h.estado === 'declarado' ? ' — según lo declarado' : ' — no acreditado'}`),
      'No hay hechos solo declarados.',
    ),
    apartado('Requisitos cumplidos y pendientes'),
    {
      clase: 'tabla',
      columnas: ['Requisito', 'Nivel', 'Estado', 'Documento o razón'],
      conContenido: a.requisitos.length,
      filas: [...cumplidos, ...pendientesReq].map((r) => [
        r.texto,
        r.nivel === 1 ? 'Indispensable' : r.nivel === 2 ? 'Según el caso' : 'Complementario',
        ESTADO_REQ[r.estado],
        r.documento ?? r.declaracion ?? r.porQue,
      ]),
    },
    apartado('Condiciones de procedencia'),
    a.condiciones.length
      ? {
          clase: 'tabla',
          columnas: ['Condición', 'Base', 'Resultado', 'Sustento y evidencia'],
          conContenido: a.condiciones.length,
          filas: a.condiciones.map((c) => [
            c.texto,
            c.base,
            ESTADO_COND[c.estado],
            [c.sustento, ...c.evidencia.map((e) => `«${e.cita.slice(0, 160)}» (${e.documento})`)].filter(Boolean).join(' ') || '—',
          ]),
        }
      : { clase: 'parrafo', texto: 'La actuación no tiene condiciones fijas: ver el análisis.' },
    apartado('Documentos faltantes'),
    lista(
      a.faltantes.map((f) => `${f.texto} — ${f.nivel === 1 ? 'indispensable' : f.nivel === 2 ? 'necesario según el caso' : 'complementario'}. ${f.porQue}`),
      'No falta ningún documento de los requisitos aplicables.',
    ),
    apartado('Cálculos'),
    lista(a.calculos.map((c) => `${c.concepto}: ${c.resultado}. ${c.detalle} (${c.base})`), 'No se hicieron cálculos para esta actuación.'),
    apartado('Riesgos'),
    lista(a.riesgos.map((r) => `${r.descripcion} (gravedad ${r.gravedad})`), 'No se identificaron riesgos.'),
    apartado('Contradicciones'),
    lista(a.contradicciones.map((c) => c.descripcion), 'No se advierten contradicciones entre los documentos.'),
    apartado('Advertencias para revisión humana'),
    lista(advertencias, 'Sin advertencias adicionales.'),
    apartado('Cadena documental y próxima actuación'),
    { clase: 'parrafo', texto: a.explicacionCadena },
    lista(
      a.cadena.map((p) => `${PERFILES[p.perfil as Perfil]?.nombre ?? p.perfil}: ${p.documento}${p.condicion ? ` (${p.condicion})` : ''}${p.hecho ? ' — ya consta en el expediente' : ''}`),
      'Sin cadena fija.',
    ),
    apartado('Ruta de continuación'),
    lista(rutaEnTexto(a, d.perfil, (p) => PERFILES[p as Perfil]?.nombre ?? p), 'Revisar y emitir el documento.'),
  ];
}

/**
 * La lista precisa de evidencia por obtener (César, 27/09/2026): qué
 * acreditar, por qué y quién puede producir cada documento.
 */
export function piezasDeLaEvidencia(d: DatosDeLaFicha): Pieza[] {
  const a = d.analisis;
  const filas = evidenciaPorObtener(a);
  return [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'LISTA DE EVIDENCIA POR OBTENER' },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: `${ACTUACIONES[a.actuacion].nombre} — ${PERFILES[d.perfil].nombre}` },
    {
      clase: 'nota',
      texto: `Qué hace falta acreditar para ${a.nivelesPermitidos.includes('revision_final') ? 'emitir el documento' : 'pasar del diagnóstico a un documento para revisión final'}, por qué, y quién puede producir cada documento. Adjúntalos en «Fuentes» del expediente: A-LexIA los leerá y rehará el análisis.`,
    },
    filas.length
      ? {
          clase: 'tabla',
          columnas: ['Documento o dato', 'Por qué se necesita', 'Quién puede emitirlo', 'Prioridad'],
          conContenido: filas.length,
          filas: filas.map((f) => [f.que + (f.soloDeclarada ? ' (hoy solo declarado)' : ''), f.porQue, f.quien, f.prioridad]),
        }
      : { clase: 'parrafo', texto: 'No falta ningún documento de los requisitos aplicables.' },
    ...(a.pregunta
      ? ([{ clase: 'parrafo', texto: `**Además, falta responder:** ${a.pregunta.texto} ${a.pregunta.porQue}` }] as Pieza[])
      : []),
    { clase: 'parrafo', texto: `**Si un documento no existe.** ${SI_NO_EXISTE}` },
  ];
}

export function evidenciaADocx(d: DatosDeLaFicha): Promise<Buffer> {
  return piezasADocx(piezasDeLaEvidencia(d), FORMATO_DOCUMENTO);
}

export function fichaADocx(d: DatosDeLaFicha): Promise<Buffer> {
  return piezasADocx(piezasDeLaFicha(d), FORMATO_DOCUMENTO);
}
