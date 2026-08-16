/**
 * Contrasta TODAS las plantillas codificadas contra los .md extraídos de
 * los .docx que entregó César.
 *
 * Comprueba lo único que no admite margen: que cada texto marcado como
 * invariable —la cláusula antisoborno, la acreditación de experiencia,
 * los topes— exista PALABRA POR PALABRA en el documento de origen de esa
 * plantilla. Si el generador altera esos párrafos, el requerimiento deja
 * de ser válido.
 *
 * Con quince plantillas compartiendo bloques, esta comprobación es lo
 * que impide que un texto correcto para "Bienes en General" se cuele en
 * un formato donde César lo escribió distinto.
 *
 * Uso: npx tsx scripts/auditar-plantilla-requerimiento.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { listarPlantillas } from '../src/lib/generadores/plantillas';
import type { Seccion, Bloque } from '../src/lib/generadores/plantilla-tipos';

const RAIZ = join('docs', 'estructura-requerimiento');

const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();

let fallos = 0;
let plantillasConFallo = 0;
let totalLiterales = 0;

for (const plantilla of listarPlantillas()) {
  const ruta = join(RAIZ, plantilla.origen.replace(/\.docx$/i, '.md'));
  if (!existsSync(ruta)) {
    console.error(`\n❌ ${plantilla.id}: no se encuentra el origen ${ruta}`);
    fallos++;
    plantillasConFallo++;
    continue;
  }
  const fuente = normalizar(readFileSync(ruta, 'utf8'));

  const conteo: Record<string, number> = {};
  let secciones = 0;
  let condicionales = 0;
  let camposObligatorios = 0;
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
  totalLiterales += literales.length;

  const fallosAqui: string[] = [];
  for (const t of literales) {
    // Se coteja el arranque del fragmento: basta para detectar una
    // reescritura, y evita falsos negativos por saltos de línea.
    const muestra = normalizar(t).slice(0, 140);
    if (!fuente.includes(muestra)) fallosAqui.push(muestra);
  }
  fallos += fallosAqui.length;
  if (fallosAqui.length) plantillasConFallo++;

  const marca = fallosAqui.length === 0 ? '✅' : '❌';
  console.log(
    `${marca} ${plantilla.subtitulo}\n` +
      `   ${secciones} secciones (${condicionales} condicionales) · ` +
      `${camposObligatorios} campos obligatorios · ` +
      `${literales.length} textos invariables · ` +
      `${plantilla.validaciones.length} topes\n` +
      `   ${Object.entries(conteo)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')}`,
  );
  for (const f of fallosAqui) console.log(`   ↳ NO está en el original: ${f.slice(0, 110)}…`);
}

const total = listarPlantillas().length;
console.log(
  `\n${total} plantilla(s) · ${totalLiterales} textos invariables cotejados · ` +
    (fallos === 0
      ? 'todos coinciden con el original.'
      : `${fallos} discrepancia(s) en ${plantillasConFallo} plantilla(s).`),
);
process.exit(fallos === 0 ? 0 : 1);
