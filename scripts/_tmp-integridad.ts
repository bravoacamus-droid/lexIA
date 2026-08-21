import { listarPlantillas } from '../src/lib/generadores/plantillas';
import type { Bloque, Seccion } from '../src/lib/generadores/plantilla-tipos';
let fallos = 0;
for (const p of listarPlantillas()) {
  const idsBloque: string[] = [];
  const idsSeccion: string[] = [];
  const condicionesDeclaradas = new Set<string>();
  const condicionesUsadasEnBloques = new Set<string>();
  const opciones = new Set<string>();
  const opcionesReferidas: Array<{ bloque: string; opcion: string }> = [];

  const rec = (ss: Seccion[]) => {
    for (const s of ss) {
      idsSeccion.push(s.id);
      if (s.condicion) condicionesDeclaradas.add(s.condicion);
      for (const b of s.bloques as Bloque[]) {
        if (b.clase === 'parrafo') idsBloque.push(...b.campos.map((c) => c.id));
        else if ('id' in b) idsBloque.push(String(b.id));
        if (b.clase === 'opcion') opciones.add(b.id);
        const v = 'visibleSi' in b ? b.visibleSi : undefined;
        if (v?.condicion) condicionesUsadasEnBloques.add(v.condicion);
        if (v?.opcion) opcionesReferidas.push({ bloque: 'id' in b ? String(b.id) : '(sin id)', opcion: v.opcion });
      }
      rec(s.subsecciones ?? []);
    }
  };
  rec(p.secciones);

  const rep = (xs: string[]) => {
    const vistos = new Set<string>(), dobles = new Set<string>();
    for (const x of xs) (vistos.has(x) ? dobles : vistos).add(x);
    return [...dobles];
  };
  for (const [que, dobles] of [['bloques', rep(idsBloque)], ['secciones', rep(idsSeccion)]] as const) {
    if (dobles.length) { console.log(`  ❌ ${p.id}: ${que} con id repetido → ${dobles.join(', ')}`); fallos++; }
  }
  for (const { bloque, opcion } of opcionesReferidas) {
    if (!opciones.has(opcion)) {
      console.log(`  ❌ ${p.id}: el bloque "${bloque}" depende de la opción "${opcion}", que no existe`);
      fallos++;
    }
  }
  // Un bloque condicionado por un interruptor que ninguna sección
  // declara sería invisible para siempre: el usuario no puede encenderlo.
  for (const c of condicionesUsadasEnBloques) {
    if (!condicionesDeclaradas.has(c)) {
      console.log(`  ❌ ${p.id}: el interruptor "${c}" se usa en un bloque pero ninguna sección lo declara`);
      fallos++;
    }
  }
}
console.log(fallos === 0 ? '  ✅ ids únicos, opciones existentes e interruptores alcanzables en las quince' : `  ${fallos} problema(s)`);
process.exit(fallos === 0 ? 0 : 1);
