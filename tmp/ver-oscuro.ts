/** El rediseño en tema oscuro: ¿se lee todo? */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const RUTAS: Array<[string, string]> = [
  ['app', '/app'],
  ['consultar', '/consultar'],
  ['generar', '/generar'],
  ['evaluar', '/evaluar'],
  ['chat', '/chat'],
  ['requerimiento', '/generador/requerimiento-plantilla'],
];

void (async () => {
  const cookie = JSON.parse(await readFile('tmp/cookie.json', 'utf8'));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({
    viewport: { width: 1440, height: 950 },
    colorScheme: 'dark',
  });
  await ctx.addCookies([
    { name: cookie.nombre, value: cookie.valor, domain: 'localhost', path: '/' },
  ]);
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('lexia.survey_prompt.dismissed_session', '1');
      localStorage.setItem('theme', 'dark');
    } catch {}
  });
  const p = await ctx.newPage();
  const errores: string[] = [];
  p.on('pageerror', (e) => errores.push(String(e).slice(0, 160)));
  for (const [nombre, ruta] of RUTAS) {
    await p.goto(`http://localhost:3007${ruta}`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(1500);
    const oscuro = await p.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );
    await p.screenshot({ path: `tmp/rd-osc-${nombre}.png`, fullPage: false });
    console.log(`  ${nombre}: ok${oscuro ? '' : '  ⚠ NO está en oscuro'}`);
  }
  if (errores.length) console.log('  errores:', Array.from(new Set(errores)).slice(0, 5).join(' | '));
  await nav.close();
})();
