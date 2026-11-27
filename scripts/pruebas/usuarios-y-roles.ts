/**
 * Cuentas creadas por el equipo, roles y herramientas por usuario
 * (migración 0092, reunión con César del 27/11/2026).
 *
 * Contra la base real: crea usuarios temporales `prueba-roles-*@ejemplo.test`
 * y los borra al final (el borrado arrastra perfil, permisos y bolsa).
 * Necesita la 0092 aplicada.
 *
 * Uso: npx tsx scripts/pruebas/usuarios-y-roles.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';
import {
  crearCuenta,
  cambiarCuenta,
  ErrorDeGestion,
  fijarMiClave,
  restablecerClave,
  suspenderAcceso,
} from '@/lib/usuarios/gestion';
import { bolsaDelUsuario, usarHerramienta } from '@/lib/billing/creditos';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

const creados: string[] = [];
const sello = Date.now();
const correo = (n: string) => `prueba-roles-${n}-${sello}@ejemplo.test`;

async function usuarioCon(rol: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: correo(rol),
    password: `Base-${sello}-x9`,
    email_confirm: true,
  });
  if (error) throw error;
  creados.push(data.user!.id);
  await admin.from('permisos_de_usuario').upsert({ user_id: data.user!.id, rol });
  return data.user!.id;
}

async function entra(email: string, password: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  return { c, user: data.user, error };
}

async function codigoDe(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'sin_error';
  } catch (e) {
    return e instanceof ErrorDeGestion ? e.codigo : `otro: ${(e as Error).message}`;
  }
}

void (async () => {
  try {
    const superadmin = await usuarioCon('superadmin');
    const administrador = await usuarioCon('administrador');

    // ── Disparador: is_admin refleja superadmin ──
    const { data: ps } = await admin.from('profiles').select('id, is_admin').in('id', [superadmin, administrador]);
    const isAdmin = new Map((ps ?? []).map((p) => [p.id, p.is_admin]));
    ok(isAdmin.get(superadmin) === true && isAdmin.get(administrador) === false, 'is_admin = true solo para superadmin');

    // ── Crear una cuenta completa ──
    const email = correo('cliente');
    const r = await crearCuenta(administrador, {
      email,
      nombre: 'Cliente de Prueba',
      organizacion: 'Municipalidad de Prueba',
      perfil: 'entity',
      rol: 'usuario',
      herramientasExtra: ['consulta_voz'],
      herramientasQuitadas: ['busqueda_avanzada'],
      plan: { id: 'consulta', meses: 1 },
    });
    creados.push(r.userId);
    ok(r.claveTemporal && /^[\w]{4}-[\w]{4}-[\w]{4}$/.test(r.claveTemporal), `devuelve contraseña temporal (${r.claveTemporal})`);
    const { data: perfil } = await admin.from('profiles').select('full_name, onboarding_completed, profile_role').eq('id', r.userId).single();
    ok(perfil?.onboarding_completed === true && perfil.profile_role === 'entity', 'perfil completo, sin onboarding');

    const estado = await bolsaDelUsuario(r.userId);
    ok(estado.plan === 'consulta', 'plan Consulta asignado');
    ok(estado.herramientas.includes('consulta_voz'), 'voz habilitada aunque Consulta no la incluye');
    ok(!estado.herramientas.includes('busqueda_avanzada'), 'búsqueda avanzada quitada');
    const voz = await usarHerramienta(r.userId, 'consulta_voz', { soloComprobar: true });
    ok(voz.ok, 'usarHerramienta deja usar la extra');
    const busq = await usarHerramienta(r.userId, 'busqueda_avanzada', { soloComprobar: true });
    ok(!busq.ok && busq.body.error === 'herramienta_no_incluida', 'usarHerramienta rechaza la quitada');

    // ── Ingreso con la temporal ──
    const ingreso = await entra(email, r.claveTemporal!);
    ok(!ingreso.error && ingreso.user?.app_metadata?.debe_cambiar_clave === true, 'entra con la temporal y debe cambiarla');

    // ── RLS sobre las tablas nuevas, con su sesión ──
    const yo = ingreso.c;
    const { data: propios } = await yo.from('permisos_de_usuario').select('rol, herramientas_extra').eq('user_id', r.userId);
    ok(propios?.length === 1 && propios[0].rol === 'usuario', 've su propia fila de permisos');
    const { error: eUp } = await yo.from('permisos_de_usuario').update({ rol: 'superadmin' }).eq('user_id', r.userId);
    const { data: tras } = await admin.from('permisos_de_usuario').select('rol').eq('user_id', r.userId).single();
    ok(tras?.rol === 'usuario', `no puede subirse el rol (${eUp?.message.slice(0, 40) ?? '0 filas'})`);
    const { error: eIns } = await yo.from('permisos_de_usuario').insert({ user_id: superadmin, rol: 'usuario' });
    ok(!!eIns, 'no puede insertar permisos');
    const { data: ajenos } = await yo.from('permisos_de_usuario').select('user_id').eq('user_id', superadmin);
    ok((ajenos ?? []).length === 0, 'no ve los permisos de otros');
    const { data: reg } = await yo.from('registro_de_administracion').select('id').limit(1);
    ok((reg ?? []).length === 0, 'no lee el registro de administración');
    const { data: esAdmin } = await yo.rpc('es_admin');
    ok(esAdmin === false, 'es_admin() = false para un usuario');

    // ── Límites del administrador ──
    ok((await codigoDe(crearCuenta(administrador, { email: correo('x'), nombre: 'X X', perfil: 'entity', rol: 'superadmin' }))) === 'rol_no_permitido', 'administrador no crea superadmins');
    ok((await codigoDe(cambiarCuenta(administrador, superadmin, { nombre: 'Otro' }))) === 'sin_permiso', 'administrador no toca a un superadmin');
    ok((await codigoDe(cambiarCuenta(administrador, administrador, { rol: 'usuario' }))) === 'a_si_mismo', 'nadie se cambia su propio rol');
    ok((await codigoDe(crearCuenta(administrador, { email, nombre: 'Repetido', perfil: 'entity', rol: 'usuario' }))) === 'ya_existe', 'correo repetido → ya_existe');
    const { data: usuarioAunUnico } = await admin.from('profiles').select('id').eq('full_name', 'Repetido');
    ok((usuarioAunUnico ?? []).length === 0, 'el intento repetido no dejó perfil suelto');

    // ── Rol soporte ──
    await cambiarCuenta(administrador, r.userId, { rol: 'soporte' });
    const { data: esAdmin2 } = await yo.rpc('es_admin');
    ok(esAdmin2 === true, 'con rol soporte, es_admin() = true (bandeja de ayuda)');
    await cambiarCuenta(administrador, r.userId, { rol: 'usuario' });

    // ── Restablecer, fijar y suspender ──
    const { claveTemporal: otra } = await restablecerClave(administrador, r.userId);
    ok((await entra(email, r.claveTemporal!)).error, 'la temporal anterior ya no sirve');
    ok(!(await entra(email, otra)).error, 'la restablecida sí');
    await fijarMiClave(r.userId, `Propia-${sello}-ok`);
    const propia = await entra(email, `Propia-${sello}-ok`);
    ok(!propia.error && propia.user?.app_metadata?.debe_cambiar_clave === false, 'con su propia clave ya no debe cambiarla');

    await suspenderAcceso(administrador, r.userId, true);
    ok((await entra(email, `Propia-${sello}-ok`)).error, 'suspendida no entra');
    await suspenderAcceso(administrador, r.userId, false);
    ok(!(await entra(email, `Propia-${sello}-ok`)).error, 'reactivada entra');
    ok((await codigoDe(suspenderAcceso(administrador, administrador, true))) === 'a_si_mismo', 'nadie se suspende a sí mismo');

    const { count } = await admin.from('registro_de_administracion').select('id', { count: 'exact', head: true }).eq('usuario', r.userId);
    ok((count ?? 0) >= 6, `las acciones quedan registradas (${count})`);
  } catch (e) {
    console.error('💥', e);
    fallas++;
  } finally {
    for (const id of creados) await admin.auth.admin.deleteUser(id).catch(() => {});
    console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ todo bien');
    process.exit(fallas ? 1 : 0);
  }
})();
