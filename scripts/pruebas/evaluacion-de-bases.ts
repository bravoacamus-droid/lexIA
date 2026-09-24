#!/usr/bin/env tsx
/**
 * La evaluación de bases: lo que no depende del modelo.
 *
 * `npx tsx scripts/pruebas/evaluacion-de-bases.ts`
 *
 * Con las cuatro bases integradas que entregó César (bienes, servicios,
 * consultoría de obra y obras):
 *
 *   · se identifica la bases estándar de cada una;
 *   · la Sección General coteja sin un solo aviso falso —son bases
 *     publicadas, y la Sección General no se puede tocar—;
 *   · y es sensible: si se cambia una frase y se borra otra de la
 *     Sección General, las dos salen.
 *   · Los capítulos de la sección específica se encuentran donde están.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import estandares from '../../src/lib/evaluacion/bases/estandar.generado.json';
import { cotejarBases, identificarEstandar, prepararBases, type BasesEstandar } from '../../src/lib/evaluacion/bases/cotejo';
import { sinCabeceras } from '../../src/lib/evaluacion/bases/paginas';
import { partirEnCapitulos } from '../../src/lib/evaluacion/bases/capitulos';
import { hallazgosDeLaSeccionGeneral } from '../../src/lib/evaluacion/bases/evaluar';
import { piezasDelInforme } from '../../src/lib/evaluacion/bases/informe';

const CARPETA = '2. DOCUMENTOS PARA PROCEDIMIENTOS DE SELECCIÓN/2. BASES LLENADAS';
const ESPERADO: Record<string, string> = {
  'MODELO DE BIENES': 'be-1',
  'MODELO DE CONSULTORÍA': 'be-13',
  'MODELO DE EJECUCIÓN DE OBRAS': 'be-6',
  'MODELO DE SERVICIOS': 'be-9',
};

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

async function leer(ruta: string): Promise<string> {
  if (ruta.endsWith('.docx')) return (await mammoth.extractRawText({ path: ruta })).value;
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(ruta)));
  return sinCabeceras((await extractText(pdf, { mergePages: false })).text as string[]);
}

void (async () => {
  let textoServicios = '';
  for (const [carpeta, id] of Object.entries(ESPERADO)) {
    const archivo = readdirSync(`${CARPETA}/${carpeta}`)[0];
    const texto = await leer(`${CARPETA}/${carpeta}/${archivo}`);
    if (id === 'be-9') textoServicios = texto;
    const b = prepararBases(texto);
    const elegida = identificarEstandar(b, estandares as BasesEstandar[])[0].estandar;
    console.log(`\n${carpeta}`);
    comprobar(`se identifica como ${id} (${elegida.titulo})`, elegida.id === id, elegida.id);
    const cotejo = cotejarBases(b, elegida);
    const general = hallazgosDeLaSeccionGeneral(cotejo);
    comprobar('la Sección General coteja sin avisos falsos', general.length === 0, general.map((h) => h.titulo).join(' | '));
    const caps = JSON.parse(readFileSync(`src/lib/evaluacion/bases/capitulos/${elegida.id}.json`, 'utf8'));
    const partes = partirEnCapitulos(b, cotejo, caps);
    const numeros = partes.map((p) => p.rotulo.replace('CAPÍTULO ', '')).join(',');
    comprobar(
      `sus capítulos se encuentran (${numeros})`,
      partes.length >= 4 && partes.every((p) => /^CAP[IÍ]TULO/.test(p.bases)),
      numeros,
    );
  }

  console.log('\nSensibilidad de la Sección General');
  {
    // Una frase cambiada y otra borrada, en textos de la Sección General
    // de las bases del CPA 008-2026.
    const cambiada = 'Dicha fecha no puede ser fijada en menos de tres días hábiles';
    const borrada = 'Las empresas que emitan garantías financieras deben encontrarse bajo la supervisión directa';
    comprobar('las dos frases están en las bases', textoServicios.replace(/\s+/g, ' ').includes(cambiada) && textoServicios.replace(/\s+/g, ' ').includes(borrada));
    const alterado = textoServicios
      .replace(/\s+/g, ' ')
      .replace(cambiada, 'Dicha fecha puede ser fijada en un día hábil')
      .replace(new RegExp(`${borrada}[^.]*\\.`), '');
    const b = prepararBases(alterado);
    const e = (estandares as BasesEstandar[]).find((x) => x.id === 'be-9')!;
    const h = hallazgosDeLaSeccionGeneral(cotejarBases(b, e));
    comprobar('salen las dos diferencias', h.length >= 2, h.map((x) => x.titulo).join(' | '));
    comprobar('la frase cambiada, como modificación indebida', h.some((x) => x.tipo === 'modificacion_indebida' && /tres días hábiles/.test(x.enElEstandar ?? '')), h.map((x) => `${x.tipo}: ${(x.enElEstandar ?? '').slice(0, 60)}`).join(' | '));
    comprobar('y la otra también', h.some((x) => /garantías financieras/.test(x.enElEstandar ?? '')), h.map((x) => `${x.tipo}: ${(x.enElEstandar ?? '').slice(0, 60)}`).join(' | '));
  }

  console.log('\nInforme');
  {
    const piezas = piezasDelInforme({
      titulo: 'Prueba',
      documento: 'bases.pdf',
      para: 'entidad',
      resultado: {
        generadoEn: '2026-09-23T12:00:00Z',
        origen: 'pdf',
        estandar: { id: 'be-9', titulo: 'Concurso Público Abreviado de Servicios', parecido: 0.9 },
        alternativas: [],
        seccionGeneral: { textos: 118, modificados: 0, faltan: 0 },
        capitulosRevisados: ['CAPÍTULO III — REQUERIMIENTO'],
        resumen: 'Resumen.',
        hallazgos: [
          {
            id: 'x',
            tipo: 'restriccion_injustificada',
            severidad: 'alto',
            titulo: 'Radio de 7 km',
            seccion: 'Específica',
            capitulo: 'CAPÍTULO III — REQUERIMIENTO',
            numeral: '3.3',
            enLasBases: 'no mayor a 7 km',
            analisis: 'Restringe.',
            norma: 'numeral 44.6 del Reglamento',
            paraElProveedor: { tipo: 'observacion', solicitud: 'Eliminarlo.' },
            paraLaEntidad: 'Quitar el radio.',
            origen: 'revision',
            avisos: [],
          },
        ],
      },
    });
    const cuadro = piezas.find((p) => p.clase === 'cuadro') as { filas: Array<Array<{ texto: string }>> } | undefined;
    comprobar('la última columna es la de la Entidad', cuadro?.filas[0][4].texto === 'Qué corregir antes de publicar');
    comprobar('y dice qué corregir', cuadro?.filas[1][4].texto === 'Quitar el radio.');
  }

  console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ La evaluación de bases coteja bien y sin avisos falsos.');
  process.exit(fallos ? 1 : 0);
})();
