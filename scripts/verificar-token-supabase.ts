#!/usr/bin/env tsx
/**
 * Comprueba si el token de la Management API de Supabase sigue vigente.
 *
 * Existe porque un token caducado devuelve 401 en cualquier llamada, y
 * ese 401 es indistinguible de un problema de permisos o de payload. Una
 * llamada suelta a /v1/projects separa las dos cosas en un segundo.
 *
 * Uso: npx tsx scripts/verificar-token-supabase.ts
 */
import { config } from 'dotenv';
import { join } from 'node:path';

config({ path: join(process.cwd(), '.env.local'), override: true });

const token = (process.env.SUPABASE_ACCESS_TOKEN ?? '').trim().replace(/[\r\n"']/g, '');
const ref = (process.env.SUPABASE_PROJECT_REF ?? '').trim().replace(/[\r\n"']/g, '');

if (!token) {
  console.error('No hay SUPABASE_ACCESS_TOKEN en .env.local');
  process.exit(1);
}

async function main() {
  console.log(`Token: ${token.slice(0, 8)}… (${token.length} caracteres)`);
  console.log(`Proyecto esperado: ${ref || '(no definido)'}`);

  const res = await fetch('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    console.error('\n❌ 401 Unauthorized — el token caducó o fue revocado.');
    console.error('   Se genera uno nuevo en https://supabase.com/dashboard/account/tokens');
    console.error('   y se reemplaza SUPABASE_ACCESS_TOKEN en .env.local.');
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`\n❌ HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }

  const proyectos = (await res.json()) as Array<{ id: string; name: string; region: string }>;
  console.log(`\n✅ Token válido. ${proyectos.length} proyecto(s) accesible(s):`);
  for (const p of proyectos) {
    console.log(`   ${p.id === ref ? '→' : ' '} ${p.id}  ${p.name}  (${p.region})`);
  }
  if (ref && !proyectos.some((p) => p.id === ref)) {
    console.error(`\n⚠️  El token no da acceso al proyecto ${ref}.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
