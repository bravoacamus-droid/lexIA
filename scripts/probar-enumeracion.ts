#!/usr/bin/env tsx
/**
 * "Dame diez casos sobre X" tiene que devolver diez casos distintos.
 *
 * POR QUÉ EXISTE
 *
 * César pidió el 21/08/2026 "al menos 10 casos que resolvió el Tribunal
 * respecto a los FACTORES DE EVALUACIÓN, específicamente sobre la
 * 'Integridad en la contratación pública'", y el chat se dejó fuera
 * cinco resoluciones que él conoce, todas en la biblioteca.
 *
 * Medido antes de tocar nada: hay 1 178 documentos que contienen esa
 * frase. Ningún orden por parecido va a poner justo esas cinco arriba, y
 * el problema real era otro: a una pregunta de enumerar se respondía con
 * quince FRAGMENTOS ordenados por parecido —que ni siquiera tenían por
 * qué mencionar la figura— en vez de con DOCUMENTOS distintos que la
 * traten.
 *
 * Esta prueba va contra la base de verdad y comprueba las dos mitades:
 * que se reconoce la clase de pregunta y que la búsqueda por frase
 * devuelve documentos distintos, recientes y que de verdad contienen la
 * expresión.
 *
 * Uso: npx tsx scripts/probar-enumeracion.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { detectarEnumeracion } from '../src/lib/ai/enumeracion';

config({ path: join(process.cwd(), '.env.local'), override: true });
const admin = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
);

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

/** La pregunta de César, tal cual la escribió. */
const PREGUNTA =
  'Quiero que me detalles al menos 10 casos en particular que resolvió el tribunal de ' +
  'contrataciones frente a un recurso de apelación respecto a los FACTORES DE EVALUACIÓN, ' +
  'específicamente respecto a la "Integridad en la contratación pública". Estos casos deben ' +
  'ser singulares y no considerar las resoluciones que fueron declarados nulos por el tribunal.';

interface Fila {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_number: string | null;
  doc_date: string | null;
  hay_mas: boolean;
}

void (async () => {
  console.log('── Se reconoce la clase de pregunta ──');
  const peticion = detectarEnumeracion(PREGUNTA);
  comprobar('la de César se reconoce como petición de casos', !!peticion);
  comprobar('y saca la cantidad que pide', peticion?.cantidad === 10);
  comprobar(
    'y la figura entrecomillada, que es la pista buena',
    peticion?.frases[0] === 'Integridad en la contratación pública',
  );

  console.log('\n── Lo que NO debe activarla ──');
  for (const q of [
    '¿Qué dice el artículo 10 del Reglamento?',
    'Resume la Resolución N° 1727-2026-S2',
    '¿Cuál es el plazo para presentar el recurso de apelación?',
  ]) {
    comprobar(`"${q.slice(0, 50)}"`, detectarEnumeracion(q) === null);
  }
  comprobar(
    'una frase demasiado común no vale como búsqueda',
    detectarEnumeracion('Dame 10 casos sobre "contratación pública"') === null,
  );

  if (!peticion) {
    console.log('\n❌ sin petición no se puede seguir');
    process.exit(1);
  }

  console.log('\n── La búsqueda por frase ──');
  const t0 = Date.now();
  const { data, error } = await admin.rpc('buscar_frase', {
    frase: peticion.frases[0],
    filtro_tipo: null,
    tope: peticion.cantidad,
    fragmentos_por_documento: 2,
  });
  const ms = Date.now() - t0;
  if (error) {
    console.log(`   ❌ falló: ${error.message}`);
    process.exit(1);
  }
  const filas = (data ?? []) as Fila[];
  const documentos = [...new Set(filas.map((f) => f.document_id))];

  console.log(`   ${filas.length} fragmentos · ${documentos.length} documentos · ${ms} ms`);
  comprobar('devuelve los diez casos pedidos', documentos.length >= 10);
  comprobar('responde en menos de cinco segundos', ms < 5000);
  // La búsqueda es de frase, no de cadena: `phraseto_tsquery` compara
  // raíces y salta los vacíos, así que "integridad de las contrataciones
  // públicas" también casa. Exigir la cadena literal comprobaría la
  // ortografía del Tribunal, no el buscador. Lo que sí tiene que
  // cumplirse es que las dos ideas aparezcan juntas, no en párrafos
  // distintos, que era justo el fallo de la búsqueda por parecido.
  const juntas = (t: string) => {
    const bajo = t.toLowerCase();
    let i = bajo.indexOf('integrid');
    while (i !== -1) {
      const ventana = bajo.slice(i, i + 80);
      if (/contrataci/.test(ventana)) return true;
      i = bajo.indexOf('integrid', i + 1);
    }
    return false;
  };
  comprobar('en todos los fragmentos la figura aparece completa', filas.every((f) => juntas(f.content)));
  comprobar('avisa de que hay más en la biblioteca', filas[0]?.hay_mas === true);

  const fechas = filas.map((f) => f.doc_date ?? '').filter(Boolean);
  comprobar(
    'vienen del más reciente al más antiguo',
    fechas.every((f, i) => i === 0 || fechas[i - 1] >= f),
  );

  console.log('\n   Casos devueltos:');
  const vistos = new Set<string>();
  for (const f of filas) {
    if (vistos.has(f.document_id)) continue;
    vistos.add(f.document_id);
    console.log(`     · ${f.doc_number} (${String(f.doc_date).slice(0, 10)})`);
  }

  console.log('\n── Otra figura, para que no sea un caso particular ──');
  const { data: otra, error: e2 } = await admin.rpc('buscar_frase', {
    frase: 'experiencia del postor en la especialidad',
    filtro_tipo: 'resolucion_tce',
    tope: 8,
    fragmentos_por_documento: 1,
  });
  if (e2) {
    comprobar(`la segunda búsqueda falló: ${e2.message}`, false);
  } else {
    const f2 = (otra ?? []) as Fila[];
    comprobar('también devuelve casos', new Set(f2.map((f) => f.document_id)).size >= 5);
    comprobar(
      'y también traen la figura buscada',
      f2.every((f) => /experiencia del postor/i.test(f.content)),
    );
  }

  console.log(
    fallos === 0
      ? '\n✅ Pedir casos sobre una figura devuelve documentos distintos que la tratan.'
      : `\n❌ ${fallos} problema(s).`,
  );
  process.exit(fallos === 0 ? 0 : 1);
})();
