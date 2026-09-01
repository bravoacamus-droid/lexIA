/**
 * Comprueba que los encabezados del modelo se enderezan al pintarlos.
 *
 * Observación de César del 31/08/2026: en el chat salía «## Conclusión y
 * recomendación práctica» con la almohadilla a la vista y pegada al
 * párrafo siguiente. El prompt pedía los encabezados como
 * `**## Título**` y el modelo copiaba la forma; markdown entonces ve un
 * párrafo en negrita, no un encabezado.
 *
 *   pnpm tsx scripts/probar-encabezados-modelo.ts
 */
import { normalizarMarkdownModelo } from '../src/lib/markdown/normalizar-modelo';

let fallos = 0;

function comprobar(que: string, obtenido: string, esperado: string) {
  const bien = obtenido === esperado;
  if (!bien) fallos++;
  console.log(`${bien ? '  ok  ' : ' FALLA'} ${que}`);
  if (!bien) {
    console.log(`        esperado: ${JSON.stringify(esperado)}`);
    console.log(`        obtenido: ${JSON.stringify(obtenido)}`);
  }
}

console.log('\nENCABEZADOS ENVUELTOS EN NEGRITAS\n');

comprobar(
  'el caso que reportó César, tal como está guardado en la base',
  normalizarMarkdownModelo('**## Marco normativo aplicable**\nLa continuación de la Fase…'),
  '## Marco normativo aplicable\nLa continuación de la Fase…',
);

comprobar(
  'también con guiones bajos',
  normalizarMarkdownModelo('__### 1. Direccionamiento__'),
  '### 1. Direccionamiento',
);

comprobar(
  'con dos puntos al final, que el modelo añade a veces',
  normalizarMarkdownModelo('**## Análisis del caso**:'),
  '## Análisis del caso',
);

comprobar(
  'los seis niveles',
  normalizarMarkdownModelo('**# Uno**\n**###### Seis**'),
  '# Uno\n###### Seis',
);

comprobar(
  'la almohadilla sin espacio detrás',
  normalizarMarkdownModelo('##Conclusión'),
  '## Conclusión',
);

console.log('\nLO QUE NO DEBE TOCAR\n');

comprobar(
  'un encabezado correcto se queda igual',
  normalizarMarkdownModelo('## Marco normativo aplicable\n\nTexto.'),
  '## Marco normativo aplicable\n\nTexto.',
);

comprobar(
  'una negrita corriente no es un encabezado',
  normalizarMarkdownModelo('**Importante**: revisar el plazo.'),
  '**Importante**: revisar el plazo.',
);

comprobar(
  'las negritas de dentro del título se respetan',
  normalizarMarkdownModelo('**## El plazo es de **ocho** días**'),
  '## El plazo es de **ocho** días',
);

comprobar(
  'un número de artículo con almohadilla no se toca',
  normalizarMarkdownModelo('Ver el art. 51.2 y el N° 009-2025-EF.'),
  'Ver el art. 51.2 y el N° 009-2025-EF.',
);

comprobar(
  'una tabla con negritas se queda como está',
  normalizarMarkdownModelo('| **Plazo** | **Días** |\n| --- | --- |'),
  '| **Plazo** | **Días** |\n| --- | --- |',
);

console.log(`\n${fallos === 0 ? 'Todo correcto.' : `${fallos} comprobación(es) fallidas.`}\n`);
process.exit(fallos === 0 ? 0 : 1);
