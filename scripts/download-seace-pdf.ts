#!/usr/bin/env tsx
/**
 * Descarga un PDF directo del SEACE dada su URL.
 *
 * Uso:
 *   npx tsx scripts/download-seace-pdf.ts "<URL>" "<nombre-archivo.pdf>"
 *
 * Ejemplo:
 *   npx tsx scripts/download-seace-pdf.ts \
 *     "https://prod2.seace.gob.pe/.../descargarArchivo?idDocumento=12345" \
 *     "bases_real.pdf"
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'data', 'test-evaluador', 'real');
mkdirSync(OUT_DIR, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

async function main() {
  const [url, filename] = process.argv.slice(2);
  if (!url || !filename) {
    console.error('Uso: download-seace-pdf.ts <URL> <nombre-archivo.pdf>');
    process.exit(1);
  }

  console.log(`Descargando: ${url}\n  → ${join(OUT_DIR, filename)}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/pdf,application/octet-stream,*/*',
      Referer: 'https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    console.error('Body preview:', text.slice(0, 500));
    process.exit(1);
  }

  const contentType = res.headers.get('content-type') || '';
  const buffer = Buffer.from(await res.arrayBuffer());

  // Verificar que sea PDF real
  const isPdf = buffer.slice(0, 4).toString() === '%PDF';
  if (!isPdf) {
    console.error(`No es un PDF válido. Content-Type: ${contentType}`);
    console.error(`Primeros bytes: ${buffer.slice(0, 20).toString('hex')}`);
    console.error(
      `Si esto pasó, probablemente la URL requiere sesión activa o redirigió a una página HTML.\n` +
      `Solución: descarga manualmente desde el navegador y pega el archivo en ${OUT_DIR}`,
    );
    process.exit(1);
  }

  const dest = join(OUT_DIR, filename);
  writeFileSync(dest, buffer);
  const kb = Math.round(buffer.length / 1024);
  console.log(`OK ${kb} KB`);
}

main().catch(console.error);
