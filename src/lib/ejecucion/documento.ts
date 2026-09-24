/**
 * El documento y la ficha de control, pieza a pieza (sección 15).
 *
 * Producto 1, el documento formal, con la forma de la administración
 * pública: el informe con su A / DE / ASUNTO / REFERENCIA / FECHA y sus
 * apartados en romanos; la resolución con VISTOS, CONSIDERANDO y SE
 * RESUELVE; la carta como las de César —número, ciudad y fecha a la
 * derecha, «Presente.-», ASUNTO y REFERENCIA, apartados numerados y la
 * firma bajo su línea—. Lo que falta va entre corchetes y sale en rojo.
 *
 * Producto 2, la ficha de control LexIA: lo que el revisor humano
 * necesita para confiar o no en el documento. No se incorpora al
 * expediente necesariamente.
 */
import type { Pieza } from '@/lib/documentos/piezas';
import { textoAPiezas } from '@/lib/documentos/piezas';
import { aRomano } from '@/lib/documentos/numeracion';
import { FORMATO_CARTA, FORMATO_DOCUMENTO, piezasADocx } from '@/lib/documentos/word';
import { piezasAMarkdown } from '@/lib/documentos/markdown';
import { ACTUACIONES, CLASES, ESTADOS_DOCUMENTO, PERFILES, TIPOS_CONTRATACION, type Perfil } from './catalogo';
import { fechaLarga } from './regimen';
import { DESTINATARIO } from './redaccion';
import { TEXTO_INFORMACION, TEXTO_NIVEL, TEXTO_PROCEDENCIA } from './suficiencia';
import {
  TIPO_DE_HALLAZGO,
  type AnalisisDeActuacion,
  type AuditoriaDelDocumento,
  type BorradorDeDocumento,
  type DocumentoDelExpediente,
  type Ficha,
} from './tipos';

/** La fecha de Lima de un instante: a las 20:00 del 23 en Lima ya es 24 en UTC. */
function diaEnLima(iso: string): string {
  return new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 10);
}

const HUECO = '[●]';

const ENCABEZADO: Record<string, string> = {
  informe_tecnico: 'INFORME TÉCNICO',
  informe_dec: 'INFORME',
  informe_legal: 'INFORME LEGAL',
  informe_supervisor: 'INFORME DE SUPERVISIÓN',
  informe_diagnostico: 'INFORME DE DIAGNÓSTICO CONTRACTUAL',
  descargo: 'DESCARGO',
};

const CARGO_DEL_PERFIL: Record<Perfil, string> = {
  area_usuaria: '[Cargo] — Área Usuaria',
  dec: '[Cargo] — Dependencia encargada de las contrataciones',
  asesoria_juridica: '[Cargo] — Oficina de Asesoría Jurídica',
  aga: 'Autoridad de la gestión administrativa',
  titular: 'Titular de la Entidad',
  supervisor: 'Supervisor / Inspector',
  defensa: '[Cargo]',
  contratista: 'Representante legal',
};

const ORDINALES = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA'];

export interface DatosDelDocumento {
  borrador: BorradorDeDocumento;
  perfil: Perfil;
  ficha: Ficha;
  /** Cuándo se generó, para la nota del borrador. */
  anio: number;
}

function nota(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  if (b.nivel === 'revision_final') return [];
  return [
    {
      clase: 'nota',
      texto: `${TEXTO_NIVEL[b.nivel].toUpperCase()} generado el ${fechaLarga(diaEnLima(b.generadoEn))}. No es un documento oficial ni debe usarse como sustento definitivo hasta incorporar lo que falta. Retire esta nota antes de emitirlo.`,
    },
  ];
}

function pendientes(b: BorradorDeDocumento): Pieza[] {
  if (b.pendientes.length === 0) return [];
  return [
    {
      clase: 'nota',
      texto: `Datos por completar antes de emitir: ${b.pendientes.map((p, i) => `${String.fromCharCode(97 + i)}) ${p.replace(/\.$/, '')}`).join('; ')}.`,
    },
  ];
}

const MARCA = /^\s*(?:[a-z]\)|\d+[.)]|[-•])\s+/i;

/**
 * Los párrafos de un apartado, juntando los literales seguidos.
 *
 * El modelo entrega cada literal —«a) …», «b) …»— como un párrafo
 * aparte. Pasados uno por uno, cada uno era una lista de un solo
 * elemento y todos salían como «a)» (lo detectó la auditoría de
 * coherencia en la primera prueba). Juntos, son una lista.
 */
export function piezasDeParrafos(parrafos: string[]): Pieza[] {
  const out: Pieza[] = [];
  let tanda: string[] = [];
  const cerrar = () => {
    if (tanda.length) out.push(...textoAPiezas(tanda.join('\n')));
    tanda = [];
  };
  for (const p of parrafos) {
    if (MARCA.test(p) && !p.includes('\n')) tanda.push(p);
    else {
      cerrar();
      out.push(...textoAPiezas(p));
    }
  }
  cerrar();
  return out;
}

function cuerpo(secciones: BorradorDeDocumento['secciones'], numerar: (i: number) => string): Pieza[] {
  const out: Pieza[] = [];
  secciones.forEach((s, i) => {
    out.push({ clase: 'titulo', nivel: 1, numero: numerar(i), texto: s.titulo.toUpperCase() });
    out.push(...piezasDeParrafos(s.parrafos));
  });
  return out;
}

function piezasDelInforme(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const siglas = `${HUECO}-${d.anio}-[SIGLAS]`;
  return [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: `${ENCABEZADO[b.tipo] ?? 'INFORME'} N.° ${siglas}` },
    ...nota(d),
    { clase: 'campo', etiqueta: 'A', valor: `[Nombres y apellidos] — ${DESTINATARIO[d.perfil]}` },
    { clase: 'campo', etiqueta: 'DE', valor: `[Nombres y apellidos] — ${CARGO_DEL_PERFIL[d.perfil]}` },
    { clase: 'campo', etiqueta: 'ASUNTO', valor: b.asunto },
    ...(b.referencias.length
      ? b.referencias.length === 1
        ? [{ clase: 'campo' as const, etiqueta: 'REFERENCIA', valor: b.referencias[0] }]
        : [
            { clase: 'campo' as const, etiqueta: 'REFERENCIA', valor: '' },
            { clase: 'lista' as const, marca: 'literal' as const, elementos: b.referencias },
          ]
      : []),
    { clase: 'campo', etiqueta: 'FECHA', valor: `[Ciudad], [día] de [mes] de ${d.anio}` },
    ...cuerpo(b.secciones, (i) => `${aRomano(i + 1)}.`),
    ...pendientes(b),
    { clase: 'parrafo', texto: d.perfil === 'defensa' ? 'Es todo cuanto cumplo con informar.' : 'Es todo cuanto informo a usted para su conocimiento y fines pertinentes.' },
    { clase: 'parrafo', texto: 'Atentamente,', alineacion: 'izquierda' },
    { clase: 'firma', nombre: '[Nombres y apellidos]', cargo: CARGO_DEL_PERFIL[d.perfil], entidad: quienFirma(d) },
  ];
}

/** Por quién se firma: la Entidad, o el contratista cuando escribe él. */
function quienFirma(d: DatosDelDocumento): string {
  if (d.perfil === 'contratista') return d.ficha.contratista?.valor ?? '[Contratista]';
  if (d.perfil === 'supervisor') return '[Supervisor o inspector]';
  return d.ficha.entidad?.valor ?? '[Entidad]';
}

function piezasDeLaResolucion(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const quien = d.perfil === 'titular' ? 'DEL TITULAR DE LA ENTIDAD' : 'DE LA AUTORIDAD DE LA GESTIÓN ADMINISTRATIVA';
  const piezas: Pieza[] = [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: `RESOLUCIÓN ${quien} N.° ${HUECO}-${d.anio}-[SIGLAS]` },
    { clase: 'parrafo', texto: `[Ciudad], [día] de [mes] de ${d.anio}`, alineacion: 'derecha' },
    ...nota(d),
    { clase: 'parrafo', texto: `**VISTOS:** ${(b.vistos ?? []).join('; ').replace(/[.;]\s*$/, '')}; y,` },
    { clase: 'parrafo', texto: '**CONSIDERANDO:**', alineacion: 'izquierda' },
    ...(b.considerandos ?? []).map((t): Pieza => ({ clase: 'parrafo', texto: t })),
    { clase: 'parrafo', texto: '**SE RESUELVE:**', alineacion: 'izquierda' },
    ...(b.resuelve ?? []).map((t, i): Pieza => ({ clase: 'parrafo', texto: `**Artículo ${i + 1}.-** ${t}` })),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'Regístrese, comuníquese y publíquese.', alineacion: 'izquierda' },
    { clase: 'firma', nombre: '[Nombres y apellidos]', cargo: CARGO_DEL_PERFIL[d.perfil], entidad: d.ficha.entidad?.valor ?? '[Entidad]' },
  ];
  return piezas;
}

function piezasDeLaCarta(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const aLaEntidad = d.perfil === 'contratista' || d.perfil === 'supervisor';
  const dest = b.destinatario ?? {
    nombre: aLaEntidad ? '[Nombre del funcionario]' : '[Nombre del representante legal]',
    cargo: aLaEntidad ? '[Cargo]' : 'Representante legal',
    entidad: aLaEntidad ? d.ficha.entidad?.valor : d.ficha.contratista?.valor,
  };
  const piezas: Pieza[] = [
    { clase: 'parrafo', texto: `**CARTA N.° ${HUECO}-${d.anio}-[SIGLAS]**`, alineacion: 'izquierda' },
    { clase: 'parrafo', texto: `[Ciudad], [día] de [mes] de ${d.anio}`, alineacion: 'derecha' },
    ...nota(d),
    { clase: 'parrafo', texto: 'Señor(a):', alineacion: 'izquierda', pegado: true },
    { clase: 'parrafo', texto: `**${dest.nombre}**`, alineacion: 'izquierda', pegado: true },
    ...(dest.cargo ? [{ clase: 'parrafo' as const, texto: dest.cargo, alineacion: 'izquierda' as const, pegado: true }] : []),
    { clase: 'parrafo', texto: dest.entidad ?? (aLaEntidad ? '[Entidad]' : '[Contratista]'), alineacion: 'izquierda', pegado: true },
    { clase: 'parrafo', texto: '**Presente.-**', alineacion: 'izquierda' },
    { clase: 'campo', etiqueta: 'ASUNTO', valor: b.asunto },
    ...(b.referencias.length
      ? b.referencias.length === 1
        ? [{ clase: 'campo' as const, etiqueta: 'REFERENCIA', valor: b.referencias[0] }]
        : [
            { clase: 'campo' as const, etiqueta: 'REFERENCIA', valor: '' },
            { clase: 'lista' as const, marca: 'literal' as const, elementos: b.referencias },
          ]
      : []),
    { clase: 'parrafo', texto: 'De mi consideración:', alineacion: 'izquierda' },
    ...cuerpo(b.secciones, (i) => `${i + 1}.`),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'Sin otro particular, hago propicia la oportunidad para expresarle los sentimientos de mi especial consideración.' },
    { clase: 'parrafo', texto: 'Atentamente,', alineacion: 'izquierda' },
    {
      clase: 'firma',
      nombre: '[Nombres y apellidos]',
      cargo: CARGO_DEL_PERFIL[d.perfil],
      entidad: d.perfil === 'contratista' ? d.ficha.contratista?.valor ?? '[Contratista]' : d.ficha.entidad?.valor ?? '[Entidad]',
    },
  ];
  return piezas;
}

function piezasDelActa(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  return [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: b.titulo.toUpperCase() },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: d.ficha.numero_contrato?.valor ?? '[Contrato N.° ●]' },
    ...nota(d),
    ...cuerpo(b.secciones, (i) => `${aRomano(i + 1)}.`),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'En señal de conformidad, las partes suscriben la presente acta.' },
    {
      clase: 'firmas',
      personas: [
        { nombre: '[Nombres y apellidos]', cargo: `Por ${d.ficha.entidad?.valor ?? 'la Entidad'}` },
        { nombre: '[Nombres y apellidos]', cargo: `Por ${d.ficha.contratista?.valor ?? 'el Contratista'}` },
      ],
    },
  ];
}

function piezasDeLaAdenda(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const contrato = d.ficha.numero_contrato?.valor ?? 'Contrato N.° [●]';
  return [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: `ADENDA N.° ${HUECO} AL ${contrato.toUpperCase()}` },
    ...nota(d),
    {
      clase: 'parrafo',
      texto: `Conste por el presente documento la adenda al ${contrato}, que celebran, de una parte, **${d.ficha.entidad?.valor ?? '[Entidad]'}**, debidamente representada por [nombre y cargo del funcionario facultado], a quien en adelante se le denominará «LA ENTIDAD»; y, de la otra parte, **${d.ficha.contratista?.valor ?? '[Contratista]'}**${d.ficha.ruc_contratista?.valor ? `, con RUC N.° ${d.ficha.ruc_contratista.valor}` : ', con RUC N.° [●]'}, debidamente representada por [nombre del representante legal], a quien en adelante se le denominará «EL CONTRATISTA», en los términos y condiciones siguientes:`,
    },
    ...b.secciones.flatMap((s, i): Pieza[] => [
      { clase: 'titulo', nivel: 1, texto: `CLÁUSULA ${ORDINALES[i] ?? i + 1}: ${s.titulo.toUpperCase()}` },
      ...piezasDeParrafos(s.parrafos),
    ]),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'En señal de conformidad, las partes suscriben la presente adenda en [ciudad], a los [●] días del mes de [●] de ' + d.anio + '.' },
    {
      clase: 'firmas',
      personas: [
        { nombre: '[Nombres y apellidos]', cargo: 'LA ENTIDAD' },
        { nombre: '[Nombres y apellidos]', cargo: 'EL CONTRATISTA' },
      ],
    },
  ];
}

export function piezasDelDocumento(d: DatosDelDocumento): Pieza[] {
  switch (d.borrador.tipo) {
    case 'resolucion':
      return piezasDeLaResolucion(d);
    case 'carta':
      return piezasDeLaCarta(d);
    case 'acta':
      return piezasDelActa(d);
    case 'adenda':
      return piezasDeLaAdenda(d);
    default:
      return piezasDelInforme(d);
  }
}

export function documentoADocx(d: DatosDelDocumento): Promise<Buffer> {
  return piezasADocx(piezasDelDocumento(d), d.borrador.tipo === 'carta' ? FORMATO_CARTA : FORMATO_DOCUMENTO);
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
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'FICHA DE CONTROL LEXIA' },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: d.titulo },
    {
      clase: 'nota',
      texto: 'Ficha para la revisión humana del documento. No forma parte del documento ni necesariamente se incorpora al expediente.',
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
          columnas: ['Condición', 'Base', 'Resultado', 'Sustento'],
          conContenido: a.condiciones.length,
          filas: a.condiciones.map((c) => [c.texto, c.base, ESTADO_COND[c.estado], c.sustento || '—']),
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
    {
      clase: 'parrafo',
      texto: siguiente
        ? `**Próxima actuación sugerida:** ${PERFILES[siguiente.perfil as Perfil]?.nombre ?? siguiente.perfil} — ${siguiente.documento}.`
        : '**Próxima actuación sugerida:** revisar y emitir el documento.',
    },
  ];
}

export function fichaADocx(d: DatosDeLaFicha): Promise<Buffer> {
  return piezasADocx(piezasDeLaFicha(d), FORMATO_DOCUMENTO);
}
