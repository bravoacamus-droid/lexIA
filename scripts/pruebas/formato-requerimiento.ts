#!/usr/bin/env tsx
/**
 * El Word del requerimiento sale con la forma del formato de César.
 *
 * `npx tsx scripts/pruebas/formato-requerimiento.ts`
 *
 * Lo que se comprueba se midió abriendo por dentro sus quince .docx
 * (setiembre de 2026). Se prueba en las quince plantillas, en blanco y
 * con todo relleno, porque un requerimiento a medio hacer también se
 * descarga y circula.
 *
 *   · A4, márgenes de 3 cm, Arial 10.
 *   · Ni «Generado con A-LexIA» ni ningún otro sello.
 *   · El cuadro de datos abre el documento, en dos columnas, con las
 *     etiquetas sobre gris, y SIN número.
 *   · El primer apartado es la finalidad pública con «1.» —o «I.» en los
 *     anexos de 8 UIT—.
 *   · Toda cabecera de cuadro va sobre el gris del formato.
 *   · En los de 8 UIT, el cuerpo va en la ficha de una columna.
 *   · Y lo más importante: ningún texto se queda por el camino. Todo lo
 *     que trae el Markdown —que es lo que se ve en pantalla— tiene que
 *     estar en el Word.
 */
import JSZip from 'jszip';
import { listarPlantillas } from '../../src/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  respuestasVacias,
  type RespuestasRequerimiento,
} from '../../src/lib/generadores/ensamblador';
import type { Seccion, PlantillaRequerimiento } from '../../src/lib/generadores/plantilla-tipos';
import { requerimientoADocx } from '../../src/lib/generadores/documento';

let fallos = 0;
function comprobar(que: string, ok: boolean, detalle?: string) {
  if (!ok) {
    fallos++;
    console.log(`   ❌ ${que}${detalle ? ` — ${detalle}` : ''}`);
  }
}

/** Todas las condiciones encendidas, para que salga el documento entero. */
function todasLasCondiciones(secciones: Seccion[]): Record<string, boolean> {
  const c: Record<string, boolean> = {};
  const rec = (s: Seccion) => {
    if (s.condicion) c[s.condicion] = true;
    for (const b of s.bloques) if ('visibleSi' in b && b.visibleSi?.condicion) c[b.visibleSi.condicion] = true;
    for (const h of s.subsecciones ?? []) rec(h);
  };
  secciones.forEach(rec);
  return c;
}

function relleno(p: PlantillaRequerimiento): RespuestasRequerimiento {
  const r: RespuestasRequerimiento = {
    ...respuestasVacias(),
    condiciones: todasLasCondiciones(p.secciones),
  };
  const rec = (s: Seccion) => {
    for (const b of s.bloques) {
      if (b.clase === 'campo') r.campos[b.id] = `Dato de ${b.etiqueta}`;
      else if (b.clase === 'parrafo') for (const c of b.campos) r.campos[c.id] = `dato ${c.etiqueta}`;
      else if (b.clase === 'redactado') r.redacciones[b.id] = `Texto de ${b.etiqueta}.\n- primer punto\n- segundo punto`;
      else if (b.clase === 'opcion') r.opciones[b.id] = b.opciones[0].valor;
      else if (b.clase === 'tabla')
        r.tablas[b.id] = [b.columnas.map((_c, j) => (j === 0 ? '1' : `celda ${j}`))];
    }
    for (const h of s.subsecciones ?? []) rec(h);
  };
  p.secciones.forEach(rec);
  return r;
}

/** El texto plano de un documento de Word, párrafo a párrafo. */
function textoDe(xml: string): string {
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [])
    .map((p) =>
      (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [])
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join(''),
    )
    .join('\n');
}

/** Lo que dice un texto, sin marcas ni espacios de sobra. */
const plano = (s: string) =>
  s
    // Las marcas de negrita se quitan sin dejar hueco: «de **[PENDIENTE]**,»
    // es «de [PENDIENTE],» y no «de [PENDIENTE] ,».
    .replace(/[*`]/g, '')
    .replace(/[#>|]/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

void (async () => {
  const plantillas = listarPlantillas();
  for (const p of plantillas) {
    for (const [caso, respuestas] of [
      ['en blanco', { ...respuestasVacias(), condiciones: todasLasCondiciones(p.secciones) }],
      ['relleno', relleno(p)],
    ] as const) {
      const antes = fallos;
      const doc = ensamblarRequerimiento(p, respuestas, { cuantia: 100_000 });
      const buf = await requerimientoADocx(doc.piezas, p);
      const zip = await JSZip.loadAsync(buf);
      const xml = await zip.file('word/document.xml')!.async('string');
      const estilos = await zip.file('word/styles.xml')!.async('string');
      const texto = textoDe(xml);

      comprobar('A4', /<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/.test(xml));
      comprobar('márgenes de 3 cm', /<w:pgMar[^>]*w:top="1701"[^>]*w:right="1701"[^>]*w:bottom="1701"[^>]*w:left="1701"/.test(xml));
      comprobar('Arial 10 por defecto', /w:ascii="Arial"/.test(estilos) && /<w:sz w:val="20"\/>/.test(estilos));
      comprobar('sin sello de A-LexIA', !/A-LexIA/i.test(texto), 'el documento lo firma el área usuaria');

      // El cuadro de datos: la primera tabla, dos columnas, etiquetas grises.
      const primera = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)?.[0] ?? '';
      const filasDatos = primera.match(/<w:tr>/g)?.length ?? 0;
      comprobar('el cuadro de datos abre el documento', /Órgano y\/o Dirección/.test(primera));
      comprobar('con sus cuatro filas', filasDatos === 4, `${filasDatos}`);
      comprobar('y las etiquetas sobre gris', (primera.match(/w:fill="D5DCE4"/g)?.length ?? 0) === 4);
      comprobar('y no se numera', !/\bDatos de la contratación\b/.test(texto));

      // El primer apartado.
      const romano = p.familia === 'menor_8_uit';
      const primerTitulo = texto.split('\n').find((l) => /^(\d+|[IVX]+)\.\t/.test(l)) ?? '';
      comprobar(
        `el primer apartado es la finalidad con «${romano ? 'I.' : '1.'}»`,
        primerTitulo.startsWith(romano ? 'I.\tFINALIDAD' : '1.\tFINALIDAD'),
        primerTitulo.slice(0, 50),
      );
      if (romano) {
        comprobar('va en la ficha de una columna', /<w:gridCol w:w="8504"\/><\/w:tblGrid>/.test(xml));
      }

      // Cada cuadro, con la cabecera gris. Se cuenta la primera fila de
      // cada tabla que no es la de datos ni la ficha.
      const tablas = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) ?? [];
      for (const t of tablas.slice(1)) {
        if (/<w:gridCol w:w="8504"\/><\/w:tblGrid>/.test(t)) continue;
        const cab = t.match(/<w:tr>[\s\S]*?<\/w:tr>/)?.[0] ?? '';
        comprobar('cabecera de cuadro sobre gris', /w:fill="D5DCE4"/.test(cab));
      }

      // Nada se pierde: cada línea con texto del Markdown está en el Word.
      const enWord = plano(texto);
      const perdidas = doc.markdown
        .split('\n')
        .map((l) => l.replace(/^\s*(?:#+|>|-|\d+\.|[a-z]{1,2}\))\s*/, ''))
        .map(plano)
        .filter((l) => l.length > 3 && !/^-+$/.test(l.replace(/\s/g, '')))
        // Los numerales van separados por tabulador en el Word.
        .filter((l) => !enWord.includes(l) && !enWord.includes(l.replace(/^(\S+) /, '$1 ')));
      comprobar('ningún texto del Markdown se pierde', perdidas.length === 0, perdidas.slice(0, 2).join(' | '));

      if (fallos === antes) console.log(`✅ ${p.id.padEnd(34)} ${caso}`);
      else console.log(`   ↑ ${p.id} (${caso})`);
    }
  }
  console.log(fallos ? `\n❌ ${fallos} problema(s).` : `\n✅ Las ${plantillas.length} plantillas salen con la forma del formato.`);
  process.exit(fallos ? 1 : 0);
})();
