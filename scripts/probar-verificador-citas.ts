#!/usr/bin/env tsx
/**
 * La regla que decide qué cita es inventada, probada aparte.
 *
 * POR QUÉ EXISTE
 *
 * El banco estricto (`test-rag-strict.ts`) marcó el 22/08/2026 once
 * alucinaciones. Al abrirlas, tres eran de la propia regla:
 *
 *   · el chat escribía "en los fragmentos disponibles NO aparece
 *     ninguna referencia a la Directiva N° 999-2027-OECE-CD" —que es
 *     justo lo que debe hacer— y la mención dentro de la frase que la
 *     niega se contaba como si la hubiera afirmado;
 *   · la biblioteca guarda "Directiva N° 003-2025-OECECD" y el modelo
 *     citaba "003-2025-OECE-CD": un guión de diferencia bastaba para
 *     declarar inventado un documento que existe;
 *   · las dos formas de nombrar un mismo documento inventado se
 *     juzgaban por separado, y el mismo caso salía con una nota de
 *     acierto y otra de fallo.
 *
 * Un medidor equivocado es peor que ninguno: da por roto lo que
 * funciona y esconde lo que no. Ya pasó antes con las citas de la voz.
 * Así que la regla se prueba con casos escritos a mano, sin BD ni
 * modelo, y esto corre en un segundo.
 *
 * Uso: npx tsx scripts/probar-verificador-citas.ts
 */
import { enContextoNegado, normalize } from './test-rag-strict';

let fallos = 0;
const comprobar = (que: string, ok: boolean) => {
  console.log(`   ${ok ? '✅' : '❌'} ${que}`);
  if (!ok) fallos++;
};

console.log('── Nombrar un documento para negarlo no es inventarlo ──');
const negadas: Array<[string, string]> = [
  [
    'En los fragmentos disponibles no aparece ninguna referencia a la Directiva N° 999-2027-OECE-CD, ni se regula un documento con esa numeración.',
    'Directiva 999-2027-OECE-CD',
  ],
  [
    'No he encontrado el Pronunciamiento N° 9999-2027/OECE-DSAT entre los documentos recuperados.',
    'Pronunciamiento 9999-2027/OECE-DSAT',
  ],
  [
    'No consta la Opinión N.° D000999-2026-OECE-DTN en la biblioteca consultada.',
    'Opinión N° D000999-2026-OECE-DTN',
  ],
  [
    'La Resolución N° 1234-2026-TCP-S2 no figura entre los fragmentos.',
    'Resolución N° 1234-2026-TCP-S2',
  ],
];
for (const [respuesta, cita] of negadas) {
  comprobar(`"${respuesta.slice(0, 52)}…"`, enContextoNegado(respuesta, cita));
}

console.log('\n── Afirmarlo sí lo es ──');
const afirmadas: Array<[string, string]> = [
  [
    'La Directiva N° 999-2027-OECE-CD establece que la difusión del requerimiento es obligatoria.',
    'Directiva 999-2027-OECE-CD',
  ],
  [
    'Conforme al Pronunciamiento N° 9999-2027/OECE-DSAT, la matriz de riesgos debe adjuntarse.',
    'Pronunciamiento 9999-2027/OECE-DSAT',
  ],
  // Una negación sobre OTRA cosa, en la misma frase, no vale de excusa.
  [
    'No hay plazo previsto en la Ley, pero la Opinión N° D000999-2026-OECE-DTN sí lo fija en diez días.',
    'Opinión N° D000999-2026-OECE-DTN',
  ],
  // Nombrada dos veces: una negada y otra afirmada. Manda la afirmada.
  [
    'No aparece la Directiva N° 999-2027-OECE-CD entre los fragmentos. Aun así, la Directiva N° 999-2027-OECE-CD exige publicar el requerimiento.',
    'Directiva 999-2027-OECE-CD',
  ],
];
for (const [respuesta, cita] of afirmadas) {
  comprobar(`"${respuesta.slice(0, 52)}…"`, !enContextoNegado(respuesta, cita));
}

console.log('\n── Lo que no se menciona no se niega ──');
comprobar(
  'una cita ausente no cuenta como negada',
  !enContextoNegado('No encuentro nada sobre ese asunto.', 'Directiva N° 003-2025-OECE-CD'),
);

console.log('\n── El guión no distingue un documento de otro ──');
const mismos: Array<[string, string]> = [
  ['Directiva N° 003-2025-OECE-CD', 'Directiva N° 003-2025-OECECD - Elevación de bases'],
  ['Resolución N.° 1727-2026-TCP-S2', 'Resolución N° 1727-2026-TCP-S2'],
  ['Opinión N° D000016-2026-OECE-DTN', 'OPINIÓN N° D000016-2026-OECE/DTN'],
];
for (const [cita, enBiblioteca] of mismos) {
  comprobar(
    `"${cita}" encuentra "${enBiblioteca.slice(0, 38)}…"`,
    normalize(enBiblioteca).includes(normalize(cita)),
  );
}
comprobar(
  'y dos documentos distintos siguen siendo distintos',
  !normalize('Directiva N° 003-2025-OECE-CD').includes(normalize('Directiva N° 005-2025-OECE-CD')),
);

console.log(
  fallos === 0
    ? '\n✅ El verificador distingue una cita inventada de una desmentida.'
    : `\n❌ ${fallos} problema(s) en el verificador.`,
);
process.exit(fallos === 0 ? 0 : 1);
