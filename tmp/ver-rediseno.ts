/**
 * El rediseño, en pantalla: portada y los tres centros de sección, en
 * escritorio y en móvil.
 */
import { chromium, type Browser } from 'playwright';
import { readFile } from 'node:fs/promises';

const RUTAS = [
  ['chat', '/chat'],
  ['voz', '/llamadas'],
  ['buscador', '/buscador'],
  ['biblioteca', '/biblioteca'],
  ['requerimiento', '/generador/requerimiento-plantilla'],
  ['generador', '/generador'],
] as const;

async function tanda(
  nav: Browser,
  cookie: { nombre: string; valor: string },
  etiqueta: string,
  viewport: { width: number; height: number },
) {
  const ctx = await nav.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addCookies([
    { name: cookie.nombre, value: cookie.valor, domain: 'localhost', path: '/' },
  ]);
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('lexia.survey_prompt.dismissed_session', '1');
    } catch {}
  });
  const p = await ctx.newPage();
  const errores: string[] = [];
  p.on('pageerror', (e) => errores.push(String(e).slice(0, 200)));
  p.on('console', (m) => {
    if (m.type() === 'error') errores.push('console: ' + m.text().slice(0, 160));
  });

  for (const [nombre, ruta] of RUTAS) {
    try {
      await p.goto(`http://localhost:3007${ruta}`, {
        waitUntil: 'networkidle',
        timeout: 180000,
      });
      await p.waitForTimeout(1800);
      const desbordeH = await p.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      await p.screenshot({ path: `tmp/rd-${etiqueta}-${nombre}.png`, fullPage: true });
      console.log(
        `  ${etiqueta}/${nombre}: ok${desbordeH ? '  ⚠ DESBORDE HORIZONTAL' : ''}`,
      );
    } catch (e) {
      console.log(`  ${etiqueta}/${nombre}: FALLÓ — ${String(e).slice(0, 180)}`);
    }
  }
  if (errores.length) {
    console.log(`  errores (${etiqueta}):`);
    for (const e of Array.from(new Set(errores)).slice(0, 8)) console.log('     ', e);
  }
  await ctx.close();
}

void (async () => {
  const cookie = JSON.parse(await readFile('tmp/cookie.json', 'utf8'));
  const nav = await chromium.launch();
  console.log('escritorio 1440×950');
  await tanda(nav, cookie, 'esc', { width: 1440, height: 950 });
  console.log('móvil 390×844');
  await tanda(nav, cookie, 'mov', { width: 390, height: 844 });
  await nav.close();
})();
