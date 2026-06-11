#!/usr/bin/env tsx
/**
 * Inspecciona el contenido de las carpetas RNP — texto y estructura
 * para diseñar correctamente los wizards de la Etapa 9.
 *
 * No persiste nada; solo imprime para diseño.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

const ROOT = process.cwd();

const FILES = {
  requisitos_ejecutor:
    '4. TRÁMITES RNP/REQUISITOS/2. Requisitos de Ejecutor de Obras (PJ - PN - Nacional).docx',
  requisitos_consultor:
    '4. TRÁMITES RNP/REQUISITOS/1. Requisitos de Consultor de Obras (PJ - PN - Nacional).docx',
  anexo06_xlsx:
    '4. TRÁMITES RNP/ACTUALIZACIÓN DE INFORMACIÓN FINANCIERA/Copia de Anexo N.° 06 - Información Financiera-Vigacon (1).xlsx',
};

async function peekDocx(path: string, label: string, max = 1200) {
  try {
    const buf = readFileSync(join(ROOT, path));
    const { value } = await mammoth.extractRawText({ buffer: buf });
    const text = value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    console.log(`\n=== ${label} ===`);
    console.log(`(${text.length} chars total)`);
    console.log(text.slice(0, max));
    if (text.length > max) console.log('  ...[truncated]');
  } catch (e) {
    console.log(`${label}: error → ${(e as Error).message}`);
  }
}

async function peekXlsx(path: string, label: string) {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(ROOT, path));
    console.log(`\n=== ${label} ===`);
    wb.worksheets.forEach((ws) => {
      console.log(`  Hoja: "${ws.name}" — ${ws.rowCount} filas × ${ws.columnCount} columnas`);
      // Imprime las primeras 12 filas no vacías
      let printed = 0;
      ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (printed >= 12) return;
        const cells: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          const v = cell.value;
          if (v == null) return;
          const s =
            typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
              ? String(v)
              : typeof v === 'object' && 'richText' in v
                ? (v as { richText: Array<{ text: string }> }).richText
                    .map((r) => r.text)
                    .join('')
                : typeof v === 'object' && 'result' in v
                  ? String((v as { result: unknown }).result ?? '')
                  : '';
          if (s.trim()) cells.push(s);
        });
        if (cells.length > 0) {
          console.log(`    ${String(rowNum).padStart(3)}: ${cells.join(' | ').slice(0, 200)}`);
          printed += 1;
        }
      });
    });
  } catch (e) {
    console.log(`${label}: error → ${(e as Error).message}`);
  }
}

(async () => {
  await peekDocx(FILES.requisitos_ejecutor, 'Requisitos Ejecutor de Obras', 1800);
  await peekDocx(FILES.requisitos_consultor, 'Requisitos Consultor de Obras', 1800);
  await peekXlsx(FILES.anexo06_xlsx, 'Anexo N° 06 — Información Financiera');
})();
