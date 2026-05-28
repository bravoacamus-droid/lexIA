#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const path = process.argv[2];
  const buffer = readFileSync(path);
  const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  const text = String(result.text);

  // Buscar bloque del Capítulo IV — Requisitos de Calificación
  const capIVStart = text.search(/CAP[IÍ]TULO\s+IV/);
  const capVStart = text.search(/CAP[IÍ]TULO\s+V/);
  if (capIVStart >= 0 && capVStart > capIVStart) {
    const block = text.slice(capIVStart, capVStart);
    console.log('=== CAPÍTULO IV — Requisitos de Calificación ===');
    console.log(block.slice(0, 8000));
  } else {
    console.log('No se encontró CAPÍTULO IV claramente. Buscar manualmente.');
    // Buscar el bloque "REQUISITOS DE CALIFICACIÓN" alternativo
    const reqStart = text.search(/REQUISITOS\s+DE\s+CALIFICACI[OÓ]N/);
    if (reqStart >= 0) {
      console.log('Encontrado "REQUISITOS DE CALIFICACIÓN":');
      console.log(text.slice(reqStart, reqStart + 8000));
    }
  }

  // Buscar también "OBJETO DE LA CONVOCATORIA" + valor referencial
  console.log('\n\n=== INFO GENERAL ===');
  const objMatch = text.match(/OBJETO\s+DE\s+LA\s+CONVOCATORIA[\s\S]{20,500}/i);
  if (objMatch) console.log('OBJETO:', objMatch[0].slice(0, 400));

  const valMatch = text.match(/Valor\s+(referencial|estimado)[^\n]{5,200}/gi);
  if (valMatch) console.log('VALOR:', valMatch.slice(0, 3).join(' | '));

  // Guardar el texto completo a archivo para inspección
  writeFileSync(
    join(process.cwd(), 'data', 'test-evaluador', 'real', 'bases-text.txt'),
    text,
    'utf-8',
  );
  console.log('\nTexto completo guardado en data/test-evaluador/real/bases-text.txt');
}

main().catch(console.error);
