#!/usr/bin/env tsx
/**
 * Pone la sigla del Tribunal (TCP o TCE) en el número y el título de las
 * resoluciones ya cargadas en la biblioteca.
 *
 * César, documento 13 (10/10/2026): «Las siglas de las resoluciones le
 * falta "TCE o TCP", según corresponda. Esto trae como consecuencia al
 * poner en el buscador y tratar de ubicar una resolución, este no
 * identifica la resolución consultada». La biblioteca guardaba
 * «Resolución N° 9056-2026-S3 (Tribunal de Contrataciones)» y la
 * numeración oficial es «Resolución N° 09056-2026-TCP-S3».
 *
 * La sigla NO se adivina por la fecha: se lee del encabezado de cada
 * resolución con las reglas de src/lib/scraping/resoluciones.ts
 * (decidirSigla), las mismas que usa la ingesta de lo que entra de
 * ahora en adelante. La ficha de gob.pe (la URL guardada) solo desempata
 * cuando el propio texto se contradice, y se informa cada discrepancia.
 *
 * De paso, si la sala guardada es «S?» o imposible («S60») y el
 * encabezado la trae, se toma del encabezado.
 *
 * No toca el correlativo ni el año: si el encabezado del PDF dice otro
 * número que el de la ficha (pasa: hay fichas con el PDF de otra
 * resolución), se informa como sospecha y se deja como está.
 *
 * Uso:
 *   npx tsx scripts/corregir-siglas-resoluciones.ts            (simula e informa)
 *   npx tsx scripts/corregir-siglas-resoluciones.ts --aplicar  (escribe)
 *
 * Es re-ejecutable: lo que ya tiene la sigla correcta no se vuelve a
 * escribir. El detalle queda en data/siglas-resoluciones.informe.json.
 */
import { config } from 'dotenv';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import {
  claveDeResolucion,
  decidirSigla,
  encabezadoDeResolucion,
  numeroDeResolucion,
  type SiglaDelTribunal,
} from '../src/lib/scraping/resoluciones';

config({ path: join(process.cwd(), '.env.local'), override: true });

const APLICAR = process.argv.includes('--aplicar');
const token = (process.env.SUPABASE_ACCESS_TOKEN ?? '').trim().replace(/[\r\n"']/g, '');
const ref = (process.env.SUPABASE_PROJECT_REF ?? '').trim().replace(/[\r\n"']/g, '');
const INFORME = join(process.cwd(), 'data', 'siglas-resoluciones.informe.json');

/** SQL por la Management API, como scripts/consultar-bd.ts. */
async function sql<T>(consulta: string): Promise<T[]> {
  for (let intento = 1; ; intento++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: consulta }),
    });
    if (res.ok) return (await res.json()) as T[];
    const cuerpo = (await res.text()).slice(0, 300);
    if (intento >= 3 || res.status < 500) throw new Error(`HTTP ${res.status}: ${cuerpo}`);
    await new Promise((r) => setTimeout(r, 2000 * intento));
  }
}

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

interface Fila {
  id: string;
  number: string;
  title: string;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
  inicio: string | null;
}

interface Cambio {
  id: string;
  antes: string;
  number: string;
  title: string;
  sigla: SiglaDelTribunal;
  sala: string;
  /** La sala que tenía, por si corregirla choca con otro documento. */
  salaAntes: string;
  origen: string;
}

async function main() {
  console.log(APLICAR ? 'MODO APLICAR\n' : 'SIMULACIÓN — no escribe nada (usa --aplicar)\n');

  // Por páginas y solo el arranque del texto: el encabezado está en los
  // primeros caracteres y traer 17 mil textos completos no hace falta.
  const filas: Fila[] = [];
  let ultimo = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const lote = await sql<Fila>(
      `select id, number, title, source_url, metadata, left(raw_text, 900) as inicio
         from normative_documents
        where type = 'resolucion_tce' and id > ${lit(ultimo)}
        order by id limit 2000`,
    );
    filas.push(...lote);
    if (lote.length < 2000) break;
    ultimo = lote[lote.length - 1].id;
  }
  console.log(`Resoluciones del Tribunal en la biblioteca: ${filas.length}`);

  const cambios: Cambio[] = [];
  const dudosas: Array<{ number: string; nuevo: string; motivo: string; url: string | null }> = [];
  const sinSigla: Array<{ number: string; url: string | null }> = [];
  const numeroDistinto: Array<{ number: string; encabezado: string; url: string | null }> = [];
  const conteo = { yaCorrectas: 0, sinSiglaAntes: 0, seguras: 0, dudosas: 0, sinDecidir: 0, salasCorregidas: 0, TCP: 0, TCE: 0 };
  const porOrigen: Record<string, number> = {};

  for (const f of filas) {
    const clave = claveDeResolucion(f.number) ?? claveDeResolucion(f.title);
    if (!clave) {
      sinSigla.push({ number: f.number, url: f.source_url });
      conteo.sinDecidir++;
      continue;
    }
    if (!clave.sigla) conteo.sinSiglaAntes++;
    const ficha = f.source_url ? claveDeResolucion(f.source_url)?.sigla ?? null : null;
    const texto = f.inicio ?? '';
    const decision = decidirSigla(texto, ficha);
    if (!decision.sigla) {
      sinSigla.push({ number: f.number, url: f.source_url });
      conteo.sinDecidir++;
      continue;
    }
    conteo[decision.sigla]++;
    porOrigen[decision.origen ?? '—'] = (porOrigen[decision.origen ?? '—'] ?? 0) + 1;

    const enc = encabezadoDeResolucion(texto);
    let sala = clave.sala;
    if (!/^S\d$/.test(sala) && enc?.sala) {
      sala = enc.sala;
      conteo.salasCorregidas++;
    }
    if (enc?.numero && (enc.numero !== clave.numero || enc.anio !== clave.anio)) {
      numeroDistinto.push({
        number: f.number,
        encabezado: `${enc.numero}-${enc.anio}-${enc.sigla ?? '?'}-${enc.sala ?? '?'}`,
        url: f.source_url,
      });
    }

    const number = numeroDeResolucion({ ...clave, sala, sigla: decision.sigla });
    if (decision.dudosa) {
      conteo.dudosas++;
      dudosas.push({ number: f.number, nuevo: number, motivo: decision.motivo ?? '', url: f.source_url });
    } else {
      conteo.seguras++;
    }
    const meta = f.metadata ?? {};
    if (
      number === f.number &&
      f.title === `${number} (Tribunal de Contrataciones)` &&
      meta.sigla === decision.sigla &&
      meta.sala === sala
    ) {
      conteo.yaCorrectas++;
      continue;
    }
    cambios.push({
      id: f.id,
      antes: f.number,
      number,
      // Se conserva el formato del título; solo cambia el número que lleva.
      title: f.title.includes(f.number) ? f.title.replace(f.number, number) : `${number} (Tribunal de Contrataciones)`,
      sigla: decision.sigla,
      sala,
      salaAntes: clave.sala,
      origen: decision.origen ?? '',
    });
  }

  // Un número nuevo no puede chocar con otro ya guardado (unique type+number).
  // Pasa con las copias «S?» que dejó el actualizador antes del 24/09
  // (p. ej. «2151-2026-S?» junto a «2151-2026-S1»): al tomar la sala del
  // encabezado quedarían iguales. A esas se les pone la sigla pero se
  // les deja la sala como estaba, y se informan como posibles duplicados.
  const ocupados = (lista: Cambio[]) => {
    const n = new Map<string, number>();
    const cambian = new Set(lista.map((c) => c.id));
    for (const f of filas) if (!cambian.has(f.id)) n.set(f.number, (n.get(f.number) ?? 0) + 1);
    for (const c of lista) n.set(c.number, (n.get(c.number) ?? 0) + 1);
    return n;
  };
  let usos = ocupados(cambios);
  const posiblesDuplicados: string[] = [];
  for (const c of cambios) {
    if ((usos.get(c.number) ?? 0) > 1 && c.sala !== c.salaAntes) {
      posiblesDuplicados.push(`${c.antes} ↔ ${c.number}`);
      c.sala = c.salaAntes;
      c.number = c.number.replace(/-S[^-]*$/, `-${c.salaAntes}`);
      c.title = `${c.number} (Tribunal de Contrataciones)`;
    }
  }
  usos = ocupados(cambios);
  const chocan = cambios.filter((c) => (usos.get(c.number) ?? 0) > 1);
  // Al devolverle su sala, una de esas puede haber quedado como ya estaba.
  const original = new Map(filas.map((f) => [f.id, f]));
  const sinCambio = (c: Cambio) => {
    const f = original.get(c.id)!;
    return f.number === c.number && f.title === c.title && f.metadata?.sigla === c.sigla && f.metadata?.sala === c.sala;
  };
  const aEscribir = cambios.filter((c) => !chocan.includes(c) && !sinCambio(c));

  console.log(`  sin sigla en el número antes de corregir: ${conteo.sinSiglaAntes}`);
  console.log(`  sigla decidida con certeza (texto y ficha coinciden): ${conteo.seguras}`);
  console.log(`  sigla decidida pero dudosa (fuentes discrepan o el texto no la trae): ${conteo.dudosas}`);
  console.log(`  sin poder decidir: ${conteo.sinDecidir}`);
  console.log(`  por origen: ${JSON.stringify(porOrigen)} · TCP ${conteo.TCP} · TCE ${conteo.TCE}`);
  console.log(`  salas «S?» o imposibles tomadas del encabezado: ${conteo.salasCorregidas}`);
  console.log(`  encabezado con otro número que la ficha (no se toca, sospecha de PDF cruzado): ${numeroDistinto.length}`);
  console.log(`  ya correctas: ${conteo.yaCorrectas} · a escribir: ${aEscribir.length} · omitidas por choque de número: ${chocan.length}`);

  console.log('\nMuestra de cambios:');
  for (const c of aEscribir.slice(0, 8)) console.log(`  ${c.antes}  →  ${c.number}   [${c.origen}]`);
  if (dudosas.length) {
    console.log('\nDudosas (se escribe la sigla indicada; revisar):');
    for (const d of dudosas.slice(0, 60)) console.log(`  ${d.number} → ${d.nuevo}: ${d.motivo}`);
    if (dudosas.length > 60) console.log(`  … y ${dudosas.length - 60} más (ver el informe)`);
  }
  for (const d of posiblesDuplicados) console.log(`  POSIBLE DUPLICADO ${d}: se deja su sala como estaba`);
  for (const c of chocan) console.log(`  CHOQUE ${c.antes} → ${c.number}: ya existe; no se toca`);

  writeFileSync(
    INFORME,
    JSON.stringify({ fecha: new Date().toISOString(), aplicado: APLICAR, conteo, porOrigen, dudosas, sinSigla, numeroDistinto, posiblesDuplicados, chocan }, null, 2),
  );
  console.log(`\nInforme: ${INFORME}`);

  if (!APLICAR) {
    console.log('\n(simulación — ejecuta con --aplicar para escribir)');
    return;
  }

  let escritas = 0;
  for (let i = 0; i < aEscribir.length; i += 400) {
    const lote = aEscribir.slice(i, i + 400);
    const valores = lote
      .map(
        (c) =>
          `(${lit(c.id)}::uuid, ${lit(c.number)}, ${lit(c.title)}, ${lit(
            JSON.stringify({ sigla: c.sigla, sigla_origen: c.origen, sala: c.sala }),
          )}::jsonb)`,
      )
      .join(',\n');
    const hechas = await sql<{ id: string }>(
      `update normative_documents d
          set number = v.number, title = v.title, metadata = coalesce(d.metadata, '{}'::jsonb) || v.meta
         from (values ${valores}) as v(id, number, title, meta)
        where d.id = v.id and d.type = 'resolucion_tce'
        returning d.id`,
    );
    escritas += hechas.length;
    process.stdout.write(`\r  escritas ${escritas}/${aEscribir.length}`);
  }
  console.log(`\n✅ Actualizadas: ${escritas}`);
}

main().catch((e) => {
  console.error('❌', (e as Error).message);
  process.exit(1);
});
