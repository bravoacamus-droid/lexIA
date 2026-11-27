/**
 * Lo que un usuario NO debe poder hacer desde el navegador (migraciones
 * 0088 y 0089, auditoría del 26/11/2026). Cada comprobación intenta el ataque con
 * la anon key y la sesión de un usuario temporal, como lo haría alguien
 * desde la consola del navegador; el service role no sirve para esto
 * porque se salta la RLS.
 *
 * Crea un usuario temporal (y, con service role, una evaluación y dos
 * llamadas suyas) y lo borra al final: el borrado arrastra todo lo suyo.
 *
 * Uso: npx tsx scripts/pruebas/seguridad-rls.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

/** ¿La escritura no tuvo efecto? (error de permiso o 0 filas) */
async function bloqueada(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<[boolean, string]> {
  const { data, error } = await p;
  if (error) return [true, error.message.slice(0, 60)];
  const filas = Array.isArray(data) ? data.length : data ? 1 : 0;
  return [filas === 0, `${filas} fila(s)`];
}

async function sesionDe(email: string, password: string): Promise<SupabaseClient> {
  const cliente = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await cliente.auth.signInWithPassword({ email, password });
  if (!error) return cliente;
  // Si el proveedor de contraseña está apagado, con un enlace mágico.
  const { data: link, error: e2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (e2 || !link.properties?.hashed_token) throw new Error(`sin sesión: ${error.message} / ${e2?.message}`);
  const { error: e3 } = await cliente.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token });
  if (e3) throw new Error(`sin sesión: ${e3.message}`);
  return cliente;
}

void (async () => {
  const email = `prueba-rls-${Date.now()}@ejemplo.test`;
  const password = `Prueba-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data: creado, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const uid = creado.user!.id;
  try {
    const yo = await sesionDe(email, password);
    const anonimo = createClient(URL, ANON, { auth: { persistSession: false } });

    // ── profiles ──
    let [b, d] = await bloqueada(yo.from('profiles').update({ is_admin: true } as never).eq('id', uid).select('id'));
    const { data: p } = await admin.from('profiles').select('is_admin').eq('id', uid).single();
    ok(b && !(p as { is_admin: boolean }).is_admin, `no puede hacerse admin (${d})`);
    [b, d] = await bloqueada(yo.from('profiles').update({ role: 'admin' } as never).eq('id', uid).select('id'));
    ok(b, `no puede cambiar profiles.role (${d})`);
    const { error: eNombre } = await yo.from('profiles').update({ full_name: 'Prueba RLS' } as never).eq('id', uid);
    ok(!eNombre, `sí puede cambiar su nombre (${eNombre?.message ?? 'ok'})`);

    // ── evaluations ──
    [b, d] = await bloqueada(
      yo.from('evaluations').insert({ user_id: uid, title: 'x', status: 'pending', bases_file_path: `${uid}/x.pdf`, offer_files: [] } as never).select('id'),
    );
    ok(b, `no puede crear evaluaciones sin pasar por el cobro (${d})`);
    const { data: ev } = await admin
      .from('evaluations')
      .insert({ user_id: uid, title: 'prueba rls', status: 'done', bases_file_path: `${uid}/x.pdf`, offer_files: [] } as never)
      .select('id')
      .single();
    const evId = (ev as { id: string }).id;
    [b, d] = await bloqueada(yo.from('evaluations').update({ status: 'pending' } as never).eq('id', evId).select('id'));
    ok(b, `no puede devolver su evaluación a «pending» (${d})`);
    [b, d] = await bloqueada(yo.from('evaluations').update({ bases_file_path: 'otro-usuario/bases.pdf' } as never).eq('id', evId).select('id'));
    ok(b, `no puede apuntar sus bases a la carpeta de otro (${d})`);
    const { data: leida } = await yo.from('evaluations').select('id').eq('id', evId);
    ok(leida?.length === 1, 'sí lee su evaluación');
    [b] = await bloqueada(yo.from('evaluations').delete().eq('id', evId).select('id'));
    ok(!b, 'sí borra su evaluación');

    // ── voice_calls ──
    [b, d] = await bloqueada(yo.from('voice_calls').insert({ user_id: uid, status: 'active', voice_id: 'Kore' } as never).select('id'));
    ok(b, `no puede abrir llamadas por su cuenta (${d})`);
    const { data: vc } = await admin
      .from('voice_calls')
      .insert({ user_id: uid, status: 'active', voice_id: 'Kore' } as never)
      .select('id')
      .single();
    const vcId = (vc as { id: string }).id;
    [b, d] = await bloqueada(yo.from('voice_calls').update({ status: 'failed', duration_seconds: 0 } as never).eq('id', vcId).select('id'));
    ok(b, `no puede cerrar su llamada sin cobro (${d})`);
    [b, d] = await bloqueada(yo.from('voice_calls').update({ audio_storage_path: 'otro-usuario/audio.webm' } as never).eq('id', vcId).select('id'));
    ok(b, `no puede cambiar la ruta del audio (${d})`);
    [b, d] = await bloqueada(yo.from('voice_calls').delete().eq('id', vcId).select('id'));
    ok(b, `no puede borrar una llamada en curso (${d})`);
    await admin.from('voice_calls').update({ status: 'completed' } as never).eq('id', vcId);
    [b] = await bloqueada(yo.from('voice_calls').delete().eq('id', vcId).select('id'));
    ok(!b, 'sí borra una llamada terminada');

    // ── requerimientos y generador (migración 0091) ──
    [b, d] = await bloqueada(
      yo.from('requerimientos_plantilla').insert({ user_id: uid, plantilla_id: 'bienes-general', denominacion: 'x', respuestas: {} } as never).select('id'),
    );
    ok(b, `no puede crear requerimientos sin pagar (${d})`);
    [b, d] = await bloqueada(
      yo.from('entity_requirements').insert({ user_id: uid, denominacion: 'x', regimen: 'seleccion', objeto: 'bienes', status: 'draft' } as never).select('id'),
    );
    ok(b, `no puede crear requerimientos (modelo anterior) sin pagar (${d})`);
    const { data: rp } = await admin
      .from('requerimientos_plantilla')
      .insert({ user_id: uid, plantilla_id: 'bienes-general', denominacion: 'prueba rls', respuestas: {} } as never)
      .select('id')
      .single();
    const rpId = (rp as { id: string }).id;
    [b, d] = await bloqueada(yo.from('requerimientos_plantilla').update({ plantilla_id: 'otra' } as never).eq('id', rpId).select('id'));
    ok(b, `no puede cambiar la plantilla de un requerimiento pagado (${d})`);
    const { error: eResp } = await yo.from('requerimientos_plantilla').update({ denominacion: 'editada' } as never).eq('id', rpId);
    ok(!eResp, `sí edita su requerimiento (${eResp?.message ?? 'ok'})`);
    const { data: conv } = await admin
      .from('generator_conversations')
      .insert({ user_id: uid } as never)
      .select('id')
      .single();
    if (conv) {
      [b, d] = await bloqueada(
        yo.from('generator_messages').insert({ conversation_id: (conv as { id: string }).id, role: 'assistant', content: 'falsa' } as never).select('id'),
      );
      ok(b, `no puede inventar respuestas del generador para abaratar el documento (${d})`);
    } else {
      ok(false, 'no se pudo preparar la conversación del generador para la prueba');
    }

    // ── user_surveys ──
    [b, d] = await bloqueada(
      yo.from('user_surveys').insert({ user_id: uid, survey_slug: 'x', answers: {}, reward_granted: false } as never).select('id'),
    );
    ok(b, `no escribe encuestas directo (${d})`);

    // ── soporte ──
    const { error: eNota } = await yo.from('soporte_tickets').select('nota_interna').limit(1);
    ok(!!eNota, `no puede leer la nota interna del equipo (${eNota?.message.slice(0, 50) ?? 'la leyó'})`);
    const { error: eTicket } = await yo.from('soporte_tickets').select('id, asunto, estado').limit(1);
    ok(!eTicket, `sí lee sus tickets (${eTicket?.message ?? 'ok'})`);

    // ── biblioteca sin sesión ──
    const { data: docsAnon } = await anonimo.from('normative_documents').select('id').limit(1);
    ok(!docsAnon || docsAnon.length === 0, `sin sesión no se lee la biblioteca (${docsAnon?.length ?? 0} filas)`);
    const { error: eBusq } = await anonimo.rpc('buscar_frase', { frase: 'plazo', filtro_tipo: null, tope: 1, fragmentos_por_documento: 1 });
    ok(!!eBusq, `sin sesión no se puede buscar (${eBusq?.message.slice(0, 50) ?? 'buscó'})`);
    const { data: docsYo } = await yo.from('normative_documents').select('id').limit(1);
    ok((docsYo?.length ?? 0) === 1, 'con sesión sí se lee la biblioteca');

    // ── funciones de mantenimiento ──
    const { error: eCache } = await yo.rpc('calentar_cache');
    ok(!!eCache, `un usuario no puede lanzar calentar_cache (${eCache?.message.slice(0, 50) ?? 'la lanzó'})`);
  } finally {
    await admin.auth.admin.deleteUser(uid);
  }
  console.log(fallas ? `\n${fallas} falla(s)` : '\nTodo bien');
  process.exit(fallas ? 1 : 0);
})();
