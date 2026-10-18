/**
 * Créditos: qué herramienta habilita cada plan, cuánto cuesta y cómo se
 * descuenta (documento «PLANES DE A-LEXIA» de César, 17/10/2026).
 *
 * La suscripción habilita herramientas; los créditos permiten usarlas y
 * se comparten entre todas las tareas del plan. La bolsa es del usuario o
 * de su equipo (bolsas_de_creditos, migración 0086). Se descuenta con la
 * función `consumir_creditos`, que bloquea la fila.
 *
 * Los costos los propuso el equipo a partir del simulador de la
 * propuesta (pregunta 1, búsqueda 2, requerimiento 40, evaluación de
 * bases o requerimiento 24); los demás son una propuesta que César puede
 * ajustar aquí sin tocar la base de datos.
 */
import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js';
import { enlaceWhatsApp, planDelCatalogo, type IdDePlan } from './catalogo';

export type Herramienta =
  | 'consulta_texto'
  | 'busqueda_avanzada'
  | 'consulta_voz'
  | 'requerimiento_menor'
  | 'requerimiento_seleccion'
  | 'evaluacion_requerimiento_menor'
  | 'evaluacion_requerimiento_seleccion'
  | 'evaluacion_bases'
  | 'formulacion_consultas'
  | 'evaluacion_ofertas'
  | 'documentos_ejecucion'
  | 'absolucion_consultas';

export const NOMBRE_HERRAMIENTA: Record<Herramienta, string> = {
  consulta_texto: 'Consulta por texto',
  busqueda_avanzada: 'Búsqueda avanzada',
  consulta_voz: 'Consulta por voz',
  requerimiento_menor: 'Generación de requerimientos de contratos menores',
  requerimiento_seleccion: 'Requerimientos para procedimientos de selección',
  evaluacion_requerimiento_menor: 'Evaluación de requerimientos de contratos menores',
  evaluacion_requerimiento_seleccion: 'Evaluación de requerimientos para procedimientos de selección',
  evaluacion_bases: 'Evaluación de bases',
  formulacion_consultas: 'Formulación de consultas y observaciones',
  evaluacion_ofertas: 'Evaluación de ofertas',
  documentos_ejecucion: 'Documentos de ejecución contractual',
  absolucion_consultas: 'Absolución de consultas y observaciones',
};

/** Créditos por uso (la voz, por minuto; las ofertas, por oferta). */
export const COSTO: Record<Herramienta, number> = {
  consulta_texto: 1,
  busqueda_avanzada: 2,
  consulta_voz: 3,
  requerimiento_menor: 40,
  requerimiento_seleccion: 40,
  evaluacion_requerimiento_menor: 24,
  evaluacion_requerimiento_seleccion: 24,
  evaluacion_bases: 24,
  formulacion_consultas: 10,
  evaluacion_ofertas: 30,
  documentos_ejecucion: 20,
  absolucion_consultas: 10,
};

const TODAS = Object.keys(COSTO) as Herramienta[];
const DE_CONSULTA: Herramienta[] = [
  'consulta_texto',
  'busqueda_avanzada',
  'requerimiento_menor',
  'evaluacion_requerimiento_menor',
];
const DE_PROFESIONAL: Herramienta[] = [
  ...DE_CONSULTA,
  'requerimiento_seleccion',
  'evaluacion_requerimiento_seleccion',
  'evaluacion_bases',
  'formulacion_consultas',
  'evaluacion_ofertas',
];

/** La matriz «Herramienta × plan» del documento de César. */
export const HERRAMIENTAS_DEL_PLAN: Record<IdDePlan, Herramienta[]> = {
  prueba: ['consulta_texto'],
  consulta: DE_CONSULTA,
  profesional: DE_PROFESIONAL,
  especialista: TODAS,
  equipos: TODAS,
  organizaciones: TODAS,
};

/** Desde qué plan está cada herramienta (para decirle al usuario a cuál subir). */
export function planMinimo(h: Herramienta): IdDePlan {
  for (const p of ['prueba', 'consulta', 'profesional', 'especialista'] as IdDePlan[]) {
    if (HERRAMIENTAS_DEL_PLAN[p].includes(h)) return p;
  }
  return 'especialista';
}

/**
 * Límites propios de algunos planes, además de los créditos:
 *   · Consulta: hasta 3 operaciones combinadas al mes de requerimientos de
 *     contratos menores (generar, evaluar o ambas), no 3 por cada tipo.
 *   · Profesional: hasta 3 análisis de ofertas al mes, de 2 ofertas cada uno.
 */
export const LIMITES = {
  consulta: { herramientas: ['requerimiento_menor', 'evaluacion_requerimiento_menor'] as Herramienta[], porMes: 3 },
  profesional: { herramientas: ['evaluacion_ofertas'] as Herramienta[], porMes: 3, ofertasPorAnalisis: 2 },
};

function admin(): SupabaseClient {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Bolsa {
  id: string;
  user_id: string | null;
  equipo_id: string | null;
  plan: IdDePlan;
  modalidad: 'mensual' | 'anual';
  estado: 'activo' | 'suspendido';
  creditos_mes: number;
  periodo_inicio: string;
  periodo_fin: string;
  vence_at: string | null;
  usados_periodo: number;
  saldo_recargas: number;
}

export interface EstadoDeCreditos {
  bolsa: Bolsa;
  plan: IdDePlan;
  equipo: { id: string; nombre: string; rol: 'propietario' | 'miembro' } | null;
  /** Créditos del mes que quedan (si el periodo ya venció, el mes completo). */
  delMes: number;
  recargas: number;
  disponibles: number;
  vencido: boolean;
  renovacion: string;
}

/**
 * La bolsa que usa el usuario: la de su equipo si pertenece a uno; si no,
 * la suya. Si no tiene, se le crea la prueba (cuentas anteriores a la
 * migración 0086 sin suscripción).
 */
export async function bolsaDelUsuario(userId: string, cliente: SupabaseClient = admin()): Promise<EstadoDeCreditos> {
  const { data: miembro } = await cliente
    .from('miembros_de_equipo')
    .select('equipo_id, rol, equipos(nombre)')
    .eq('user_id', userId)
    .maybeSingle();
  let bolsa: Bolsa | null = null;
  if (miembro) {
    const { data } = await cliente.from('bolsas_de_creditos').select('*').eq('equipo_id', miembro.equipo_id).maybeSingle();
    bolsa = data as Bolsa | null;
  }
  if (!bolsa) {
    const { data } = await cliente.from('bolsas_de_creditos').select('*').eq('user_id', userId).maybeSingle();
    bolsa = data as Bolsa | null;
  }
  if (!bolsa) {
    const vence = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const { data } = await cliente
      .from('bolsas_de_creditos')
      .upsert(
        { user_id: userId, plan: 'prueba', creditos_mes: 20, periodo_fin: vence, vence_at: vence },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();
    bolsa = data as Bolsa;
  }
  const ahora = Date.now();
  // Vista del periodo vigente sin escribir: la renovación real la hace
  // `consumir_creditos` al primer uso.
  let usados = bolsa.usados_periodo;
  let fin = new Date(bolsa.periodo_fin).getTime();
  const vence = bolsa.vence_at ? new Date(bolsa.vence_at).getTime() : null;
  if (bolsa.plan !== 'prueba') {
    while (fin <= ahora && (vence === null || fin < vence)) {
      const d = new Date(fin);
      d.setUTCMonth(d.getUTCMonth() + 1);
      fin = d.getTime();
      usados = 0;
    }
  }
  const delMes = Math.max(bolsa.creditos_mes - usados, 0);
  const equipoInfo = miembro
    ? {
        id: miembro.equipo_id as string,
        nombre: ((miembro as unknown as { equipos?: { nombre?: string } }).equipos?.nombre ?? 'Equipo') as string,
        rol: miembro.rol as 'propietario' | 'miembro',
      }
    : null;
  return {
    bolsa,
    plan: bolsa.plan,
    equipo: equipoInfo,
    delMes,
    recargas: bolsa.saldo_recargas,
    disponibles: delMes + bolsa.saldo_recargas,
    vencido: bolsa.estado !== 'activo' || (vence !== null && ahora >= vence),
    renovacion: new Date(bolsa.plan === 'prueba' ? (vence ?? fin) : fin).toISOString(),
  };
}

export interface RechazoDePlan {
  ok: false;
  status: number;
  body: {
    error: 'herramienta_no_incluida' | 'sin_creditos' | 'limite_del_plan' | 'plan_vencido' | 'unauthenticated';
    message: string;
    plan: IdDePlan;
    herramienta: Herramienta;
    requeridos?: number;
    disponibles?: number;
    plan_sugerido?: IdDePlan;
    planes_url: string;
    whatsapp_url: string;
  };
}

export interface UsoAutorizado {
  ok: true;
  bolsaId: string;
  creditos: number;
  disponibles: number;
  /** Devuelve los créditos si la tarea falla antes de entregar resultado. */
  reembolsar: (motivo?: string) => Promise<void>;
}

function rechazo(
  estado: EstadoDeCreditos | null,
  herramienta: Herramienta,
  error: RechazoDePlan['body']['error'],
  message: string,
  extra: Partial<RechazoDePlan['body']> = {},
): RechazoDePlan {
  const plan = estado?.plan ?? 'prueba';
  const sugerido = extra.plan_sugerido;
  const texto =
    error === 'sin_creditos'
      ? `Hola, uso A-LexIA (plan ${planDelCatalogo(plan).nombre}) y me quedé sin créditos. Quisiera una recarga.`
      : sugerido
        ? `Hola, uso A-LexIA (plan ${planDelCatalogo(plan).nombre}) y quisiera pasar al plan ${planDelCatalogo(sugerido).nombre}.`
        : `Hola, uso A-LexIA (plan ${planDelCatalogo(plan).nombre}) y quisiera información sobre los planes.`;
  return {
    ok: false,
    status: 402,
    body: { error, message, plan, herramienta, planes_url: '/#planes', whatsapp_url: enlaceWhatsApp(texto), ...extra },
  };
}

/**
 * Comprueba que el plan habilite la herramienta, que no se pase de sus
 * límites y que haya créditos, y los descuenta. Llamar JUSTO antes de
 * hacer el trabajo; si falla después, `reembolsar()`.
 *
 * `unidades`: minutos de voz u ofertas de una evaluación.
 */
export async function usarHerramienta(
  userId: string,
  herramienta: Herramienta,
  opciones: { unidades?: number; detalle?: string; soloComprobar?: boolean; creditos?: number } = {},
): Promise<UsoAutorizado | RechazoDePlan> {
  const cliente = admin();
  const estado = await bolsaDelUsuario(userId, cliente);
  const plan = estado.plan;
  const nombrePlan = planDelCatalogo(plan).nombre;
  const unidades = Math.max(1, Math.round(opciones.unidades ?? 1));
  // `creditos` fija el monto cuando la tarea no se mide en unidades (una
  // repregunta en el generador de documentos cuesta como una consulta).
  const creditos = opciones.creditos ?? COSTO[herramienta] * unidades;

  if (estado.vencido) {
    return rechazo(
      estado,
      herramienta,
      'plan_vencido',
      plan === 'prueba'
        ? 'Tu Prueba A-LexIA terminó. Elige un plan para seguir usando A-LexIA.'
        : `Tu plan ${nombrePlan} no está vigente. Renuévalo para seguir usando A-LexIA.`,
      { plan_sugerido: plan === 'prueba' ? 'consulta' : plan },
    );
  }
  if (!HERRAMIENTAS_DEL_PLAN[plan].includes(herramienta)) {
    const sugerido = planMinimo(herramienta);
    return rechazo(
      estado,
      herramienta,
      'herramienta_no_incluida',
      `${NOMBRE_HERRAMIENTA[herramienta]} no está incluida en tu plan ${nombrePlan}. Está disponible desde el plan ${planDelCatalogo(sugerido).nombre}.`,
      { plan_sugerido: sugerido },
    );
  }
  if (plan === 'profesional' && herramienta === 'evaluacion_ofertas' && unidades > LIMITES.profesional.ofertasPorAnalisis) {
    return rechazo(
      estado,
      herramienta,
      'limite_del_plan',
      `En el plan Profesional cada análisis admite hasta ${LIMITES.profesional.ofertasPorAnalisis} ofertas. Para evaluar ${unidades} a la vez, el plan Especialista.`,
      { plan_sugerido: 'especialista' },
    );
  }
  const limite = plan === 'consulta' || plan === 'profesional' ? LIMITES[plan] : null;
  if (limite && limite.herramientas.includes(herramienta)) {
    const { count } = await cliente
      .from('movimientos_de_creditos')
      .select('id', { count: 'exact', head: true })
      .eq('bolsa_id', estado.bolsa.id)
      .eq('origen', 'consumo')
      .in('herramienta', limite.herramientas)
      .gte('created_at', estado.bolsa.periodo_inicio);
    const { count: devueltos } = await cliente
      .from('movimientos_de_creditos')
      .select('id', { count: 'exact', head: true })
      .eq('bolsa_id', estado.bolsa.id)
      .eq('origen', 'reembolso')
      .in('herramienta', limite.herramientas)
      .gte('created_at', estado.bolsa.periodo_inicio);
    if ((count ?? 0) - (devueltos ?? 0) >= limite.porMes) {
      return rechazo(
        estado,
        herramienta,
        'limite_del_plan',
        plan === 'consulta'
          ? `Tu plan Consulta incluye hasta ${limite.porMes} operaciones al mes de requerimientos de contratos menores (generar o evaluar) y ya las usaste. Se renuevan con tu próximo periodo.`
          : `Tu plan Profesional incluye hasta ${limite.porMes} análisis de ofertas al mes y ya los usaste. Se renuevan con tu próximo periodo.`,
        { plan_sugerido: plan === 'consulta' ? 'profesional' : 'especialista' },
      );
    }
  }
  if (estado.disponibles < creditos) {
    return rechazo(
      estado,
      herramienta,
      'sin_creditos',
      `${NOMBRE_HERRAMIENTA[herramienta]} necesita ${creditos} crédito(s) y te quedan ${estado.disponibles}. Puedes recargar o esperar la renovación de tu plan.`,
      { requeridos: creditos, disponibles: estado.disponibles },
    );
  }
  if (opciones.soloComprobar) {
    return { ok: true, bolsaId: estado.bolsa.id, creditos, disponibles: estado.disponibles, reembolsar: async () => {} };
  }

  const { data, error } = await cliente.rpc('consumir_creditos', {
    p_bolsa: estado.bolsa.id,
    p_user: userId,
    p_herramienta: herramienta,
    p_creditos: creditos,
    p_detalle: opciones.detalle ?? null,
  });
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; disponibles?: number };
  if (error || !r.ok) {
    if (r.motivo === 'vencido' || r.motivo === 'suspendido') {
      return rechazo(estado, herramienta, 'plan_vencido', `Tu plan ${nombrePlan} no está vigente.`);
    }
    return rechazo(
      estado,
      herramienta,
      'sin_creditos',
      `${NOMBRE_HERRAMIENTA[herramienta]} necesita ${creditos} crédito(s) y te quedan ${r.disponibles ?? 0}.`,
      { requeridos: creditos, disponibles: r.disponibles ?? 0 },
    );
  }
  let devuelto = false;
  return {
    ok: true,
    bolsaId: estado.bolsa.id,
    creditos,
    disponibles: r.disponibles ?? 0,
    reembolsar: async (motivo) => {
      if (devuelto) return;
      devuelto = true;
      await cliente.rpc('reembolsar_creditos', {
        p_bolsa: estado.bolsa.id,
        p_user: userId,
        p_herramienta: herramienta,
        p_creditos: creditos,
        p_detalle: motivo ?? 'la tarea no se completó',
      });
    },
  };
}

/** Respuesta JSON estándar de un rechazo (402). */
export function respuestaDeRechazo(r: RechazoDePlan): Response {
  return Response.json(r.body, { status: r.status });
}
