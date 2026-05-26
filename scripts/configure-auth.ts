#!/usr/bin/env tsx
/**
 * Configura URLs de Auth (Site URL + Redirect URLs) en el proyecto Supabase.
 * Endpoint: PATCH /v1/projects/{ref}/config/auth
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF!;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Faltan SUPABASE_PROJECT_REF o SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const SITE_URL = 'http://localhost:3000';
const REDIRECT_URLS = [
  'http://localhost:3000/auth/callback',
  'http://localhost:3000/**',
  'https://*.vercel.app/auth/callback',
  'https://*.vercel.app/**',
  'https://lexia.vercel.app/auth/callback',
  'https://lex-ia.vercel.app/auth/callback',
];

async function main() {
  console.log('📡 Obteniendo configuración actual de Auth...');
  const getRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );

  if (!getRes.ok) {
    console.error('❌ Error obteniendo config:', await getRes.text());
    process.exit(1);
  }

  console.log('✏️  Aplicando nueva configuración...');
  const patchRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_url: SITE_URL,
        uri_allow_list: REDIRECT_URLS.join(','),
        mailer_otp_exp: 3600,
        mailer_otp_length: 6,
        external_email_enabled: true,
        mailer_autoconfirm: false,
        // OTP-friendly templates
        mailer_subjects_magic_link: 'Tu enlace mágico para LexIA',
      }),
    },
  );

  if (!patchRes.ok) {
    console.error('❌ Error aplicando config:', await patchRes.text());
    process.exit(1);
  }

  const result = await patchRes.json();
  console.log('✅ Configuración aplicada:');
  console.log(`   site_url: ${result.site_url}`);
  console.log(`   uri_allow_list: ${result.uri_allow_list}`);
  console.log(`   mailer_otp_exp: ${result.mailer_otp_exp}s`);
  console.log(`   external_email_enabled: ${result.external_email_enabled}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
