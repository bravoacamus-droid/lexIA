/**
 * Extrae el PDF embebido como base64 en el visor de El Peruano.
 * Uso: pnpm exec tsx scripts/extract-elperuano-pdf.ts <html-input> <pdf-output>
 */
import * as fs from 'node:fs';

async function main() {
  const [inFile, outFile] = process.argv.slice(2);
  if (!inFile || !outFile) {
    console.error('Uso: extract-elperuano-pdf.ts <html> <pdf-out>');
    process.exit(1);
  }
  const html = fs.readFileSync(inFile, 'utf-8');
  const m = html.match(/var\s+visorBase64\s*=\s*'([A-Za-z0-9+/=]+)'/);
  if (!m) {
    console.error('No se encontró visorBase64 en el HTML');
    process.exit(1);
  }
  const b64 = m[1];
  console.log(`Base64 size: ${(b64.length / 1024).toFixed(1)} KB`);
  const buf = Buffer.from(b64, 'base64');
  console.log(`PDF binario: ${(buf.length / 1024).toFixed(1)} KB`);
  // Verificar firma %PDF
  if (buf.slice(0, 4).toString('ascii') !== '%PDF') {
    console.error('El binario no tiene cabecera %PDF — algo va mal');
    process.exit(1);
  }
  fs.writeFileSync(outFile, buf);
  console.log(`✓ Escrito en ${outFile}`);
}

main();
