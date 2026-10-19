/**
 * Gestión de planes, recargas y equipos (servidor).
 *
 * Hoy no hay cobro en línea: el cliente elige su plan y lo pide por
 * WhatsApp, y un administrador lo activa desde el panel (/admin/planes).
 * Equipos y Organizaciones tienen una bolsa compartida: el propietario
 * invita con un enlace y cada miembro entra con su propia cuenta.
 */
import { randomBytes } from 'node:crypto';
import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js';
import { planDelCatalogo, type IdDePlan } from './catalogo';
import {
  bolsaDelUsuario,
  COSTO,
  HERRAMIENTAS_DEL_PLAN,
  LIMITES,
  NOMBRE_HERRAMIENTA,
  periodoVigente,
  sumarMeses,
  type Bolsa,
  type Herramienta,
  type LoteDeRecarga,
} from './creditos';
import { DIAS_DE_RECARGA } from './limites';

export function servicio(): SupabaseClient {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Lo que ve el usuario en «Mi plan»: plan, créditos, límites, movimientos y equipo. */
export async function resumenDeCuenta(userId: string) {
  const db = servicio();
  const estado = await bolsaDelUsuario(userId, db);
  const plan = planDelCatalogo(estado.plan);
  const { data: movimientos } = await db
    .from('movimientos_de_creditos')
    .select('id, user_id, origen, herramienta, creditos, detalle, created_at')
    .eq('bolsa_id', estado.bolsa.id)
    .order('created_at', { ascending: false })
    .limit(40);
  // Consumo del periodo por herramienta.
  const { data: delPeriodo } = await db
    .from('movimientos_de_creditos')
    .select('herramienta, creditos, origen')
    .eq('bolsa_id', estado.bolsa.id)
    .gte('created_at', estado.periodoInicio)
    .in('origen', ['consumo', 'reembolso']);
  const porHerramienta: Record<string, { usos: number; creditos: number }> = {};
  for (const m of (delPeriodo ?? []) as Array<{ herramienta: string; creditos: number; origen: string }>) {
    const h = m.herramienta ?? 'otro';
    porHerramienta[h] ??= { usos: 0, creditos: 0 };
    porHerramienta[h].usos += m.origen === 'consumo' ? 1 : -1;
    porHerramienta[h].creditos += -m.creditos;
  }
  const limite =
    estado.plan === 'consulta' || estado.plan === 'profesional'
      ? (() => {
          const l = LIMITES[estado.plan];
          const usados = l.herramientas.reduce((t, h) => t + (porHerramienta[h]?.usos ?? 0), 0);
          return {
            texto:
              estado.plan === 'consulta'
                ? 'Operaciones de requerimientos de contratos menores'
                : `Análisis de ofertas (hasta ${LIMITES.profesional.ofertasPorAnalisis} ofertas cada uno)`,
            usados: Math.max(0, usados),
            maximo: l.porMes,
          };
        })()
      : null;

  // Nombres de quienes usaron la bolsa (en equipos).
  let miembros: Array<{ user_id: string; rol: string; nombre: string; email: string | null }> = [];
  let invitaciones: Array<{ id: string; token: string; expira_at: string; usada_at: string | null }> = [];
  let maxUsuarios = 1;
  if (estado.equipo) {
    const { data: ms } = await db.from('miembros_de_equipo').select('user_id, rol').eq('equipo_id', estado.equipo.id);
    const ids = (ms ?? []).map((m) => m.user_id as string);
    const { data: perfiles } = await db.from('profiles').select('id, full_name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    const correos = await Promise.all(ids.map((id) => db.auth.admin.getUserById(id).then((r) => [id, r.data.user?.email ?? null] as const)));
    const correo = new Map(correos);
    const nombre = new Map(((perfiles ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name ?? '']));
    miembros = (ms ?? []).map((m) => ({
      user_id: m.user_id as string,
      rol: m.rol as string,
      nombre: nombre.get(m.user_id as string) || (correo.get(m.user_id as string) ?? 'Usuario'),
      email: correo.get(m.user_id as string) ?? null,
    }));
    const { data: eq } = await db.from('equipos').select('max_usuarios').eq('id', estado.equipo.id).single();
    maxUsuarios = (eq as { max_usuarios: number } | null)?.max_usuarios ?? 5;
    if (estado.equipo.rol === 'propietario') {
      const { data: inv } = await db
        .from('invitaciones_de_equipo')
        .select('id, token, expira_at, usada_at')
        .eq('equipo_id', estado.equipo.id)
        .is('usada_at', null)
        .gt('expira_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      invitaciones = (inv ?? []) as typeof invitaciones;
    }
  }

  return {
    plan: { id: plan.id, nombre: plan.nombre, tipo: plan.tipo, creditosMes: estado.bolsa.creditos_mes, modalidad: estado.bolsa.modalidad },
    creditos: {
      disponibles: estado.disponibles,
      delMes: estado.delMes,
      recargas: estado.recargas,
      // Cada recarga vence a los 30 días de activada (César, 18/10/2026).
      lotes: estado.lotes.map((l) => ({ id: l.id, creditos: l.creditos, saldo: l.saldo, activadaAt: l.activada_at, venceAt: l.vence_at })),
      usadosDelMes: Math.max(estado.bolsa.creditos_mes - estado.delMes, 0),
      renovacion: estado.renovacion,
      venceAt: estado.bolsa.vence_at,
      vencido: estado.vencido,
    },
    herramientas: (Object.keys(COSTO) as Herramienta[]).map((h) => ({
      id: h,
      nombre: NOMBRE_HERRAMIENTA[h],
      costo: COSTO[h],
      incluida: HERRAMIENTAS_DEL_PLAN[estado.plan].includes(h),
      usos: Math.max(0, porHerramienta[h]?.usos ?? 0),
      creditos: Math.max(0, porHerramienta[h]?.creditos ?? 0),
    })),
    limite,
    movimientos: movimientos ?? [],
    equipo: estado.equipo ? { ...estado.equipo, maxUsuarios, miembros, invitaciones } : null,
  };
}

// ── Administración ─────────────────────────────────────────────────────

/**
 * Activa un plan para un usuario. Los planes individuales van a su
 * bolsa; Equipos y Organizaciones crean (o actualizan) un equipo con él
 * como propietario y la bolsa compartida.
 */
export async function asignarPlan(args: {
  userId: string;
  plan: IdDePlan;
  modalidad: 'mensual' | 'anual';
  /** Meses pagados (anual = 12). Null = sin vencimiento (cuentas internas). */
  meses: number | null;
  creditosMes?: number;
  maxUsuarios?: number;
  nombreEquipo?: string;
  hechoPor: string;
}) {
  const db = servicio();
  const cat = planDelCatalogo(args.plan);
  const ahora = new Date();
  const creditosMes = args.creditosMes ?? (args.plan === 'prueba' ? 20 : cat.creditosMes);
  const vence = args.plan === 'prueba' ? sumarMeses(ahora, 1) : args.meses ? sumarMeses(ahora, args.meses) : null;
  const fila = {
    plan: args.plan,
    modalidad: args.modalidad,
    estado: 'activo',
    creditos_mes: creditosMes,
    // La renovación mensual se cuenta desde aquí: inicio + 1, + 2… meses.
    inicio_plan: ahora.toISOString(),
    periodo_inicio: ahora.toISOString(),
    periodo_fin: (args.plan === 'prueba' ? vence! : sumarMeses(ahora, 1)).toISOString(),
    vence_at: vence ? vence.toISOString() : null,
    usados_periodo: 0,
    updated_at: ahora.toISOString(),
  };

  let bolsaId: string;
  if (cat.empresas) {
    // ¿Ya es propietario de un equipo? Se reutiliza; si no, se crea.
    const { data: yaMiembro } = await db.from('miembros_de_equipo').select('equipo_id, rol').eq('user_id', args.userId).maybeSingle();
    let equipoId = yaMiembro?.rol === 'propietario' ? (yaMiembro.equipo_id as string) : null;
    if (yaMiembro && !equipoId) throw new Error('El usuario es miembro de otro equipo: primero debe salir de él.');
    const maxUsuarios = args.maxUsuarios ?? cat.usuarios;
    if (!equipoId) {
      const { data: eq, error } = await db
        .from('equipos')
        .insert({ nombre: args.nombreEquipo?.trim() || 'Mi equipo', propietario: args.userId, max_usuarios: maxUsuarios })
        .select('id')
        .single();
      if (error) throw error;
      equipoId = (eq as { id: string }).id;
      await db.from('miembros_de_equipo').insert({ equipo_id: equipoId, user_id: args.userId, rol: 'propietario' });
    } else {
      await db
        .from('equipos')
        .update({ max_usuarios: maxUsuarios, ...(args.nombreEquipo ? { nombre: args.nombreEquipo.trim() } : {}) })
        .eq('id', equipoId);
    }
    const { data: b, error } = await db
      .from('bolsas_de_creditos')
      .upsert({ equipo_id: equipoId, ...fila }, { onConflict: 'equipo_id' })
      .select('id')
      .single();
    if (error) throw error;
    bolsaId = (b as { id: string }).id;
  } else {
    const { data: b, error } = await db
      .from('bolsas_de_creditos')
      .upsert({ user_id: args.userId, ...fila }, { onConflict: 'user_id' })
      .select('id')
      .single();
    if (error) throw error;
    bolsaId = (b as { id: string }).id;
  }
  await db.from('movimientos_de_creditos').insert({
    bolsa_id: bolsaId,
    user_id: args.hechoPor,
    origen: 'asignacion',
    herramienta: null,
    creditos: creditosMes,
    detalle: `Plan ${cat.nombre} (${args.modalidad}${args.meses ? `, ${args.meses} mes(es)` : ', sin vencimiento'})`,
    periodo_inicio: fila.periodo_inicio,
  });
  return { bolsaId };
}

/**
 * Suma una recarga a la bolsa que usa el usuario (la de su equipo si
 * tiene). Cada recarga es un lote que vence a los 30 días calendario de
 * activada (César, 18/10/2026); `recargar_creditos` (migración 0087) crea
 * el lote y su movimiento juntos.
 */
export async function recargar(args: { userId: string; creditos: number; detalle?: string; hechoPor: string }) {
  const db = servicio();
  const estado = await bolsaDelUsuario(args.userId, db);
  const { data, error } = await db.rpc('recargar_creditos', {
    p_bolsa: estado.bolsa.id,
    p_user: args.hechoPor,
    p_creditos: args.creditos,
    p_detalle: args.detalle ?? null,
    p_dias: DIAS_DE_RECARGA,
  });
  if (error) throw error;
  return { loteId: data as string };
}

export async function suspender(args: { userId: string; suspendido: boolean }) {
  const db = servicio();
  const estado = await bolsaDelUsuario(args.userId, db);
  await db.from('bolsas_de_creditos').update({ estado: args.suspendido ? 'suspendido' : 'activo' }).eq('id', estado.bolsa.id);
}

/** Usuarios con su plan, para el panel. */
export async function listarCuentas() {
  const db = servicio();
  const { data: usuarios } = await db.auth.admin.listUsers({ perPage: 1000 });
  const { data: perfiles } = await db.from('profiles').select('id, full_name, organization_name, is_admin');
  const { data: bolsas } = await db.from('bolsas_de_creditos').select('*');
  const { data: miembros } = await db.from('miembros_de_equipo').select('user_id, equipo_id, rol, equipos(nombre, max_usuarios)');
  // Solo las recargas vigentes: las vencidas ya no suman.
  const { data: lotes } = await db
    .from('recargas_de_creditos')
    .select('bolsa_id, saldo, vence_at')
    .gt('saldo', 0)
    .gt('vence_at', new Date().toISOString());
  const recargasDe = new Map<string, { saldo: number; vence: string | null }>();
  for (const l of (lotes ?? []) as Array<Pick<LoteDeRecarga, 'saldo' | 'vence_at'> & { bolsa_id: string }>) {
    const r = recargasDe.get(l.bolsa_id) ?? { saldo: 0, vence: null };
    r.saldo += l.saldo;
    if (!r.vence || l.vence_at < r.vence) r.vence = l.vence_at;
    recargasDe.set(l.bolsa_id, r);
  }
  const perfil = new Map(((perfiles ?? []) as Array<{ id: string; full_name: string | null; organization_name: string | null; is_admin: boolean }>).map((p) => [p.id, p]));
  const bolsaDeUsuario = new Map(((bolsas ?? []) as Array<Record<string, unknown>>).filter((b) => b.user_id).map((b) => [b.user_id as string, b]));
  const bolsaDeEquipo = new Map(((bolsas ?? []) as Array<Record<string, unknown>>).filter((b) => b.equipo_id).map((b) => [b.equipo_id as string, b]));
  const miembro = new Map(((miembros ?? []) as Array<Record<string, unknown>>).map((m) => [m.user_id as string, m]));
  return (usuarios?.users ?? []).map((u) => {
    const m = miembro.get(u.id) as { equipo_id: string; rol: string; equipos?: { nombre?: string; max_usuarios?: number } } | undefined;
    const b = (m ? bolsaDeEquipo.get(m.equipo_id) : null) ?? bolsaDeUsuario.get(u.id) ?? null;
    const rec = b ? recargasDe.get(b.id as string) : undefined;
    const disponibles = b
      ? Math.max((b.creditos_mes as number) - periodoVigente(b as unknown as Bolsa).usados, 0) + (rec?.saldo ?? 0)
      : 0;
    return {
      id: u.id,
      email: u.email ?? null,
      nombre: perfil.get(u.id)?.full_name ?? null,
      organizacion: perfil.get(u.id)?.organization_name ?? null,
      esAdmin: perfil.get(u.id)?.is_admin === true,
      creado: u.created_at,
      plan: (b?.plan as IdDePlan | undefined) ?? null,
      modalidad: (b?.modalidad as string | undefined) ?? null,
      estado: (b?.estado as string | undefined) ?? null,
      venceAt: (b?.vence_at as string | null | undefined) ?? null,
      creditosMes: (b?.creditos_mes as number | undefined) ?? 0,
      disponibles,
      recargas: rec?.saldo ?? 0,
      /** Cuándo vence la próxima recarga (la que vence primero). */
      recargaVence: rec?.vence ?? null,
      equipo: m ? { id: m.equipo_id, nombre: m.equipos?.nombre ?? 'Equipo', rol: m.rol, maxUsuarios: m.equipos?.max_usuarios ?? null } : null,
    };
  });
}

// ── Equipos ────────────────────────────────────────────────────────────

export async function crearInvitacion(propietario: string) {
  const db = servicio();
  const { data: m } = await db.from('miembros_de_equipo').select('equipo_id, rol').eq('user_id', propietario).maybeSingle();
  if (!m || m.rol !== 'propietario') throw new Error('Solo el propietario del equipo puede invitar.');
  const token = randomBytes(18).toString('base64url');
  const { data, error } = await db
    .from('invitaciones_de_equipo')
    .insert({ equipo_id: m.equipo_id, token, creada_por: propietario })
    .select('id, token, expira_at')
    .single();
  if (error) throw error;
  return data as { id: string; token: string; expira_at: string };
}

export async function revocarInvitacion(propietario: string, invitacionId: string) {
  const db = servicio();
  const { data: m } = await db.from('miembros_de_equipo').select('equipo_id, rol').eq('user_id', propietario).maybeSingle();
  if (!m || m.rol !== 'propietario') throw new Error('Solo el propietario del equipo puede revocar invitaciones.');
  await db.from('invitaciones_de_equipo').delete().eq('id', invitacionId).eq('equipo_id', m.equipo_id);
}

/** Qué equipo es una invitación (para la pantalla de aceptar). */
export async function verInvitacion(token: string) {
  const db = servicio();
  const { data } = await db
    .from('invitaciones_de_equipo')
    .select('id, equipo_id, expira_at, usada_at, equipos(nombre, max_usuarios, propietario)')
    .eq('token', token)
    .maybeSingle();
  if (!data) return null;
  const eq = (data as unknown as { equipos: { nombre: string; max_usuarios: number; propietario: string } }).equipos;
  const { count } = await db.from('miembros_de_equipo').select('user_id', { count: 'exact', head: true }).eq('equipo_id', data.equipo_id);
  const { data: bolsa } = await db.from('bolsas_de_creditos').select('plan').eq('equipo_id', data.equipo_id).maybeSingle();
  return {
    equipoId: data.equipo_id as string,
    equipo: eq.nombre,
    plan: planDelCatalogo((bolsa as { plan?: string } | null)?.plan ?? 'equipos').nombre,
    vencida: !!data.usada_at || new Date(data.expira_at as string).getTime() < Date.now(),
    // La pantalla de aceptar dice cuál de las dos: «ya se usó» pide otra
    // cosa al usuario que «venció» (en los dos casos, un enlace nuevo,
    // pero el primero suele ser que ya entró con otra cuenta).
    usada: !!data.usada_at,
    expira_at: data.expira_at as string,
    lleno: (count ?? 0) >= eq.max_usuarios,
  };
}

export async function aceptarInvitacion(userId: string, token: string) {
  const db = servicio();
  const { data: inv } = await db.from('invitaciones_de_equipo').select('*').eq('token', token).maybeSingle();
  if (!inv) throw new Error('La invitación no existe.');
  if (inv.usada_at) throw new Error('Esta invitación ya se usó. Pide una nueva al propietario del equipo.');
  if (new Date(inv.expira_at).getTime() < Date.now()) throw new Error('La invitación venció. Pide una nueva.');
  const { data: ya } = await db.from('miembros_de_equipo').select('equipo_id').eq('user_id', userId).maybeSingle();
  if (ya) {
    if (ya.equipo_id === inv.equipo_id) return { yaEra: true };
    throw new Error('Ya perteneces a otro equipo. Sal de él antes de unirte a este.');
  }
  const { data: eq } = await db.from('equipos').select('max_usuarios').eq('id', inv.equipo_id).single();
  const { count } = await db.from('miembros_de_equipo').select('user_id', { count: 'exact', head: true }).eq('equipo_id', inv.equipo_id);
  if ((count ?? 0) >= ((eq as { max_usuarios: number }).max_usuarios ?? 5)) {
    throw new Error('El equipo ya tiene todos sus usuarios. El propietario puede ampliar su plan.');
  }
  const { error } = await db.from('miembros_de_equipo').insert({ equipo_id: inv.equipo_id, user_id: userId, rol: 'miembro' });
  if (error) throw error;
  await db.from('invitaciones_de_equipo').update({ usada_por: userId, usada_at: new Date().toISOString() }).eq('id', inv.id);
  return { yaEra: false };
}

/** El propietario quita a un miembro, o un miembro sale (userId = él mismo). */
export async function quitarMiembro(solicitante: string, userId: string) {
  const db = servicio();
  const { data: s } = await db.from('miembros_de_equipo').select('equipo_id, rol').eq('user_id', solicitante).maybeSingle();
  const { data: m } = await db.from('miembros_de_equipo').select('equipo_id, rol').eq('user_id', userId).maybeSingle();
  if (!s || !m || s.equipo_id !== m.equipo_id) throw new Error('No pertenece a tu equipo.');
  if (m.rol === 'propietario') throw new Error('El propietario no puede salir de su equipo.');
  if (solicitante !== userId && s.rol !== 'propietario') throw new Error('Solo el propietario puede quitar miembros.');
  await db.from('miembros_de_equipo').delete().eq('user_id', userId).eq('equipo_id', m.equipo_id);
}

export async function renombrarEquipo(propietario: string, nombre: string) {
  const db = servicio();
  const { data: m } = await db.from('miembros_de_equipo').select('equipo_id, rol').eq('user_id', propietario).maybeSingle();
  if (!m || m.rol !== 'propietario') throw new Error('Solo el propietario puede cambiar el nombre.');
  await db.from('equipos').update({ nombre: nombre.trim().slice(0, 120) }).eq('id', m.equipo_id);
}
