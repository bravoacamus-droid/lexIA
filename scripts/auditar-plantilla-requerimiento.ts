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
import { DIVERGENCIAS_DECLARADAS } from './lib/divergencias-requerimiento';

const RAIZ = join('docs', 'estructura-requerimiento');

const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();

// Para COTEJAR se quitan todos los espacios. En los .md extraídos de
// las tablas del Word las frases quedan pegadas —"...de postores.Al
// calificar la experiencia..."— y esa falta de espacio hacía fallar un
// texto que sí estaba, palabra por palabra, en el original.
// También se ignoran las mayúsculas: el .docx escribe unas veces
// "Reglamento" y otras "reglamento", y eso no cambia el texto.
const comparable = (s: string) => s.replace(/\s+/g, '').toLowerCase();

let fallos = 0;
let declaradas = 0;
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
  const fuente = comparable(readFileSync(ruta, 'utf8'));

  const conteo: Record<string, number> = {};
  let secciones = 0;
  let condicionales = 0;
  let camposObligatorios = 0;
  const literales: Array<{ texto: string; cadena: string[] }> = [];

  const recorrer = (ss: Seccion[], raiz: string[] = []) => {
    for (const s of ss) {
      // Todos los apartados de los que cuelga el texto, para poder
      // declarar una divergencia por apartado y no párrafo a párrafo.
      const suyo = [...raiz, s.id];
      secciones++;
      if (s.condicion) condicionales++;
      for (const b of s.bloques as Bloque[]) {
        conteo[b.clase] = (conteo[b.clase] ?? 0) + 1;
        if (b.clase === 'fijo') literales.push({ texto: b.texto, cadena: suyo });
        if (b.clase === 'campo' && b.obligatorio) camposObligatorios++;
        if (b.clase === 'parrafo') {
          camposObligatorios += b.campos.filter((c) => c.obligatorio).length;
          // El texto lleva marcadores {{id}} donde el original tiene la
          // instrucción entre corchetes. Se comprueba cada tramo literal
          // que rodea a los marcadores.
          for (const tramo of b.texto.split(/\{\{[^}]+\}\}/)) {
            if (tramo.trim().length >= 25) literales.push({ texto: tramo, cadena: suyo });
          }
        }
      }
      if (s.subsecciones) recorrer(s.subsecciones, suyo);
    }
  };
  recorrer(plantilla.secciones);
  totalLiterales += literales.length;

  const fallosAqui: string[] = [];
  const declaradasAqui: string[] = [];
  // Los apartes deliberados —los que pidieron las observaciones de
  // César— se cuentan aparte para que no tapen a los accidentales.
  const declarables = DIVERGENCIAS_DECLARADAS.filter(
    (d) => d.plantilla === plantilla.id || d.plantilla === '*',
  );
  const permitidas = declarables.flatMap((d) => (d.fragmento ? [normalizar(d.fragmento)] : []));
  const apartadosDeclarados = new Set(declarables.flatMap((d) => (d.seccion ? [d.seccion] : [])));
  for (const { texto: t, cadena } of literales) {
    if (cadena.some((x) => apartadosDeclarados.has(x))) {
      declaradasAqui.push(normalizar(t));
      continue;
    }
    // Se coteja el fragmento ENTERO. Antes se cotejaban los primeros
    // 140 caracteres, y por ahí se coló una frase inventada: los dos
    // formatos de obras cerraban la subcontratación con "Se consideran
    // prestaciones esenciales que no pueden ser materia de
    // subcontratación las siguientes:", que no está en su .docx, y el
    // documento salía con los dos puntos y nada debajo. Empezaba igual
    // que el original, así que el auditor la daba por buena.
    const muestra = normalizar(t);
    if (fuente.includes(comparable(t))) continue;
    if (permitidas.some((d) => muestra.startsWith(d) || d.startsWith(muestra))) {
      declaradasAqui.push(muestra);
      continue;
    }
    fallosAqui.push(muestra);
  }
  declaradas += declaradasAqui.length;
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
  for (const d of declaradasAqui)
    console.log(`   ↳ se aparta del original a propósito: ${d.slice(0, 90)}…`);
}

const total = listarPlantillas().length;
console.log(
  `\n${total} plantilla(s) · ${totalLiterales} textos invariables cotejados · ` +
    (fallos === 0
      ? 'todos coinciden con el original.'
      : `${fallos} discrepancia(s) en ${plantillasConFallo} plantilla(s).`) +
    (declaradas ? ` ${declaradas} aparte(s) declarado(s), por observación de César.` : ''),
);
process.exit(fallos === 0 ? 0 : 1);
