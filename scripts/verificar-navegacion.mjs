#!/usr/bin/env node
/**
 * Comprueba que no haya páginas huérfanas ni enlaces rotos en el menú.
 *
 * POR QUÉ EXISTE
 *
 * El 17/08/2026 César reportó que no encontraba el módulo de
 * requerimiento. Al auditarlo resultó que la página existía, compilaba y
 * estaba desplegada, pero NO figuraba en ningún menú y los únicos
 * enlaces que apuntaban a ella salían de dentro de sí misma. Era un
 * módulo circular: se podía volver, no llegar. Yo di por navegable una
 * ruta porque el archivo existía.
 *
 * Nada en el build detecta eso: TypeScript compila, Next genera la ruta
 * y la página responde si escribes la URL a mano. Solo se nota cuando un
 * usuario la busca y no la encuentra.
 *
 * Este script hace las dos comprobaciones que faltaban:
 *
 *   1. Cada href del menú corresponde a una página real.
 *   2. Cada página bajo (app) es alcanzable: está en el menú, o algún
 *      otro archivo enlaza a ella desde fuera de su propia carpeta.
 *
 * Uso: node scripts/verificar-navegacion.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';

const APP = join('src', 'app', '(app)');
const MENU = join('src', 'lib', 'navigation', 'menu-by-role.ts');

let fallos = 0;
const problema = (m) => {
  console.log(`  ❌ ${m}`);
  fallos++;
};

// ── Rutas que existen como página ─────────────────────────────────────
function paginas(dir, base = '') {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      // Los grupos entre paréntesis no aparecen en la URL.
      const segmento = e.startsWith('(') && e.endsWith(')') ? base : `${base}/${e}`;
      out.push(...paginas(p, segmento));
    } else if (e === 'page.tsx') {
      out.push(base || '/');
    }
  }
  return out;
}

const rutas = paginas(APP).sort();

// ── Hrefs declarados en el menú ───────────────────────────────────────
const menu = readFileSync(MENU, 'utf8');
// Las entradas marcadas comingSoon apuntan a módulos aún sin página: es
// deliberado y no un enlace roto. Se identifican por el bloque en el que
// aparecen, no por el orden.
const bloquesMenu = menu.split(/\n\s*\{\s*\n/);
const hrefsMenu = [];
const hrefsPendientes = new Set();
for (const b of bloquesMenu) {
  const m = b.match(/href:\s*'([^']+)'/);
  if (!m) continue;
  hrefsMenu.push(m[1]);
  if (/comingSoon:\s*true/.test(b)) hrefsPendientes.add(m[1]);
}

console.log(`${rutas.length} páginas · ${hrefsMenu.length} entradas de menú\n`);

// ── 1. Enlaces del menú que no llevan a ninguna parte ─────────────────
console.log('── Entradas de menú con destino real ──');
for (const h of hrefsMenu) {
  // Se admite que apunten a una ruta con parámetro, comparando el prefijo.
  const existe = rutas.some((r) => r === h || r.startsWith(h + '/'));
  if (!existe) {
    if (hrefsPendientes.has(h)) console.log(`  ⏳ "${h}" aún sin página, marcado comingSoon`);
    else problema(`el menú apunta a "${h}", que no tiene página`);
  }
}
if (fallos === 0) console.log('  ✅ todas llevan a una página existente');

// ── 2. Páginas a las que nadie puede llegar ───────────────────────────
// Se recogen todos los href/push de la aplicación y se compara: una
// página es alcanzable si el menú la lista, o si la enlaza un archivo
// que NO vive dentro de su propia carpeta —un enlace de vuelta desde
// dentro de sí misma no sirve para llegar.
function archivos(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

const fuentes = [...archivos(join('src', 'app')), ...archivos(join('src', 'components'))];
const enlaces = new Map(); // ruta → Set(archivos que la enlazan)
for (const f of fuentes) {
  const txt = readFileSync(f, 'utf8');
  const encontrados = [
    ...txt.matchAll(/href=["'`](\/[^"'`${\s]*)/g),
    ...txt.matchAll(/(?:push|replace|redirect)\(\s*[`'"](\/[^`'"${\s]*)/g),
  ]
    // Se descarta la cadena de consulta y el ancla: "/chat?new=1" es la
    // ruta /chat. Y los puntos suspensivos de los textos de interfaz,
    // que el patrón confunde con una ruta.
    .map((m) => m[1].split(/[?#]/)[0].replace(/\/$/, '') || '/')
    .filter((r) => !/^\/\.+$/.test(r));
  for (const r of encontrados) {
    if (!enlaces.has(r)) enlaces.set(r, new Set());
    enlaces.get(r).add(f);
  }
}

console.log('\n── Páginas alcanzables ──');
const huerfanas = [];
for (const ruta of rutas) {
  if (ruta === '/') continue;
  if (hrefsMenu.some((h) => h === ruta || ruta.startsWith(h + '/'))) continue;
  // Las rutas con parámetro se alcanzan desde su propio listado; se
  // consideran cubiertas si el listado padre es alcanzable.
  if (ruta.includes('[')) continue;

  const carpeta = join(APP, ...ruta.split('/').filter(Boolean));

  // Una página que solo redirige es un punto de entrada por comodidad
  // (escribir /cuenta y caer en /cuenta/perfil); no necesita enlace.
  const propia = join(carpeta, 'page.tsx');
  if (existsSync(propia)) {
    const src = readFileSync(propia, 'utf8');
    if (/redirect\(/.test(src) && src.length < 900) continue;
  }

  const desdeFuera = [...(enlaces.get(ruta) ?? [])].filter(
    (f) => !f.startsWith(carpeta + sep),
  );
  if (desdeFuera.length === 0) {
    huerfanas.push(ruta);
    problema(`"${ruta}" no está en el menú y nadie la enlaza desde fuera de sí misma`);
  }
}
if (huerfanas.length === 0) console.log('  ✅ ninguna página queda huérfana');

// ── 3. Enlaces a rutas inexistentes ───────────────────────────────────
console.log('\n── Enlaces internos rotos ──');
let rotos = 0;
for (const [ruta, quienes] of enlaces) {
  if (ruta.startsWith('/api/') || ruta.includes('$') || ruta.includes('[')) continue;
  const existe =
    rutas.some((r) => r === ruta || r.startsWith(ruta + '/')) ||
    existsSync(join('src', 'app', ...ruta.split('/').filter(Boolean), 'page.tsx')) ||
    existsSync(join('public', ...ruta.split('/').filter(Boolean)));
  if (!existe) {
    rotos++;
    problema(`"${ruta}" enlazado desde ${[...quienes][0]} pero no existe`);
  }
}
if (rotos === 0) console.log('  ✅ ningún enlace apunta a una ruta inexistente');

console.log(fallos === 0 ? '\n✅ Navegación consistente.' : `\n❌ ${fallos} problema(s).`);
process.exit(fallos === 0 ? 0 : 1);
