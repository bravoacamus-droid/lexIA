import * as fs from 'node:fs';
import { extractText, getDocumentProxy } from 'unpdf';

async function inspect(path: string) {
  const buf = fs.readFileSync(path);
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  const text = String(result.text);
  console.log(`Páginas: ${pdf.numPages}`);
  console.log(`Caracteres: ${text.length.toLocaleString()}`);
  console.log(`\n=== Primeros 600 chars ===\n${text.slice(0, 600)}`);
  console.log(`\n=== Buscar "DECRETO SUPREMO" o "REGLAMENTO" ===`);
  const regIdx = text.toUpperCase().indexOf('REGLAMENTO DE LA LEY');
  console.log(`Posición primera mención "REGLAMENTO DE LA LEY": ${regIdx} (de ${text.length})`);
  if (regIdx > 0) {
    console.log(`\n${text.slice(regIdx, regIdx + 500)}`);
  }
}
inspect(process.argv[2]);
