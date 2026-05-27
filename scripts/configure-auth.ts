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

const SITE_URL = 'https://lex-ia-drab.vercel.app';
const REDIRECT_URLS = [
  'http://localhost:3000/auth/callback',
  'http://localhost:3000/**',
  'https://lex-ia-drab.vercel.app/auth/callback',
  'https://lex-ia-drab.vercel.app/**',
  'https://*.vercel.app/auth/callback',
  'https://*.vercel.app/**',
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
        mailer_subjects_magic_link: 'Tu enlace mágico para LexIA',
        // Template custom que usa token_hash (browser-independent, sin PKCE).
        // Variables disponibles: .SiteURL, .TokenHash, .RedirectTo, .Email
        mailer_templates_magic_link_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu enlace para LexIA</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F1F5F9;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0A0A0F;padding:40px 20px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;background:#111118;border:1px solid #2A2A38;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px 40px 24px;">
          <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:32px;font-style:italic;letter-spacing:-0.02em;color:#F1F5F9;">L<span style="color:#818CF8;">·</span>exIA</h1>
          <p style="margin:0;color:#94A3B8;font-size:13px;">Inteligencia artificial en Contrataciones del Estado</p>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <h2 style="margin:24px 0 12px;font-size:22px;font-weight:600;color:#F1F5F9;">Tu enlace mágico</h2>
          <p style="margin:0 0 24px;color:#94A3B8;font-size:15px;line-height:1.6;">Hola, hicimos clic mágico. Usa el botón de abajo para iniciar sesión en tu cuenta de LexIA. El enlace es válido por <strong style="color:#F1F5F9;">1 hora</strong>.</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:linear-gradient(135deg,#4338CA 0%,#6366F1 100%);border-radius:10px;">
              <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink" style="display:inline-block;padding:14px 28px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;">Ingresar a LexIA →</a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;color:#64748B;font-size:12px;line-height:1.6;">¿No funciona el botón? Copia y pega esta URL en tu navegador:<br><span style="color:#94A3B8;word-break:break-all;">{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink</span></p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #2A2A38;background:#0A0A0F;">
          <p style="margin:0;color:#64748B;font-size:11px;line-height:1.6;">Si no solicitaste este enlace, puedes ignorar este correo de forma segura. Nadie podrá acceder a tu cuenta sin abrir el enlace desde tu dispositivo.</p>
          <p style="margin:8px 0 0;color:#64748B;font-size:11px;">LexIA · una herramienta de Promptive</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
