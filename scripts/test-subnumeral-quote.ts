import { formatNormativaText } from '../src/lib/normativa/format-raw';

// Caso exacto reportado por César 30/06/2026
const cases = [
  {
    name: 'Sub-numeral con comillas',
    input: `51.2. La formulación de consultas y/o comentarios técnicos se realiza a través de la Pladicop en un plazo no menor de cinco días hábiles, contabilizados desde el día siguiente a la publicación de la difusión del requerimiento. "51.3. En el plazo máximo de seis días hábiles de formuladas las referidas consultas y/o comentarios técnicos, el área usuaria y la DEC realizan la absolución, publicando en la Pladicop un acta que contenga el resultado de este proceso." (*) Numeral modificado por el artículo 2 del Decreto Supremo N° 001-2026-EF publicado el 8 de enero de 2026.`,
  },
  {
    name: 'Múltiples sub-numerales con comillas',
    input: `51.1. Texto. "51.2. Segundo texto. "51.3. Tercer texto. Fin.`,
  },
  {
    name: 'Sub-numeral sin comilla (base case)',
    input: `Texto anterior. 51.2. La formulación de consultas. 51.3. En el plazo máximo.`,
  },
];

for (const c of cases) {
  console.log('\n═══════════════════════════════════════════════');
  console.log(`CASO: ${c.name}`);
  console.log('───── INPUT ─────');
  console.log(c.input);
  console.log('───── OUTPUT ─────');
  console.log(formatNormativaText(c.input));
}
