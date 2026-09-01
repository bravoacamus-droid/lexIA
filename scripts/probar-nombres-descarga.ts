/**
 * Comprueba el nombre con el que se descargan los documentos.
 *
 * Salió de un fallo visto en pantalla: el acta se descargaba como
 * «Acta de evaluacin» porque el saneado borraba las tildes. Se
 * comprueban las dos mitades del asunto —el nombre limpio y la cabecera
 * `Content-Disposition`—, porque un nombre correcto puesto en una
 * cabecera mal formada llega igual de roto.
 *
 *   pnpm tsx scripts/probar-nombres-descarga.ts
 */
import { nombreDeArchivo, cabeceraDescarga } from '../src/lib/descargas/nombre-archivo';

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

function contiene(que: string, texto: string, trozo: string) {
  const bien = texto.includes(trozo);
  if (!bien) fallos++;
  console.log(`${bien ? '  ok  ' : ' FALLA'} ${que}`);
  if (!bien) console.log(`        no contiene ${JSON.stringify(trozo)} en ${JSON.stringify(texto)}`);
}

console.log('\nNOMBRE DEL ARCHIVO\n');

comprobar(
  'conserva las tildes y la eñe',
  nombreDeArchivo('Acta de evaluación — Adquisición de camiones cisterna para la compañía'),
  'Acta de evaluación — Adquisición de camiones cisterna para la compañía',
);

comprobar(
  'quita lo que el sistema de archivos no admite',
  nombreDeArchivo('Servicio de limpieza: sede central / anexo 2 <urgente>'),
  'Servicio de limpieza sede central anexo 2 urgente',
);

comprobar(
  'no deja punto ni espacio al final, que Windows recorta',
  nombreDeArchivo('Requerimiento de bienes.   '),
  'Requerimiento de bienes',
);

comprobar('respeta el tope', nombreDeArchivo('a'.repeat(200), 'documento', 30), 'a'.repeat(30));

comprobar('usa el respaldo cuando no queda nada', nombreDeArchivo('///', 'Acta'), 'Acta');

comprobar(
  'colapsa los espacios repetidos',
  nombreDeArchivo('Servicio    de      vigilancia'),
  'Servicio de vigilancia',
);

console.log('\nCABECERA CONTENT-DISPOSITION\n');

const cab = cabeceraDescarga('Acta de evaluación — Municipalidad de Ñaña.docx');
// La raya tampoco es ASCII, así que la versión de respaldo la pierde.
contiene(
  'lleva la versión ASCII para el cliente antiguo',
  cab,
  'filename="Acta de evaluacion  Municipalidad de Nana.docx"',
);
contiene('lleva la versión UTF-8, que es la que se usa', cab, "filename*=UTF-8''");
contiene('la versión UTF-8 codifica la tilde', cab, encodeURIComponent('evaluación'));

const conComillas = cabeceraDescarga('Informe "final".docx');
comprobar(
  'una comilla en el nombre no rompe la cabecera',
  conComillas.slice(0, conComillas.indexOf(';', 20)),
  'attachment; filename="Informe final.docx"',
);

console.log(`\n${fallos === 0 ? 'Todo correcto.' : `${fallos} comprobación(es) fallidas.`}\n`);
process.exit(fallos === 0 ? 0 : 1);
