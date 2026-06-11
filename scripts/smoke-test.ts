#!/usr/bin/env tsx
/**
 * Smoke test del despliegue. Verifica que las rutas públicas responden
 * y los endpoints sensibles rechazan acceso no autorizado.
 *
 * Uso:
 *   npx tsx scripts/smoke-test.ts                          # contra localhost:3000
 *   npx tsx scripts/smoke-test.ts https://lexia.vercel.app # contra producción
 */
const BASE = process.argv[2] || 'http://localhost:3000';

interface Check {
  name: string;
  path: string;
  method?: 'GET' | 'POST';
  expectStatus: number | number[];
  body?: unknown;
}

const CHECKS: Check[] = [
  { name: 'landing público', path: '/', expectStatus: 200 },
  { name: 'login', path: '/login', expectStatus: 200 },
  { name: 'pricing', path: '/pricing', expectStatus: 200 },
  { name: 'legal/terminos', path: '/legal/terminos', expectStatus: 200 },
  { name: 'legal/privacidad', path: '/legal/privacidad', expectStatus: 200 },
  { name: 'legal/cookies', path: '/legal/cookies', expectStatus: 200 },
  { name: 'health', path: '/api/health', expectStatus: [200, 503] },
  // Endpoints protegidos — deben rechazar
  { name: 'chat sin auth', path: '/api/chat', method: 'POST', body: {}, expectStatus: 401 },
  { name: 'evaluations sin auth', path: '/api/evaluations', expectStatus: 401 },
  { name: 'generators/selection sin auth', path: '/api/generators/selection', method: 'POST', body: {}, expectStatus: 401 },
  { name: 'scraping/run sin auth', path: '/api/scraping/run', method: 'POST', body: {}, expectStatus: 401 },
  { name: 'billing/checkout sin auth', path: '/api/billing/checkout', method: 'POST', body: {}, expectStatus: 401 },
];

async function run() {
  console.log(`Smoke test contra: ${BASE}\n`);
  let ok = 0;
  let fail = 0;
  for (const c of CHECKS) {
    const url = `${BASE}${c.path}`;
    const opts: RequestInit = { method: c.method || 'GET' };
    if (c.body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(c.body);
    }
    let status = 0;
    let err: string | null = null;
    try {
      const res = await fetch(url, opts);
      status = res.status;
    } catch (e) {
      err = (e as Error).message;
    }
    const expected = Array.isArray(c.expectStatus) ? c.expectStatus : [c.expectStatus];
    const passed = !err && expected.includes(status);
    if (passed) ok += 1; else fail += 1;
    const mark = passed ? '✓' : '✗';
    const expectedStr = expected.join('|');
    console.log(
      `  ${mark} ${c.name.padEnd(38)} ${(c.method || 'GET').padEnd(5)} ${c.path.padEnd(38)} got=${status} expected=${expectedStr}${err ? ` err=${err}` : ''}`,
    );
  }
  console.log(`\nResumen: ${ok}/${CHECKS.length} OK · ${fail} fail`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
