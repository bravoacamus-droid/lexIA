/**
 * Cuentas creadas por el equipo (servidor).
 *
 * POR QUÉ
 *
 * Reunión con César del 27/11/2026: «usted mismo va a crear las cuentas y
 * darles permiso»; la gente no se registra, inicia sesión con la cuenta
 * que le crearon. Hasta ahora solo se entraba con Google y la cuenta
 * nacía en Prueba: para darle un plan a alguien había que esperar a que
 * entrara una vez y luego buscarlo en /admin/planes.
 *
 * Aquí se crea la cuenta completa de una sola vez: usuario de Auth con
 * contraseña temporal, perfil con onboarding hecho, rol, herramientas
 * ajustadas y plan (o lugar en un equipo). Si un paso falla después de
 * crear el usuario de Auth, se borra para no dejar cuentas a medias.
 *
 * No hay correo saliente configurado (Supabase sin SMTP propio), así que
 * la contraseña temporal se devuelve una sola vez al administrador para
 * que la mande por WhatsApp, y la persona debe cambiarla al entrar
 * (`app_metadata.debe_cambiar_clave`, que solo el servidor puede escribir).
 *
 * Todas las acciones quedan en `registro_de_administracion`.
 */
import { randomInt } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { asignarPlan, listarCuentas, servicio } from '@/lib/billing/gestion';
import type { IdDePlan } from '@/lib/billing/catalogo';
import type { Herramienta } from '@/lib/billing/creditos';
import { herramientasEfectivas } from '@/lib/billing/creditos';
import { puedeGestionarA, rolesQuePuedeAsignar, type Rol } from '@/lib/auth/permisos';
import { rolDe } from '@/lib/auth/permisos-servidor';
import type { ProfileRole } from '@/lib/auth/session';

export class ErrorDeGestion extends Error {
  constructor(
    public codigo:
      | 'ya_existe'
      | 'no_existe'
      | 'sin_permiso'
      | 'rol_no_permitido'
      | 'equipo_lleno'
      | 'equipo_no_existe'
      | 'ya_en_equipo'
      | 'a_si_mismo'
      | 'fallo',
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** Mínimo propio: Supabase acepta 6 caracteres (ver config de Auth). */
export const LARGO_MINIMO_DE_CLAVE = 10;

/**
 * Contraseña temporal legible para dictar o pegar en WhatsApp: tres
 * bloques de 4 sin caracteres que se confunden (0/O, 1/l/I).
 */
export function claveTemporal(): string {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bloque = () => Array.from({ length: 4 }, () => letras[randomInt(letras.length)]).join('');
  // Se repite hasta que tenga letras y números: `claveValida` exige los dos
  // y a veces el azar no pone ningún dígito (lo encontró la prueba).
  for (;;) {
    const clave = `${bloque()}-${bloque()}-${bloque()}`;
    if (!claveValida(clave)) return clave;
  }
}

export function claveValida(clave: string): string | null {
  if (clave.length < LARGO_MINIMO_DE_CLAVE) return `La contraseña debe tener al menos ${LARGO_MINIMO_DE_CLAVE} caracteres.`;
  if (clave.length > 72) return 'La contraseña no puede pasar de 72 caracteres.';
  if (!/[A-Za-z]/.test(clave) || !/[0-9]/.test(clave)) return 'La contraseña debe combinar letras y números.';
  return null;
}

async function registrar(db: SupabaseClient, actor: string, accion: string, usuario: string | null, detalle: Record<string, unknown>) {
  await db.from('registro_de_administracion').insert({ actor, accion, usuario, detalle });
}

/** Comprueba que `actor` pueda tocar la cuenta `userId` y devuelve el rol de ambos. */
async function autorizar(db: SupabaseClient, actor: string, userId: string) {
  const [rolActor, rolObjetivo] = await Promise.all([rolDe(db, actor), rolDe(db, userId)]);
  if (!puedeGestionarA(rolActor, rolObjetivo)) {
    throw new ErrorDeGestion('sin_permiso', 'No puedes modificar esta cuenta.');
  }
  return { rolActor, rolObjetivo };
}

function limpiarHerramientas(lista: readonly string[] | undefined): Herramienta[] {
  return Array.from(new Set(lista ?? [])) as Herramienta[];
}

// ── Listado ──────────────────────────────────────────────────────────

export interface UsuarioDelPanel {
  id: string;
  email: string | null;
  nombre: string | null;
  organizacion: string | null;
  perfil: ProfileRole | null;
  rol: Rol;
  herramientasExtra: Herramienta[];
  herramientasQuitadas: Herramienta[];
  herramientas: Herramienta[];
  nota: string | null;
  proveedores: string[];
  tieneClave: boolean;
  debeCambiarClave: boolean;
  suspendido: boolean;
  ultimoIngreso: string | null;
  creado: string;
  plan: IdDePlan | null;
  estadoPlan: string | null;
  venceAt: string | null;
  disponibles: number;
  equipo: { id: string; nombre: string; rol: string } | null;
}

/** Todas las cuentas de Auth, página por página (sin el tope de 1000). */
export async function todosLosUsuariosDeAuth(db: SupabaseClient): Promise<User[]> {
  const todos: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    todos.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return todos;
}

export async function listarUsuarios(): Promise<UsuarioDelPanel[]> {
  const db = servicio();
  const [usuarios, cuentas, { data: perfiles }, { data: permisos }] = await Promise.all([
    todosLosUsuariosDeAuth(db),
    listarCuentas(),
    db.from('profiles').select('id, profile_role'),
    db.from('permisos_de_usuario').select('user_id, rol, herramientas_extra, herramientas_quitadas, nota'),
  ]);
  const cuentaDe = new Map(cuentas.map((c) => [c.id, c]));
  const perfilDe = new Map(((perfiles ?? []) as Array<{ id: string; profile_role: ProfileRole | null }>).map((p) => [p.id, p.profile_role]));
  const permisoDe = new Map(
    ((permisos ?? []) as Array<{ user_id: string; rol: Rol; herramientas_extra: string[]; herramientas_quitadas: string[]; nota: string | null }>).map(
      (p) => [p.user_id, p],
    ),
  );
  const ahora = Date.now();
  return usuarios
    .map((u) => {
      const c = cuentaDe.get(u.id);
      const p = permisoDe.get(u.id);
      const plan = c?.plan ?? null;
      const extra = limpiarHerramientas(p?.herramientas_extra);
      const quitadas = limpiarHerramientas(p?.herramientas_quitadas);
      const baneado = (u as User & { banned_until?: string | null }).banned_until;
      return {
        id: u.id,
        email: u.email ?? null,
        nombre: c?.nombre ?? null,
        organizacion: c?.organizacion ?? null,
        perfil: perfilDe.get(u.id) ?? null,
        rol: p?.rol ?? 'usuario',
        herramientasExtra: extra,
        herramientasQuitadas: quitadas,
        herramientas: plan ? herramientasEfectivas(plan, { extra, quitadas }) : [],
        nota: p?.nota ?? null,
        proveedores: Array.from(new Set((u.identities ?? []).map((i) => i.provider))),
        tieneClave: (u.identities ?? []).some((i) => i.provider === 'email'),
        debeCambiarClave: u.app_metadata?.debe_cambiar_clave === true,
        suspendido: !!baneado && new Date(baneado).getTime() > ahora,
        ultimoIngreso: u.last_sign_in_at ?? null,
        creado: u.created_at,
        plan,
        estadoPlan: c?.estado ?? null,
        venceAt: c?.venceAt ?? null,
        disponibles: c?.disponibles ?? 0,
        equipo: c?.equipo ? { id: c.equipo.id, nombre: c.equipo.nombre, rol: c.equipo.rol } : null,
      } satisfies UsuarioDelPanel;
    })
    .sort((a, b) => b.creado.localeCompare(a.creado));
}

/** Equipos existentes, para agregar una cuenta nueva a uno. */
export async function listarEquipos() {
  const db = servicio();
  const [{ data: equipos }, { data: miembros }] = await Promise.all([
    db.from('equipos').select('id, nombre, max_usuarios, propietario'),
    db.from('miembros_de_equipo').select('equipo_id'),
  ]);
  const cuantos = new Map<string, number>();
  for (const m of (miembros ?? []) as Array<{ equipo_id: string }>) cuantos.set(m.equipo_id, (cuantos.get(m.equipo_id) ?? 0) + 1);
  return ((equipos ?? []) as Array<{ id: string; nombre: string; max_usuarios: number; propietario: string }>).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    maxUsuarios: e.max_usuarios,
    miembros: cuantos.get(e.id) ?? 0,
  }));
}

export async function historialDe(userId: string) {
  const db = servicio();
  const { data } = await db
    .from('registro_de_administracion')
    .select('id, actor, accion, detalle, created_at')
    .eq('usuario', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  return data ?? [];
}

// ── Crear ────────────────────────────────────────────────────────────

export interface DatosDeCuentaNueva {
  email: string;
  nombre: string;
  organizacion?: string;
  cargo?: string;
  perfil: ProfileRole;
  rol: Rol;
  /** Si falta, se genera una temporal. */
  clave?: string;
  herramientasExtra?: Herramienta[];
  herramientasQuitadas?: Herramienta[];
  nota?: string;
  /** Plan propio… */
  plan?: { id: IdDePlan; meses: number | null; creditosMes?: number; maxUsuarios?: number; nombreEquipo?: string };
  /** …o lugar en un equipo existente (comparte su bolsa). */
  equipoId?: string;
}

export async function crearCuenta(actor: string, datos: DatosDeCuentaNueva) {
  const db = servicio();
  const rolActor = await rolDe(db, actor);
  if (!rolesQuePuedeAsignar(rolActor).includes(datos.rol)) {
    throw new ErrorDeGestion('rol_no_permitido', 'No puedes crear cuentas con ese rol.');
  }
  const email = datos.email.trim().toLowerCase();
  const clave = datos.clave ?? claveTemporal();
  const errorDeClave = claveValida(clave);
  if (errorDeClave) throw new ErrorDeGestion('fallo', errorDeClave);

  // Equipo: se comprueba antes de crear nada.
  if (datos.equipoId) {
    const { data: eq } = await db.from('equipos').select('id, max_usuarios').eq('id', datos.equipoId).maybeSingle();
    if (!eq) throw new ErrorDeGestion('equipo_no_existe', 'El equipo no existe.');
    const { count } = await db.from('miembros_de_equipo').select('user_id', { count: 'exact', head: true }).eq('equipo_id', datos.equipoId);
    if ((count ?? 0) >= (eq as { max_usuarios: number }).max_usuarios) {
      throw new ErrorDeGestion('equipo_lleno', 'El equipo ya tiene todos sus usuarios. Amplía su plan desde Planes.');
    }
  }

  const { data: creado, error } = await db.auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
    user_metadata: { full_name: datos.nombre.trim() },
    // Siempre cambia la suya al entrar: la que puso el administrador también la conoce otro.
    app_metadata: { debe_cambiar_clave: true, creado_por: actor },
  });
  if (error || !creado.user) {
    if (error && /already|registered|exists/i.test(error.message)) {
      const existente = (await todosLosUsuariosDeAuth(db)).find((u) => u.email?.toLowerCase() === email);
      throw new ErrorDeGestion('ya_existe', 'Ya hay una cuenta con ese correo.', { userId: existente?.id ?? null });
    }
    throw new ErrorDeGestion('fallo', error?.message ?? 'No se pudo crear la cuenta.');
  }
  const userId = creado.user.id;

  try {
    // El disparador `handle_new_user` ya creó el perfil: se completa.
    const { error: ePerfil } = await db
      .from('profiles')
      .upsert(
        {
          id: userId,
          full_name: datos.nombre.trim(),
          organization_name: datos.organizacion?.trim() || null,
          position_title: datos.cargo?.trim() || null,
          profile_role: datos.perfil,
          onboarding_completed: true,
        },
        { onConflict: 'id' },
      );
    if (ePerfil) throw ePerfil;

    const { error: ePermisos } = await db.from('permisos_de_usuario').upsert(
      {
        user_id: userId,
        rol: datos.rol,
        herramientas_extra: limpiarHerramientas(datos.herramientasExtra),
        herramientas_quitadas: limpiarHerramientas(datos.herramientasQuitadas),
        nota: datos.nota?.trim() || null,
        actualizado_por: actor,
      },
      { onConflict: 'user_id' },
    );
    if (ePermisos) throw ePermisos;

    if (datos.equipoId) {
      const { error: eMiembro } = await db
        .from('miembros_de_equipo')
        .insert({ equipo_id: datos.equipoId, user_id: userId, rol: 'miembro' });
      if (eMiembro) throw eMiembro;
    } else if (datos.plan) {
      await asignarPlan({
        userId,
        plan: datos.plan.id,
        modalidad: 'mensual',
        meses: datos.plan.meses,
        creditosMes: datos.plan.creditosMes,
        maxUsuarios: datos.plan.maxUsuarios,
        nombreEquipo: datos.plan.nombreEquipo,
        hechoPor: actor,
      });
    }
  } catch (e) {
    // Nada de cuentas a medias: se borra y el administrador reintenta.
    await db.auth.admin.deleteUser(userId).catch(() => {});
    throw new ErrorDeGestion('fallo', `No se pudo completar la cuenta: ${(e as Error).message}`);
  }

  await registrar(db, actor, 'crear_cuenta', userId, {
    email,
    rol: datos.rol,
    perfil: datos.perfil,
    plan: datos.plan?.id ?? null,
    equipo: datos.equipoId ?? null,
    extra: datos.herramientasExtra ?? [],
    quitadas: datos.herramientasQuitadas ?? [],
  });
  return { userId, email, claveTemporal: datos.clave ? null : clave };
}

// ── Cambiar ──────────────────────────────────────────────────────────

export interface CambiosDeCuenta {
  nombre?: string;
  organizacion?: string | null;
  cargo?: string | null;
  perfil?: ProfileRole;
  rol?: Rol;
  herramientasExtra?: Herramienta[];
  herramientasQuitadas?: Herramienta[];
  nota?: string | null;
}

export async function cambiarCuenta(actor: string, userId: string, cambios: CambiosDeCuenta) {
  const db = servicio();
  const { rolActor, rolObjetivo } = await autorizar(db, actor, userId);
  if (cambios.rol && cambios.rol !== rolObjetivo) {
    // Nadie se cambia su propio rol: un superadmin no se queda fuera sin querer.
    if (actor === userId) throw new ErrorDeGestion('a_si_mismo', 'No puedes cambiar tu propio rol.');
    if (!rolesQuePuedeAsignar(rolActor).includes(cambios.rol)) {
      throw new ErrorDeGestion('rol_no_permitido', 'No puedes asignar ese rol.');
    }
  }

  const perfil: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) perfil.full_name = cambios.nombre.trim();
  if (cambios.organizacion !== undefined) perfil.organization_name = cambios.organizacion?.trim() || null;
  if (cambios.cargo !== undefined) perfil.position_title = cambios.cargo?.trim() || null;
  if (cambios.perfil !== undefined) {
    perfil.profile_role = cambios.perfil;
    perfil.onboarding_completed = true;
  }
  if (Object.keys(perfil).length) {
    const { error } = await db.from('profiles').update(perfil).eq('id', userId);
    if (error) throw new ErrorDeGestion('fallo', error.message);
  }

  const permisos: Record<string, unknown> = {};
  if (cambios.rol !== undefined) permisos.rol = cambios.rol;
  if (cambios.herramientasExtra !== undefined) permisos.herramientas_extra = limpiarHerramientas(cambios.herramientasExtra);
  if (cambios.herramientasQuitadas !== undefined) permisos.herramientas_quitadas = limpiarHerramientas(cambios.herramientasQuitadas);
  if (cambios.nota !== undefined) permisos.nota = cambios.nota?.trim() || null;
  if (Object.keys(permisos).length) {
    const { error } = await db
      .from('permisos_de_usuario')
      .upsert({ user_id: userId, ...permisos, actualizado_por: actor, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw new ErrorDeGestion('fallo', error.message);
  }
  await registrar(db, actor, 'cambiar_cuenta', userId, { ...cambios, rolAnterior: rolObjetivo });
}

export async function restablecerClave(actor: string, userId: string) {
  const db = servicio();
  await autorizar(db, actor, userId);
  const clave = claveTemporal();
  const { data: actual } = await db.auth.admin.getUserById(userId);
  if (!actual.user) throw new ErrorDeGestion('no_existe', 'La cuenta no existe.');
  const { error } = await db.auth.admin.updateUserById(userId, {
    password: clave,
    app_metadata: { ...actual.user.app_metadata, debe_cambiar_clave: true },
  });
  if (error) throw new ErrorDeGestion('fallo', error.message);
  await registrar(db, actor, 'restablecer_clave', userId, {});
  return { claveTemporal: clave };
}

/**
 * Suspender bloquea el ingreso (Auth): no entra ni renueva su sesión. La
 * sesión abierta dura hasta que vence su token (una hora como máximo).
 * No toca la bolsa: si es de un equipo, los demás siguen trabajando.
 */
export async function suspenderAcceso(actor: string, userId: string, suspendido: boolean) {
  const db = servicio();
  if (actor === userId) throw new ErrorDeGestion('a_si_mismo', 'No puedes suspender tu propia cuenta.');
  await autorizar(db, actor, userId);
  const { error } = await db.auth.admin.updateUserById(userId, { ban_duration: suspendido ? '876000h' : 'none' });
  if (error) throw new ErrorDeGestion('fallo', error.message);
  await registrar(db, actor, suspendido ? 'suspender' : 'reactivar', userId, {});
}

// ── La propia contraseña ─────────────────────────────────────────────

/** El usuario fija su contraseña (la temporal o una nueva) y deja de tener que cambiarla. */
export async function fijarMiClave(userId: string, clave: string) {
  const error = claveValida(clave);
  if (error) throw new ErrorDeGestion('fallo', error);
  const db = servicio();
  const { data: actual } = await db.auth.admin.getUserById(userId);
  if (!actual.user) throw new ErrorDeGestion('no_existe', 'La cuenta no existe.');
  const { error: e } = await db.auth.admin.updateUserById(userId, {
    password: clave,
    app_metadata: { ...actual.user.app_metadata, debe_cambiar_clave: false },
  });
  if (e) throw new ErrorDeGestion('fallo', e.message);
  await registrar(db, userId, 'cambiar_mi_clave', userId, {});
}
