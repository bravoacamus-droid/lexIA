/**
 * ¿El menú enciende una sola entrada, la correcta, en cada pantalla?
 * Es lo que se rompía con las rutas anidadas (/generador contiene a
 * /generador/requerimiento-plantilla) y con ?guardados=1.
 */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const CASOS: Array<[string, string]> = [
  ['/app', 'Inicio'],
  ['/chat', 'Chat con A-LexIA'],
  ['/llamadas', 'Habla con A-LexIA'],
  ['/buscador', 'Búsqueda avanzada'],
  ['/biblioteca', 'Biblioteca normativa'],
  ['/biblioteca?guardados=1', 'Guardados'],
  ['/generador', 'Documentos de ejecución contractual'],
  ['/generador/requerimiento-plantilla', 'Requerimientos'],
  ['/revisor-tdr', 'Evaluación de requerimiento'],
  ['/evaluador', 'Evaluación de ofertas'],
  ['/ajustes', 'Ajustes'],
];

void (async () => {
  const cookie = JSON.parse(await readFile('tmp/cookie.json', 'utf8'));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addCookies([
    { name: cookie.nombre, value: cookie.valor, domain: 'localhost', path: '/' },
  ]);
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('lexia.survey_prompt.dismissed_session', '1'); } catch {}
  });
  const p = await ctx.newPage();

  let fallos = 0;
  for (const [ruta, esperada] of CASOS) {
    await p.goto(`http://localhost:3007${ruta}`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(900);
    // Una entrada encendida es la que lleva el punto de color al final.
    const encendidas = await p.evaluate(() => {
      const barra = document.querySelector('aside.dark');
      if (!barra) return ['(sin barra)'];
      return Array.from(barra.querySelectorAll('a'))
        .filter((a) =>
          Array.from(a.querySelectorAll('span')).some((s) => {
            const c = s.className || '';
            return c.includes('rounded-full') && c.includes('h-1.5') && c.includes('w-1.5');
          }),
        )
        .map((a) => (a.textContent || '').trim());
    });
    const bien = encendidas.length === 1 && encendidas[0] === esperada;
    if (!bien) fallos++;
    console.log(
      `${bien ? '  ok  ' : '  NO  '}${ruta.padEnd(38)} → [${encendidas.join(' | ')}]  (esperada: ${esperada})`,
    );
  }
  console.log(fallos === 0 ? '\ntodas correctas' : `\n${fallos} pantalla(s) con el menú mal`);
  await nav.close();
})();
