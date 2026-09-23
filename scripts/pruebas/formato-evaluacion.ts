#!/usr/bin/env tsx
/**
 * El acta de evaluación y la carta de subsanación salen con la forma de
 * los modelos de César.
 *
 * `npx tsx scripts/pruebas/formato-evaluacion.ts`
 *
 * Con una evaluación inventada pero completa —tres postores: uno que gana,
 * uno que tiene que subsanar en admisión y uno que no califica—, para no
 * depender de lo que haya en la base. Lo que se comprueba sale del
 * «Acta de Evaluación - OK.docx» y de su «CARTA DE MODIFICACIÓN DE
 * CONTRATO», abiertos por dentro en setiembre de 2026.
 */
import JSZip from 'jszip';
import { actaADocx, construirActa } from '../../src/lib/evaluacion/acta';
import { cartaADocx, tieneQueSubsanar } from '../../src/lib/evaluacion/carta';
import type { ResultadoPostor, FichaRequisito, Etapa, Resultado } from '../../src/lib/evaluacion/etapas';
import type { LecturaBases } from '../../src/lib/evaluacion/motor';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

const ficha = (requisito: string, resultado: Resultado, puntaje?: number, puntajeMaximo?: number): FichaRequisito => ({
  id: '',
  requisito,
  reglaBases: 'Numeral de las bases',
  documentoPresentado: 'Documento',
  evidencia: [],
  hallazgo: `Hallazgo sobre ${requisito.toLowerCase()}.`,
  jurisprudencia: [],
  resultado,
  confianza: 'alta',
  puntaje,
  puntajeMaximo,
});

const etapa = (e: Etapa, resultado: Resultado, fichas: FichaRequisito[], extra: Partial<ResultadoPostor['etapas'][number]> = {}) => ({
  etapa: e,
  resultado,
  fichas,
  subsanaciones: [],
  fundamento: `Fundamento de ${e}.`,
  ...extra,
});

const BASES: LecturaBases = {
  procedimiento: {
    entidad: 'Municipalidad de Prueba',
    numero: 'CONCURSO PÚBLICO N.° 001-2026-MP/CS-1',
    objeto: 'Servicio',
    denominacion: 'Servicio de limpieza de la sede institucional',
  },
  admision: [
    { id: 'a1', requisito: 'Declaración jurada de datos del postor', reglaBases: 'Anexo N.° 1' },
    { id: 'a2', requisito: 'Pacto de integridad', reglaBases: 'Anexo N.° 2' },
  ],
  calificacion: [{ id: 'c1', requisito: 'Experiencia del postor en la especialidad', reglaBases: 'S/ 200 000' }],
  factores: [{ id: 'f1', requisito: 'Experiencia del personal clave', reglaBases: 'Hasta 100 puntos', puntajeMaximo: 100 }],
  evaluacionEconomica: { puntajeMaximo: 100, formula: 'Pi = Om × PMPE / Oi.' },
  puntajeTecnicoMinimo: 70,
  advertencias: [],
};

const POSTORES: ResultadoPostor[] = [
  {
    postor: 'LIMPIEZA TOTAL S.A.C.',
    etapas: [
      etapa('admision', 'cumple', [ficha('Declaración jurada de datos del postor', 'cumple'), ficha('Pacto de integridad', 'cumple')]),
      etapa('calificacion', 'cumple', [ficha('Experiencia del postor en la especialidad', 'cumple')]),
      etapa('evaluacion', 'cumple', [ficha('Experiencia del personal clave', 'cumple', 90, 100)], { puntaje: 90 }),
    ],
    puntajeTecnico: 90,
    prelacion: 1,
  } as ResultadoPostor,
  {
    postor: 'SERVICIOS GENERALES DEL SUR E.I.R.L.',
    etapas: [
      etapa('admision', 'subsanable', [ficha('Declaración jurada de datos del postor', 'cumple'), ficha('Pacto de integridad', 'subsanable')], {
        subsanaciones: ['Presentar el pacto de integridad firmado por el representante legal.'],
      }),
      etapa('calificacion', 'cumple', [ficha('Experiencia del postor en la especialidad', 'cumple')]),
      etapa('evaluacion', 'cumple', [ficha('Experiencia del personal clave', 'cumple', 75, 100)], { puntaje: 75 }),
    ],
    puntajeTecnico: 75,
    prelacion: 2,
  } as ResultadoPostor,
  {
    postor: 'CONSORCIO ASEO NORTE',
    etapas: [
      etapa('admision', 'cumple', [ficha('Declaración jurada de datos del postor', 'cumple'), ficha('Pacto de integridad', 'cumple')]),
      etapa('calificacion', 'no_cumple', [ficha('Experiencia del postor en la especialidad', 'no_cumple')]),
      etapa('evaluacion', 'no_cumple', [], { omitida: true, motivoOmision: 'No calificó.' }),
    ],
  } as ResultadoPostor,
];

async function abrir(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')!.async('string');
  const parrafos = (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map((p) =>
    (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [])
      .map((t) =>
        t
          .replace(/<[^>]+>/g, '')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&'),
      )
      .join(''),
  );
  return { xml, parrafos, texto: parrafos.join('\n') };
}

void (async () => {
  console.log('── El acta ──');
  const acta = await abrir(await actaADocx({ bases: BASES, postores: POSTORES }));
  comprobar('tamaño carta, como el modelo', /<w:pgSz w:w="12240" w:h="15840"/.test(acta.xml));
  comprobar('los anexos en una hoja apaisada', /w:orient="landscape"/.test(acta.xml));
  comprobar('sin sello de A-LexIA', !/A-LexIA/i.test(acta.texto));
  comprobar('sin asteriscos impresos', !acta.texto.includes('**'));

  const titulos = acta.parrafos.filter((p) => /^[IVXL]+\.\t/.test(p)).map((p) => p.split('\t')[1]);
  const orden = [
    'DATOS DEL PROCEDIMIENTO',
    'INSTALACIÓN DE LA SESIÓN',
    'SOBRE EL QUORUM Y LOS MIEMBROS PARTICIPANTES DE LA SESIÓN',
    'DETALLE DE LOS POSTORES',
    'DETALLE DE LAS OFERTAS EN LA ETAPA DE ADMISIÓN',
    'SUBSANACIÓN DE LA OFERTA EN LA ETAPA DE ADMISIÓN',
    'RESULTADO CONSOLIDADO DE LA ETAPA DE ADMISIÓN DE OFERTAS',
    'EVALUACIÓN DE LOS REQUISITOS DE CALIFICACIÓN',
    'SUBSANACIÓN DE LA OFERTA EN LA ETAPA DE CALIFICACIÓN',
    'RESULTADO CONSOLIDADO DE LA ETAPA DE CALIFICACIÓN DE OFERTAS',
    'EVALUACIÓN DE LOS FACTORES DE EVALUACIÓN TÉCNICA',
    'SUBSANACIÓN DE LA OFERTA EN LA ETAPA DE EVALUACIÓN TÉCNICA',
    'RESULTADO CONSOLIDADO DE LA ETAPA DE EVALUACIÓN TÉCNICA',
    'EVALUACIÓN ECONÓMICA DE LAS OFERTAS',
  ];
  comprobar(
    'los apartados del modelo, en su orden y en romanos',
    orden.every((t, i) => titulos[i] === t),
    titulos.slice(0, orden.length).join(' / '),
  );
  comprobar('y acaba con el acuerdo', titulos[titulos.length - 1] === 'ACUERDO ADOPTADO');
  comprobar(
    'la subsanación lleva su declaración y su matriz de trazabilidad',
    acta.parrafos.some((p) => /^6\.1\.\tDeclaración sobre la exigencia de subsanación$/.test(p)) &&
      acta.parrafos.some((p) => /^6\.2\.\tMatriz de trazabilidad de la subsanación$/.test(p)),
  );
  comprobar(
    'y en la etapa sin observaciones, la constancia del modelo',
    acta.texto.includes('deja constancia de que no se requirió subsanación durante la etapa de calificación'),
  );
  comprobar('la subsanación se notifica por la Pladicop (numeral 78.1)', acta.texto.includes('Pladicop'));
  for (const n of ['01 – Requisitos de Admisión', '02 – Requisitos de Calificación', '03 – Factores de Evaluación Técnica']) {
    comprobar(`trae el Anexo N.° ${n}`, acta.texto.includes(`Anexo N.° ${n}`));
  }
  comprobar(
    'el anexo de admisión compara postor por postor',
    acta.texto.includes('Observado') && POSTORES.every((p) => acta.texto.includes(p.postor)),
  );
  comprobar('el cuadro de firmas del modelo', (acta.texto.match(/Nombres y apellidos/g) ?? []).length >= 3);
  comprobar(
    'las cabeceras de los cuadros sobre el gris del modelo',
    (acta.xml.match(/w:fill="D5DCE4"/g) ?? []).length > 20,
  );
  comprobar('y las fichas de cabecera en crema', /w:fill="EEECE1"/.test(acta.xml));

  // El Markdown sale de las mismas piezas: no puede decir otra cosa.
  const md = construirActa({ bases: BASES, postores: POSTORES });
  const plano = (s: string) => s.replace(/[*#>|`]/g, '').replace(/\s+/g, ' ').trim();
  const enWord = plano(acta.texto.replace(/\t/g, ' '));
  const perdidas = md
    .split('\n')
    // Una fila de tabla se compara celda a celda: en Word cada celda es su
    // propio párrafo. Y dentro de una celda, cada renglón (« · »).
    .flatMap((l) =>
      l.trim().startsWith('|') ? l.split(/(?<!\\)\|/).flatMap((c) => c.split(' · ')) : [l],
    )
    .map((l) => plano(l.replace(/^\s*(?:#+|-)\s*/, '')))
    // Las líneas separadoras de las tablas —«| --- | --- |»— no son texto.
    .filter((l) => l.length > 3 && !/^[-\s]+$/.test(l) && l !== 'Firma')
    .filter((l) => !enWord.includes(l));
  comprobar('el Markdown y el Word dicen lo mismo', perdidas.length === 0, perdidas.slice(0, 2).join(' | '));

  console.log('\n── La carta ──');
  const observado = POSTORES.find(tieneQueSubsanar)!;
  comprobar('solo el postor observado tiene carta', POSTORES.filter(tieneQueSubsanar).length === 1);
  const carta = await abrir(await cartaADocx({ bases: BASES, postor: observado }));
  comprobar('A4, como las cartas del modelo', /<w:pgSz w:w="11906" w:h="16838"/.test(carta.xml));
  comprobar('sin sello de A-LexIA', !/A-LexIA/i.test(carta.texto));
  comprobar('sin asteriscos impresos', !carta.texto.includes('**'));
  comprobar('abre con su número de carta', carta.parrafos[0]?.startsWith('CARTA N.°'));
  comprobar('el destinatario y «Presente.-»', carta.texto.includes(observado.postor) && carta.texto.includes('Presente.-'));
  comprobar('asunto y referencia', carta.texto.includes('ASUNTO:') && carta.texto.includes('REFERENCIA:'));
  comprobar(
    'los apartados del modelo, numerados',
    ['1.\tObjeto de la subsanación', '2.\tPlazo', '3.\tMedio de subsanación', '4.\tConsecuencia de no subsanar'].every((t) =>
      carta.parrafos.includes(t),
    ),
  );
  comprobar('lo que tiene que subsanar', carta.texto.includes('Pacto de integridad'));
  comprobar('y la firma bajo su línea', carta.texto.includes('___________________________'));

  console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ El acta y la carta salen con la forma de los modelos.');
  process.exit(fallos ? 1 : 0);
})();
