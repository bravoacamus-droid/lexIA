#!/usr/bin/env tsx
/**
 * Comprueba contra el modelo real que "Mejorar redacción" mejora en vez
 * de reescribir.
 *
 * POR QUÉ EXISTE
 *
 * Hasta el 18/08/2026 el botón enviaba solo la nota de apoyo y nunca el
 * texto que el área usuaria ya tenía escrito: generaba un apartado nuevo
 * y descartaba el suyo en silencio. La observación de César fue exacta —
 * "debe haber una opción para mejorar la redacción con la IA cada
 * cláusula"—. Con el arreglo, el riesgo se invierte: que el modelo
 * "mejore" cambiando un plazo o una cantidad, que son decisiones del
 * área usuaria y no suyas.
 *
 * Esto no lo detecta ningún tipo ni ninguna prueba estructural: hay que
 * llamar al modelo y mirar si los datos siguen ahí.
 *
 * Uso: npx tsx scripts/probar-mejora-redaccion.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { obtenerPlantilla } from '../src/lib/generadores/plantillas';
import {
  promptSistema,
  promptUsuario,
  limpiarRedaccion,
  redaccionUtil,
} from '../src/lib/generadores/redactor';
import type { BloqueRedactado, Seccion } from '../src/lib/generadores/plantilla-tipos';

config({ path: join(process.cwd(), '.env.local'), override: true });

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const modelo = google(process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash');

let fallos = 0;
const problema = (m: string) => {
  console.log(`   ❌ ${m}`);
  fallos++;
};

/** Primer bloque redactado de la plantilla, para no fijar un id a mano. */
function primerRedactado(secciones: Seccion[]): BloqueRedactado | null {
  for (const s of secciones) {
    for (const b of s.bloques) if (b.clase === 'redactado') return b;
    if (s.subsecciones) {
      const r = primerRedactado(s.subsecciones);
      if (r) return r;
    }
  }
  return null;
}

/**
 * Texto deliberadamente mal escrito pero con decisiones reales dentro.
 * Todas las cifras tienen que sobrevivir a la mejora.
 */
const ESCRITO = `el servicio es para dar mantenimiento a los 14 aires acondicionados de la sede central,
se hace 2 veces al año, o sea cada 6 meses, y el proveedor tiene que traer sus propios repuestos.
el plazo es de 180 dias calendario contados desde el dia siguiente de la firma del contrato.
tambien tiene que dejar un informe cada vez que termina.`;

/**
 * Los datos que tienen que sobrevivir a la mejora, en cifra o en letra.
 *
 * El registro jurídico escribe los números en palabras —"catorce (14)",
 * "cada seis meses"—, así que exigir el dígito comprueba el estilo del
 * modelo en vez de lo que importa: que la decisión del área usuaria
 * siga ahí. Con esta redacción, la primera pasada falló por "6" cuando
 * el texto decía "cada seis meses".
 */
const DATOS: Array<[string, RegExp]> = [
  ['14 equipos', /\b14\b|catorce/i],
  ['180 días', /\b180\b|ciento ochenta/i],
  // "cada seis meses" y "periodicidad semestral" son el mismo dato: lo
  // que tiene que sobrevivir es la frecuencia que fijó el área usuaria,
  // no la forma de escribirla.
  ['cada 6 meses', /\b6\b|seis|semestral/i],
];

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Falta GOOGLE_GENERATIVE_AI_API_KEY');
    process.exit(1);
  }

  const plantilla = obtenerPlantilla('ps-servicios-general');
  if (!plantilla) throw new Error('no está la plantilla ps-servicios-general');
  const bloque = primerRedactado(plantilla.secciones);
  if (!bloque) throw new Error('la plantilla no tiene bloques redactados');

  console.log(`Plantilla: ${plantilla.subtitulo}`);
  console.log(`Apartado:  ${bloque.etiqueta}\n`);

  // ── 1. Mejorar ──────────────────────────────────────────────────────
  console.log('── Mejorar un texto ya escrito ──');
  const r1 = await generateText({
    model: modelo,
    system: promptSistema(plantilla),
    prompt: promptUsuario(bloque, {
      denominacion: 'Servicio de mantenimiento preventivo de equipos de aire acondicionado',
      organo: 'Oficina de Servicios Generales',
      textoActual: ESCRITO,
    }),
    temperature: 0.3,
  });
  const mejorado = limpiarRedaccion(r1.text ?? '', bloque);
  console.log(`\n${mejorado}\n`);

  if (!redaccionUtil(mejorado)) problema('la mejora salió vacía o demasiado corta');
  for (const [nombre, patron] of DATOS) {
    const ok = patron.test(mejorado);
    if (!ok) problema(`se perdió el dato "${nombre}" que había escrito el área usuaria`);
    console.log(`   ${ok ? '✅' : '❌'} conserva el dato "${nombre}" (en cifra o en letra)`);
  }
  const mayusculas = mejorado.replace(/[^a-záéíóúñ]/gi, '').length > 0;
  const empiezaMinuscula = /^[a-záéíóúñ]/.test(mejorado);
  console.log(`   ${!empiezaMinuscula ? '✅' : '❌'} corrige la redacción descuidada (mayúscula inicial)`);
  if (empiezaMinuscula) problema('devolvió el texto tal cual, sin corregir ni la mayúscula inicial');
  if (!mayusculas) problema('la salida no parece texto');

  const parecido = mejorado.trim() === ESCRITO.trim();
  if (parecido) problema('devolvió exactamente el mismo texto: no mejoró nada');

  // ── 2. Redactar desde cero sigue funcionando ────────────────────────
  console.log('\n── Redactar desde cero (sin texto previo) ──');
  const r2 = await generateText({
    model: modelo,
    system: promptSistema(plantilla),
    prompt: promptUsuario(bloque, {
      denominacion: 'Servicio de mantenimiento preventivo de equipos de aire acondicionado',
      organo: 'Oficina de Servicios Generales',
      aporteUsuario: '14 equipos, dos mantenimientos al año',
    }),
    temperature: 0.3,
  });
  const desdeCero = limpiarRedaccion(r2.text ?? '', bloque);
  console.log(`\n${desdeCero.slice(0, 400)}${desdeCero.length > 400 ? '…' : ''}\n`);
  if (!redaccionUtil(desdeCero)) problema('la redacción desde cero salió vacía');
  else console.log('   ✅ sigue redactando cuando el apartado está en blanco');

  console.log(
    fallos === 0
      ? '\n✅ Mejorar conserva los datos del área usuaria y corrige la forma.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

void main();
