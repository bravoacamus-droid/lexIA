/** Quién desborda a lo ancho en /pricing en móvil. */
import { chromium } from 'playwright';
void (async () => {
  const nav = await chromium.launch();
  const p = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto('http://localhost:3007/pricing', { waitUntil: 'networkidle', timeout: 180000 });
  await p.waitForTimeout(1200);
  const culpables = await p.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const fuera: string[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > w + 1 || r.left < -1)) {
        const padre = el.parentElement;
        const pr = padre?.getBoundingClientRect();
        // Solo el más externo de cada rama
        if (pr && pr.right <= w + 1 && pr.left >= -1) {
          fuera.push(
            `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 70)} → izq ${Math.round(r.left)} der ${Math.round(r.right)} (ancho ${Math.round(r.width)})`,
          );
        }
      }
    });
    return { w, fuera: fuera.slice(0, 8) };
  });
  console.log('ancho', culpables.w);
  for (const c of culpables.fuera) console.log('  ', c);
  await nav.close();
})();
