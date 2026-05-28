#!/usr/bin/env tsx
/**
 * Extrae texto del PDF de Bases reales y reporta:
 * - Cantidad de páginas
 * - Tamaño del texto extraído
 * - Resumen del contenido (primeras secciones)
 * - Detección de requisitos clave
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PDF_PATH = process.argv[2];
if (!PDF_PATH) {
  console.error('Uso: tsx inspect-real-bases.ts <ruta-al-pdf>');
  process.exit(1);
}

async function main() {
  const { extractText, getDocumentProxy } = await import('unpdf');

  const buffer = readFileSync(PDF_PATH);
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  const text = String(result.text);

  console.log(`Archivo: ${PDF_PATH}`);
  console.log(`Páginas: ${pdf.numPages}`);
  console.log(`Caracteres extraídos: ${text.length.toLocaleString()}`);
  console.log(`Palabras aprox: ${text.split(/\s+/).length.toLocaleString()}`);
  console.log('');

  if (text.length < 500) {
    console.log('ATENCIÓN: muy poco texto. ¿Es un PDF escaneado sin OCR?');
    return;
  }

  // Buscar secciones clave
  const sections = [
    { label: 'CAPÍTULO I',     re: /CAP[IÍ]TULO\s+I\b/i },
    { label: 'CAPÍTULO II',    re: /CAP[IÍ]TULO\s+II\b/i },
    { label: 'CAPÍTULO III',   re: /CAP[IÍ]TULO\s+III\b/i },
    { label: 'CAPÍTULO IV',    re: /CAP[IÍ]TULO\s+IV\b/i },
    { label: 'CAPÍTULO V',     re: /CAP[IÍ]TULO\s+V\b/i },
    { label: 'OBJETO',         re: /OBJETO\s+DE\s+LA\s+CONVOCATORIA/i },
    { label: 'VALOR REFERENCIAL', re: /VALOR\s+REFERENCIAL/i },
    { label: 'PLAZO',          re: /PLAZO\s+DE\s+EJECUCI[OÓ]N/i },
    { label: 'PERSONAL CLAVE', re: /PERSONAL\s+CLAVE/i },
    { label: 'EXPERIENCIA',    re: /EXPERIENCIA\s+(DEL\s+POSTOR|M[IÍ]NIMA)/i },
    { label: 'EQUIPAMIENTO',   re: /EQUIPAMIENTO/i },
    { label: 'SUBSANACIÓN',    re: /SUBSANACI[OÓ]N/i },
    { label: 'ANEXOS',         re: /ANEXO\s+N°/i },
  ];

  console.log('Detección de secciones:');
  for (const s of sections) {
    const m = text.match(s.re);
    console.log(`  ${s.label.padEnd(22)} ${m ? '✓ presente' : '✗'}`);
  }

  console.log('\n--- Primeros 3000 caracteres ---');
  console.log(text.slice(0, 3000));

  // Detectar valor referencial y plazo
  const valorRef = text.match(/VALOR\s+REFERENCIAL[^.]*?S\/\s*([\d,]+\.\d{2})/i);
  const plazo = text.match(/PLAZO[^.]*?(\d{2,4})\s+d[ií]as\s+calendario/i);
  console.log('\n--- Datos clave detectados ---');
  if (valorRef) console.log(`Valor referencial: S/ ${valorRef[1]}`);
  if (plazo) console.log(`Plazo de ejecución: ${plazo[1]} días`);

  // Detectar requisitos de personal
  const personalMatches = text.match(/(jefe\s+de\s+obra|residente\s+de\s+obra|especialista[\s\w]{3,40})[^.]{10,200}(\d+)\s+a[nñ]os/gi);
  if (personalMatches) {
    console.log('\n--- Personal clave detectado ---');
    personalMatches.slice(0, 10).forEach((m) => console.log(`  ${m.replace(/\s+/g, ' ').trim().slice(0, 200)}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
