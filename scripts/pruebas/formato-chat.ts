#!/usr/bin/env tsx
/**
 * El Word del chat generador: del Markdown del modelo a la forma de los
 * documentos de César.
 *
 * `npx tsx scripts/pruebas/formato-chat.ts`
 *
 * El Markdown de prueba tiene las formas que se midieron en las
 * respuestas guardadas: título, subtítulo, apartados «## I.» y
 * «### 4.1.», listas, un cuadro, una cita, separadores y las marcas de
 * fuente del chat.
 */
import JSZip from 'jszip';
import { markdownAPiezas } from '../../src/lib/documentos/desde-markdown';
import { FORMATO_DOCUMENTO, piezasADocx } from '../../src/lib/documentos/word';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  console.log(`   ${ok ? '✅' : '❌'} ${que}${!ok && detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

const MD = `# TÉRMINOS DE REFERENCIA (TDR)

## CONTRATACIÓN DEL SERVICIO DE LIMPIEZA DE LA SEDE CENTRAL

---

## I. ANTECEDENTES
La Entidad cuenta con una sede central [9] donde se atiende a la ciudadanía [1], [4].

## II. OBJETO DE LA CONTRATACIÓN

### 2.1. Objetivo general
Contratar el **servicio de limpieza** de la sede.

### **2.2. Objetivos específicos**
- Ambientes limpios.
- Servicios higiénicos abastecidos.

1. Primera actividad.
2. Segunda actividad.

| N° | Entregable | Plazo |
|---|---|---|
| 1 | Informe mensual | 5 días \\| hábiles |

> Conforme al artículo 5 de la Ley N.° 32069.

Firma: [Nombre del funcionario]
`;

void (async () => {
  const piezas = markdownAPiezas(MD);
  const titulos = piezas.filter((p) => p.clase === 'titulo');
  comprobar('el título del documento, como encabezado', titulos[0]?.clase === 'titulo' && (titulos[0] as any).rol === 'encabezado');
  comprobar('el primer «##» sin número, como subtítulo', (titulos[1] as any)?.rol === 'subtitulo');
  comprobar(
    'los apartados separan su numeral',
    titulos.some((t: any) => t.numero === 'I.' && t.texto === 'ANTECEDENTES' && t.nivel === 1) &&
      titulos.some((t: any) => t.numero === '2.1.' && t.texto === 'Objetivo general' && t.nivel === 2),
  );
  comprobar(
    'y quitan la negrita que envuelve un título',
    titulos.some((t: any) => t.numero === '2.2.' && t.texto === 'Objetivos específicos'),
  );
  const listas = piezas.filter((p) => p.clase === 'lista') as any[];
  comprobar(
    'una lista con guiones y otra numerada',
    listas.some((l) => l.marca === 'vineta' && l.elementos.length === 2) &&
      listas.some((l) => l.marca === 'numero' && l.elementos.length === 2),
  );
  const tabla = piezas.find((p) => p.clase === 'tabla') as any;
  comprobar(
    'el cuadro, con su barra escapada dentro de la celda',
    tabla?.columnas.length === 3 && tabla?.filas[0][2] === '5 días | hábiles',
    JSON.stringify(tabla?.filas),
  );

  const buf = await piezasADocx(piezas, FORMATO_DOCUMENTO);
  const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string');
  const texto = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(' ');
  comprobar('A4', /<w:pgSz w:w="11906" w:h="16838"/.test(xml));
  comprobar('sin sello de A-LexIA', !/A-LexIA/i.test(texto));
  comprobar('sin las marcas de fuente del chat', !/\[\d{1,3}\]/.test(texto));
  comprobar('sin los separadores', !/---/.test(texto));
  comprobar('sin asteriscos impresos', !texto.includes('**'));
  comprobar('el hueco, en rojo', /<w:color w:val="EE0000"\/>[\s\S]{0,300}\[Nombre del funcionario\]/.test(xml));
  comprobar('la cabecera del cuadro, en el gris de los modelos', /w:fill="D5DCE4"/.test(xml));
  comprobar(
    'y todo el texto llega',
    ['La Entidad cuenta con una sede central', 'donde se atiende a la ciudadanía', 'servicio de limpieza', 'Ambientes limpios', 'Segunda actividad', 'Informe mensual', 'artículo 5 de la Ley'].every((f) =>
      texto.includes(f),
    ),
  );

  console.log(fallos ? `\n❌ ${fallos} problema(s).` : '\n✅ El Word del chat sale con la forma de los documentos.');
  process.exit(fallos ? 1 : 0);
})();
