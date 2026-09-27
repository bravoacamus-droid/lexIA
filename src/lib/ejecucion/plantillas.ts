/**
 * La forma de cada documento de la ejecución contractual, pieza a pieza.
 *
 * César mandó el 27/09/2026 los expedientes reales de la Zona Registral
 * N.° XIV de la SUNARP con un aviso: «lo que se genere ahora no
 * corresponde a los modelos». Lo que se aprendió de ellos:
 *
 *   · El informe no lleva «DE:» ni «FECHA:». Arriba va «Ayacucho, 12 de
 *     junio de 2026», luego el número en negrita, el rótulo PARA (la DEC)
 *     o A (Asesoría Jurídica, el área usuaria), ASUNTO y REFERENCIA con
 *     sus literales, y una raya. Después, una frase de cortesía.
 *   · Los párrafos se numeran 1.1, 3.10…; dentro del análisis, un
 *     subtítulo en negrita por cada requisito, y las normas citadas en
 *     cursiva, sangradas.
 *   · Cada unidad tiene su plantilla: Abastecimiento en Verdana 9 con
 *     CONCLUSIÓN y RECOMENDACIÓN en singular; Asesoría Jurídica con la
 *     BASE LEGAL antes de los ANTECEDENTES y los títulos subrayados; el
 *     área usuaria escribe un MEMORÁNDUM con puntos numerados; la
 *     resolución lleva «ARTÍCULO 1.- EPÍGRAFE.» y el verbo en mayúsculas;
 *     el acta de un contrato menor, siete apartados y «EXPONEN:».
 *
 * Lo que el sistema de trámite de la SUNARP estampa al firmar —el logo,
 * el sello de «Firmado digitalmente», el pie con el código CVD— no se
 * imita: no es texto del documento y falsearía una firma.
 *
 * Sin dependencias de servidor: la vista previa de la pantalla y el Word
 * salen de las mismas piezas.
 */
import type { Pieza, PiezaTabla } from '@/lib/documentos/piezas';
import { textoAPiezas } from '@/lib/documentos/piezas';
import { aRomano } from '@/lib/documentos/numeracion';
import type { Actuacion, Perfil } from './catalogo';
import { fechaLarga } from './regimen';
import { TEXTO_NIVEL } from './suficiencia';
import type { BorradorDeDocumento, Ficha } from './tipos';

const HUECO = '[●]';

/** A quién se dirige cada perfil, para el PARA o el A de su informe. */
export const DESTINATARIO: Record<Perfil, string> = {
  area_usuaria: 'Dependencia encargada de las contrataciones (DEC)',
  dec: 'Autoridad de la gestión administrativa',
  asesoria_juridica: 'Autoridad de la gestión administrativa',
  aga: 'Contratista',
  titular: 'Contratista',
  supervisor: 'Entidad contratante',
  defensa: 'Órgano de control',
  contratista: 'Entidad contratante',
};

export const CARGO_DEL_PERFIL: Record<Perfil, string> = {
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

/**
 * Lo que dice arriba el acta de modificación de un contrato menor, bajo
 * «ACTA DE MODIFICACIÓN AL CONTRATO N.° …».
 */
export const MODIFICACION_DEL_ACTA: Partial<Record<Actuacion, string>> = {
  reduccion: 'REDUCCIÓN DE PRESTACIONES',
  ampliacion_plazo: 'AMPLIACIÓN DE PLAZO CONTRACTUAL',
  otra_modificacion: 'MODIFICACIÓN CONTRACTUAL',
};

export interface DatosDelDocumento {
  borrador: BorradorDeDocumento;
  perfil: Perfil;
  ficha: Ficha;
  /** Cuándo se generó, para la nota del borrador. */
  anio: number;
}

/** La fecha de Lima de un instante: a las 20:00 del 23 en Lima ya es 24 en UTC. */
function diaEnLima(iso: string): string {
  return new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 10);
}

function nota(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  if (b.nivel === 'revision_final') return [];
  // Un acto de la autoridad sin el sustento completo es un proyecto, y el
  // Word lo dice arriba, con esas palabras: no es apto para firma.
  if ((d.perfil === 'aga' || d.perfil === 'titular') && b.nivel === 'borrador_condicionado')
    return [
      {
        clase: 'nota',
        texto: `PROYECTO DE DECISIÓN CONDICIONADO — NO APTO PARA FIRMA. Generado el ${fechaLarga(diaEnLima(b.generadoEn))}. El expediente aún no permite recomendar su emisión: falta sustento que la autoridad necesita para decidir (ver la ficha de control y los fundamentos pendientes en los considerandos). Retire esta nota solo cuando ese sustento esté incorporado.`,
      },
    ];
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
  return piezasDelApartado(parrafos);
}

/** Un cuadro que el modelo escribió en Markdown: «| Concepto | Dato |». */
function tablaDeMarkdown(lineas: string[]): PiezaTabla {
  const celdas = (l: string) =>
    l
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  const filas = lineas.filter((l) => !/^\|?\s*:?-{2,}/.test(l.trim())).map(celdas);
  const [columnas = [], ...resto] = filas;
  return { clase: 'tabla', columnas, filas: resto, conContenido: resto.length };
}

/**
 * Un subtítulo del análisis: «## Respecto al cumplimiento del primer
 * supuesto – Límite máximo», o un renglón entero en negrita.
 */
function subtitulo(p: string): string | null {
  const m = p.match(/^#{1,4}\s+(.+)$/s);
  if (m) return m[1].replace(/^\*\*(.+)\*\*$/s, '$1').trim();
  const n = p.match(/^\*\*([^*\n]{3,220})\*\*\s*:?$/);
  if (n && !/[.;]$/.test(n[1].trim())) return n[1].trim();
  return null;
}

/**
 * Los párrafos de un apartado con la forma de los informes de César.
 *
 * Con `prefijo`, cada párrafo corrido lleva su numeral —«3.1», «3.2»…—;
 * los subtítulos («## …»), las citas («> …»), los cuadros y las listas no
 * se numeran: cuelgan del párrafo que los presenta.
 */
export function piezasDelApartado(parrafos: string[], prefijo?: string): Pieza[] {
  const out: Pieza[] = [];
  let k = 0;
  let tanda: string[] = [];
  const cerrar = () => {
    if (tanda.length) out.push(...textoAPiezas(tanda.join('\n')));
    tanda = [];
  };
  for (const bruto of parrafos) {
    const p = bruto.trim();
    if (!p) continue;
    const sub = subtitulo(p);
    if (sub) {
      cerrar();
      out.push({ clase: 'titulo', nivel: 1, texto: sub });
      continue;
    }
    if (p.startsWith('>')) {
      cerrar();
      out.push({ clase: 'parrafo', cita: true, texto: p.replace(/^>\s?/gm, '').trim() });
      continue;
    }
    const lineas = p.split('\n').filter((l) => l.trim());
    if (lineas.length >= 2 && lineas.every((l) => l.trim().startsWith('|'))) {
      cerrar();
      out.push(tablaDeMarkdown(lineas));
      continue;
    }
    if (MARCA.test(p) && !p.includes('\n') && !/^\d+\.\d/.test(p)) {
      tanda.push(p);
      continue;
    }
    cerrar();
    if (p.includes('\n')) {
      out.push(...textoAPiezas(p));
      continue;
    }
    // El modelo a veces escribe el numeral él mismo: lo pone el sistema.
    const texto = prefijo ? p.replace(/^\d+(?:\.\d+)+\.?\s+/, '') : p;
    out.push(prefijo ? { clase: 'parrafo', numero: `${prefijo}.${++k}`, texto } : { clase: 'parrafo', texto });
  }
  cerrar();
  return out;
}

const letra = (i: number) => String.fromCharCode(97 + (i % 26));

/**
 * A quién va un INFORME. La AGA y el Titular escriben al contratista
 * cuando mandan una carta, pero un informe suyo es interno: la auditoría
 * de coherencia lo marcó en un diagnóstico de la AGA dirigido «A:
 * Contratista» (27/09/2026).
 */
function destinatarioDelInforme(perfil: Perfil): string {
  if (perfil === 'aga') return 'Titular de la Entidad';
  if (perfil === 'titular') return 'Dependencia encargada de las contrataciones (DEC)';
  return DESTINATARIO[perfil];
}

/** Por quién se firma: la Entidad, o el contratista cuando escribe él. */
function quienFirma(d: DatosDelDocumento): string {
  if (d.perfil === 'contratista') return d.ficha.contratista?.valor ?? '[Contratista]';
  if (d.perfil === 'supervisor') return '[Supervisor o inspector]';
  return d.ficha.entidad?.valor ?? '[Entidad]';
}

const lugarYFecha = (anio: number) => `[Ciudad], [día] de [mes] de ${anio}`;

/**
 * Lo que abre un informe o un memorándum: lugar y fecha, número, el
 * rótulo PARA/A, ASUNTO, REFERENCIA, la raya y la frase de cortesía.
 */
function encabezadoDeOficio(d: DatosDelDocumento, o: { documento: string; para: 'PARA' | 'A'; apertura: string }): Pieza[] {
  const b = d.borrador;
  return [
    { clase: 'parrafo', texto: lugarYFecha(d.anio), alineacion: 'izquierda', pegado: true },
    { clase: 'parrafo', texto: `**${o.documento} N° ${HUECO}-${d.anio}-[SIGLAS]**`, alineacion: 'izquierda' },
    ...nota(d),
    { clase: 'rotulo', etiqueta: o.para, lineas: ['**[Nombres y apellidos]**', destinatarioDelInforme(d.perfil)] },
    { clase: 'rotulo', etiqueta: 'ASUNTO', lineas: [b.asunto] },
    ...(b.referencias.length
      ? [{ clase: 'rotulo' as const, etiqueta: 'REFERENCIA', lineas: b.referencias.map((r, i) => `**${letra(i)})** ${r}`) }]
      : []),
    { clase: 'raya' },
    { clase: 'parrafo', texto: b.apertura?.trim() || o.apertura },
  ];
}

function firmaDeOficio(d: DatosDelDocumento): Pieza {
  return { clase: 'firma', nombre: '[Nombres y apellidos]', cargo: CARGO_DEL_PERFIL[d.perfil], entidad: quienFirma(d), alineacion: 'izquierda' };
}

/**
 * Los informes: la DEC, el área usuaria cuando informa, el supervisor, el
 * diagnóstico y el descargo. Romanos, párrafos 1.1 y la firma a la
 * izquierda.
 */
function piezasDelInforme(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const apertura =
    b.tipo === 'informe_diagnostico'
      ? 'Tengo el agrado de dirigirme a usted para informar el diagnóstico preliminar del caso, conforme a lo siguiente:'
      : b.tipo === 'descargo'
        ? 'Me dirijo a usted, en atención al documento de la referencia, para presentar el siguiente descargo:'
        : 'Tengo el agrado de dirigirme a usted, en atención al asunto y a los documentos de la referencia, para informar lo siguiente:';
  return [
    ...encabezadoDeOficio(d, { documento: 'INFORME', para: 'PARA', apertura }),
    ...b.secciones.flatMap((s, i): Pieza[] => [
      { clase: 'titulo', nivel: 1, numero: `${aRomano(i + 1)}.`, texto: s.titulo.toUpperCase() },
      ...piezasDelApartado(s.parrafos, String(i + 1)),
    ]),
    ...pendientes(b),
    {
      clase: 'parrafo',
      texto: d.perfil === 'defensa' ? 'Es todo cuanto cumplo con informar.' : 'Es todo cuanto informo para su conocimiento y fines correspondientes.',
      margen: true,
    },
    { clase: 'parrafo', texto: 'Atentamente,', alineacion: 'izquierda', margen: true },
    firmaDeOficio(d),
  ];
}

/**
 * El informe legal: A, la BASE LEGAL antes que los ANTECEDENTES, los
 * títulos subrayados con dos puntos, sin numerar los párrafos, y la nota
 * con que remite el proyecto que la autoridad firmará.
 */
function piezasDelInformeLegal(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  return [
    ...encabezadoDeOficio(d, {
      documento: 'INFORME',
      para: 'A',
      apertura:
        'Es grato dirigirme a usted en atención al documento de la referencia, mediante el cual se solicita a esta oficina emitir opinión legal. Al respecto, dentro del ámbito de su competencia y sin sustituir las evaluaciones técnicas de las áreas competentes, se emite la siguiente opinión:',
    }),
    ...b.secciones.flatMap((s, i): Pieza[] => [
      { clase: 'titulo', nivel: 1, numero: `${aRomano(i + 1)}.`, texto: `${s.titulo.toUpperCase().replace(/:$/, '')}:`, subrayado: true },
      ...piezasDelApartado(s.parrafos),
    ]),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'Es todo cuanto informo para su conocimiento y fines correspondientes.', margen: true },
    { clase: 'parrafo', texto: 'Atentamente,', alineacion: 'izquierda', margen: true },
    firmaDeOficio(d),
    ...(b.remiteProyecto
      ? ([
          {
            clase: 'parrafo',
            texto: `**NOTA:** Se remite el proyecto de ${b.remiteProyecto.replace(/^(el|la)\s+/i, '')} que —de hallarlo conforme— podrá suscribirse.`,
            margen: true,
          },
        ] as Pieza[])
      : []),
  ];
}

/**
 * El memorándum del área usuaria: A, los puntos numerados «1.» con su
 * título en negrita y dos puntos, el texto debajo sin numerar, y «Sin otro
 * en particular, quedo de usted.».
 */
function piezasDelMemorandum(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const titulo = (t: string) => {
    const limpio = t.replace(/:$/, '').trim();
    // Los puntos del memorándum van en tipo oración, no en mayúsculas.
    const oracion = limpio === limpio.toUpperCase() ? limpio.charAt(0) + limpio.slice(1).toLowerCase() : limpio;
    return `${oracion}:`;
  };
  return [
    ...encabezadoDeOficio(d, {
      documento: 'MEMORÁNDUM',
      para: 'A',
      apertura: 'Es grato dirigirme a usted, en atención al documento de la referencia, para hacer de su conocimiento lo siguiente:',
    }),
    ...b.secciones.flatMap((s, i): Pieza[] => [
      { clase: 'titulo', nivel: 1, numero: `${i + 1}.`, texto: titulo(s.titulo) },
      ...piezasDelApartado(s.parrafos),
    ]),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'Sin otro en particular, quedo de usted.', margen: true },
    { clase: 'parrafo', texto: 'Atentamente,', alineacion: 'izquierda', margen: true },
    firmaDeOficio(d),
  ];
}

/**
 * La resolución: la entidad y el número centrados, la fecha a la derecha
 * con «.-», «VISTOS;» en línea con «; y,», los «Que, …» con sangría,
 * «Con el visto de…», «En uso de las atribuciones…», y los artículos con
 * su epígrafe.
 */
function piezasDeLaResolucion(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const denominacion = d.perfil === 'titular' ? 'RESOLUCIÓN [JEFATURAL]' : 'RESOLUCIÓN [DE LA UNIDAD DE ADMINISTRACIÓN]';
  const epigrafe = (i: number) => b.epigrafes?.[i]?.trim().replace(/\.$/, '').toUpperCase();
  const cerrarConPuntoYComa = (t: string) => t.trim().replace(/[.;,]*$/, ';');
  return [
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: (d.ficha.entidad?.valor ?? '[ENTIDAD]').toUpperCase() },
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: `${denominacion} N° ${HUECO}-${d.anio}-[SIGLAS]` },
    { clase: 'parrafo', texto: `${lugarYFecha(d.anio)}.-`, alineacion: 'derecha' },
    ...nota(d),
    {
      clase: 'parrafo',
      // Cada visto sin su «;» final: el modelo a veces lo pone y salía «;;».
      texto: `**VISTOS;** ${(b.vistos ?? [])
        .map((v) => v.trim().replace(/[.;,]+$/, '').replace(/;\s*y,?$/, ''))
        .filter(Boolean)
        .join('; ')}; y,`,
    },
    { clase: 'parrafo', texto: '**CONSIDERANDO:**', alineacion: 'izquierda' },
    ...(b.considerandos ?? []).map((t): Pieza => ({ clase: 'parrafo', texto: t, sangriaPrimera: true })),
    ...(b.visto ? [{ clase: 'parrafo' as const, texto: cerrarConPuntoYComa(b.visto), sangriaPrimera: true }] : []),
    ...(b.atribuciones ? [{ clase: 'parrafo' as const, texto: cerrarConPuntoYComa(b.atribuciones), sangriaPrimera: true }] : []),
    { clase: 'parrafo', texto: '**SE RESUELVE:**', alineacion: 'izquierda' },
    ...(b.resuelve ?? []).map(
      (t, i): Pieza => ({
        clase: 'parrafo',
        texto: epigrafe(i) ? `**ARTÍCULO ${i + 1}.- ${epigrafe(i)}.** ${t}` : `**ARTÍCULO ${i + 1}.-** ${t}`,
      }),
    ),
    ...pendientes(b),
    { clase: 'parrafo', texto: '**Regístrese, comuníquese y publíquese.**', alineacion: 'izquierda', margen: true },
    { clase: 'firma', nombre: '[Nombres y apellidos]', cargo: CARGO_DEL_PERFIL[d.perfil], entidad: d.ficha.entidad?.valor ?? '[Entidad]' },
  ];
}

function piezasDeLaCarta(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const aLaEntidad = d.perfil === 'contratista' || d.perfil === 'supervisor';
  const dest = b.destinatario ?? {
    nombre: aLaEntidad ? '[Nombre del funcionario]' : '[Nombre del representante legal]',
    cargo: aLaEntidad ? '[Cargo]' : 'Representante legal',
    entidad: aLaEntidad ? d.ficha.entidad?.valor : d.ficha.contratista?.valor,
  };
  return [
    { clase: 'parrafo', texto: `**CARTA N.° ${HUECO}-${d.anio}-[SIGLAS]**`, alineacion: 'izquierda' },
    { clase: 'parrafo', texto: lugarYFecha(d.anio), alineacion: 'derecha' },
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
    ...b.secciones.flatMap((s, i): Pieza[] => [
      { clase: 'titulo', nivel: 1, numero: `${i + 1}.`, texto: s.titulo.toUpperCase() },
      ...piezasDelApartado(s.parrafos),
    ]),
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
}

/**
 * El acta bilateral: el título en tres renglones, «En la ciudad de …,
 * reunidos los representantes de las partes:», las partes con su término
 * definido, «EXPONEN:», los apartados en romanos —los antecedentes en
 * 1.1, 1.2…— y las firmas de LA ENTIDAD y EL CONTRATISTA.
 */
function piezasDelActa(d: DatosDelDocumento): Pieza[] {
  const b = d.borrador;
  const contrato = d.ficha.numero_contrato?.valor ?? 'Contrato N.° [●]';
  const modificacion = b.actuacion ? MODIFICACION_DEL_ACTA[b.actuacion] : undefined;
  const titulo: Pieza[] = modificacion
    ? [
        { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: `ACTA DE MODIFICACIÓN AL ${contrato.toUpperCase()}` },
        { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: modificacion },
      ]
    : [
        { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: b.titulo.toUpperCase() },
        { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: contrato.toUpperCase() },
      ];
  const entidad = d.ficha.entidad?.valor ?? '[Entidad]';
  const contratista = d.ficha.contratista?.valor ?? '[Contratista]';
  const ruc = d.ficha.ruc_contratista?.valor;
  return [
    ...titulo,
    ...(d.ficha.objeto?.valor ? [{ clase: 'titulo' as const, rol: 'subtitulo' as const, nivel: 0, texto: d.ficha.objeto.valor }] : []),
    ...nota(d),
    {
      clase: 'parrafo',
      texto: `En la ciudad de [●], a los [●] días del mes de [●] de ${d.anio}, reunidos los representantes de las partes:`,
    },
    {
      clase: 'lista',
      marca: 'vineta',
      elementos: [
        `**Por la Entidad:** ${entidad}, representada por [nombres y apellidos], [cargo], en adelante «LA ENTIDAD».`,
        `**Por el contratista:** ${contratista}${ruc ? `, con RUC N.° ${ruc}` : ''}, representada por [nombres y apellidos], en su calidad de [cargo], en adelante «EL CONTRATISTA».`,
      ],
    },
    { clase: 'parrafo', texto: '**EXPONEN:**', alineacion: 'izquierda' },
    ...b.secciones.flatMap((s, i): Pieza[] => [
      { clase: 'titulo', nivel: 1, numero: `${aRomano(i + 1)}.`, texto: s.titulo },
      ...piezasDelApartado(s.parrafos, i === 0 ? '1' : undefined),
    ]),
    ...pendientes(b),
    { clase: 'parrafo', texto: 'En constancia de lo anterior, las partes suscriben la presente acta en señal de conformidad:', margen: true },
    {
      clase: 'firmas',
      personas: [
        { nombre: '[Nombres y apellidos]', cargo: 'LA ENTIDAD' },
        { nombre: '[Nombres y apellidos]', cargo: 'EL CONTRATISTA' },
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
      ...piezasDelApartado(s.parrafos),
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
    case 'informe_legal':
      return piezasDelInformeLegal(d);
    case 'memorandum':
      return piezasDelMemorandum(d);
    default:
      return piezasDelInforme(d);
  }
}
