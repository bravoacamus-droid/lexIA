---
name: prueba-de-script
description: Cómo escribir y correr pruebas en A-LexIA, que no usa Jest/Vitest sino scripts tsx en scripts/pruebas/ con ok() y ✅/❌, a veces contra la base real con usuarios temporales. Úsala al agregar una prueba, verificar un arreglo, reproducir un caso de César o comprobar una política RLS.
---

# Pruebas en A-LexIA

No hay test runner ni CI. Una prueba es un script en `scripts/pruebas/` que
imprime ✅/❌ por comprobación y termina con código ≠ 0 si algo falló.

```bash
npx tsx scripts/pruebas/<nombre>.ts
npm run typecheck && npm run typecheck:scripts
```

## Plantilla

```ts
/**
 * Qué se prueba y por qué existe (el caso, el documento de César, la fecha).
 * Uso: npx tsx scripts/pruebas/<nombre>.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true }); // override: en Windows el entorno tapa .env.local

import { funcionBajoPrueba } from '../../src/lib/<módulo>/<archivo>';

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

void (async () => {
  try {
    const r = funcionBajoPrueba(/* caso real, mínimo */);
    ok(r.puntaje === 0, `plazo con inicio no previsto: 0 puntos (${r.puntaje})`);
  } finally {
    // limpiar lo creado
  }
  console.log(fallas ? `\n${fallas} fallas` : '\nTodo bien');
  process.exit(fallas ? 1 : 0);
})();
```

- El texto de cada `ok` dice la regla y muestra el valor obtenido entre
  paréntesis: así un ❌ se entiende sin abrir el código.
- **Prefiere funciones puras** (reglas por código del evaluador, ensamblador,
  numeración, formato): no cuestan créditos de Gemini ni tocan la base.
- Con modelo: el resultado varía. Repite N veces y exige una proporción, o
  usa `scripts/medir-*.ts`. Una pasada verde no prueba nada.

## Contra la base real

Es producción. Precedente: `scripts/pruebas/creditos.ts`.

- Crea usuarios temporales con `db.auth.admin.createUser({ email: \`prueba-…-${Date.now()}@ejemplo.test\`, email_confirm: true })`.
- Bórralos en `finally` (`db.auth.admin.deleteUser(id)`), aunque la prueba falle.
- Nunca toques filas de usuarios reales ni la normativa compartida.
- Para probar **RLS**, no uses el service role (lo salta todo): obtén una
  sesión del usuario temporal y usa un cliente con la anon key; la escritura
  prohibida debe dar error o 0 filas.

## Reproducir un caso de César

Guarda el insumo mínimo (texto de la página, monto, ficha) dentro del script,
no el PDF entero; nombra el archivo por el tema (`plazo.ts`) o por el
documento (`doc15.ts`).
