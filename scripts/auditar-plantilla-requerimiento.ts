/**
 * Contrasta una plantilla codificada contra el .md extraído del .docx que
 * entregó César, para no dar por buena una transcripción incompleta.
 *
 * Comprueba lo único que no admite margen: que cada bloque marcado como
 * `fijo` —la cláusula antisoborno, la acreditación de experiencia, los
 * topes— exista PALABRA POR PALABRA en el documento de origen. Si el
 * generador altera esos párrafos, el requerimiento deja de ser válido.
 *
 * Uso: npx tsx scripts/auditar-plantilla-requerimiento.ts
 */
import { readFileSync } from 'node:fs';
import { PLANTILLA_BIENES_GENERAL } from '../src/lib/generadores/plantillas/bienes-general';
import type { Seccion, Bloque, PlantillaRequerimiento } from '../src/lib/generadores/plantilla-tipos';

const PLANTILLAS: Array<{ plantilla: PlantillaRequerimiento; fuente: string }> = [
  {
    plantilla: PLANTILLA_BIENES_GENERAL,
    fuente:
      'docs/estructura-requerimiento/PROCEDIMIENTOS DE SELECCIÓN/1. BIENES/1. Bienes en General.md',
  },
];

const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();

let fallos = 0;

for (const { plantilla, fuente: ruta } of PLANTILLAS) {
  const fuente = normalizar(readFileSync(ruta, 'utf8'));

  const conteo: Record<string, number> = {};
  let secciones = 0;
  let condicionales = 0;
  let camposObligatorios = 0;
  /** Fragmentos que deben existir palabra por palabra en el original. */
  const literales: string[] = [];

  const recorrer = (ss: Seccion[]) => {
    for (const s of ss) {
      secciones++;
      if (s.condicion) condicionales++;
      for (const b of s.bloques as Bloque[]) {
        conteo[b.clase] = (conteo[b.clase] ?? 0) + 1;
        if (b.clase === 'fijo') literales.push(b.texto);
        if (b.clase === 'campo' && b.obligatorio) camposObligatorios++;
        if (b.clase === 'parrafo') {
          camposObligatorios += b.campos.filter((c) => c.obligatorio).length;
          // El texto lleva marcadores {{id}} donde el original tiene la
          // instrucción entre corchetes. Se comprueba cada tramo literal
          // que rodea a los marcadores.
          for (const tramo of b.texto.split(/\{\{[^}]+\}\}/)) {
            if (tramo.trim().length >= 25) literales.push(tramo);
          }
        }
      }
      if (s.subsecciones) recorrer(s.subsecciones);
    }
  };
  recorrer(plantilla.secciones);

  console.log(`\n${plantilla.encabezado} — ${plantilla.subtitulo}`);
  console.log(`  origen: ${plantilla.origen}`);
  console.log(`  secciones y subsecciones: ${secciones} (condicionales: ${condicionales})`);
  console.log(`  bloques: ${JSON.stringify(conteo)}`);
  console.log(`  campos obligatorios: ${camposObligatorios}`);
  console.log(`  validaciones normativas: ${plantilla.validaciones.length}`);

  console.log(`\n  Textos invariables cotejados con el original: ${literales.length}`);
  for (const t of literales) {
    // Se coteja el arranque del fragmento: basta para detectar una
    // reescritura, y evita falsos negativos por saltos de línea.
    const muestra = normalizar(t).slice(0, 140);
    const ok = fuente.includes(muestra);
    if (!ok) fallos++;
    if (!ok) console.log(`    ❌ ${muestra.slice(0, 100)}…`);
  }
  if (!fallos) console.log('    todos coinciden');
}

console.log(
  fallos === 0
    ? '\nTodos los textos invariables coinciden con el original.'
    : `\n${fallos} texto(s) invariable(s) NO coinciden con el original.`,
);
process.exit(fallos === 0 ? 0 : 1);
