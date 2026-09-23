/** Las pantallas sin sesión: login y portada pública. */
import { chromium } from 'playwright';

const RUTAS: Array<[string, string]> = [
  ['login', '/login'],
  ['landing', '/'],
  ['pricing', '/pricing'],
];

void (async () => {
  const nav = await chromium.launch();
  for (const [etiqueta, ancho, alto] of [['esc', 1440, 950], ['mov', 390, 844]] as const) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    const p = await ctx.newPage();
    const errores: string[] = [];
    p.on('pageerror', (e) => errores.push(String(e).slice(0, 160)));
    for (const [nombre, ruta] of RUTAS) {
      try {
        await p.goto(`http://localhost:3007${ruta}`, { waitUntil: 'networkidle', timeout: 180000 });
        await p.waitForTimeout(1500);
        const desborde = await p.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        await p.screenshot({ path: `tmp/rd-${etiqueta}-${nombre}.png`, fullPage: true });
        console.log(`  ${etiqueta}/${nombre}: ok${desborde ? '  ⚠ DESBORDE' : ''}`);
      } catch (e) {
        console.log(`  ${etiqueta}/${nombre}: FALLÓ — ${String(e).slice(0, 140)}`);
      }
    }
    if (errores.length) console.log('  errores:', Array.from(new Set(errores)).slice(0, 5).join(' | '));
    await ctx.close();
  }
  await nav.close();
})();
