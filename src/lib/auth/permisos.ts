/**
 * Roles del equipo y permisos administrativos.
 *
 * POR QUÉ
 *
 * Reunión con César del 27/11/2026: las cuentas las crea el equipo y cada
 * una lleva su rol. Antes había un solo interruptor (`profiles.is_admin`)
 * que abría todo: el panel técnico, los planes y el soporte. Ahora cada
 * sección del panel pide su permiso y el rol decide cuáles tiene.
 *
 * Este archivo no toca la base (se puede importar en el navegador). Las
 * comprobaciones del servidor están en `permisos-servidor.ts`. Los roles
 * se guardan en `permisos_de_usuario` (migración 0092); si cambias los
 * nombres, cambia también el `check` de esa tabla y `es_admin()`.
 *
 * Los roles son administrativos: lo que un usuario puede USAR (chat, voz,
 * evaluadores…) lo deciden su plan y sus herramientas extra o quitadas,
 * no su rol.
 */

export type Rol = 'usuario' | 'soporte' | 'bibliotecario' | 'administrador' | 'superadmin';

export type Permiso =
  /** Crear cuentas, cambiar roles y herramientas, suspender, restablecer contraseñas. */
  | 'usuarios'
  /** Asignar planes y recargas. */
  | 'planes'
  /** Subir y corregir documentos de la Biblioteca Normativa. */
  | 'biblioteca'
  /** Atender la bandeja de ayuda. */
  | 'soporte'
  /** Ver uso, encuestas y métricas. */
  | 'metricas'
  /** Actualizador, diagnóstico de voz, uso de IA: mantenimiento de Promptive. */
  | 'tecnico';

export const ROLES: Rol[] = ['usuario', 'soporte', 'bibliotecario', 'administrador', 'superadmin'];

export const NOMBRE_ROL: Record<Rol, string> = {
  usuario: 'Usuario',
  soporte: 'Soporte',
  bibliotecario: 'Bibliotecario',
  administrador: 'Administrador',
  superadmin: 'Superadministrador',
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  usuario: 'Usa la plataforma según su plan. Sin acceso al panel.',
  soporte: 'Atiende la bandeja de ayuda.',
  bibliotecario: 'Sube y corrige documentos de la Biblioteca Normativa.',
  administrador: 'Crea cuentas, asigna planes y roles, atiende soporte y alimenta la biblioteca.',
  superadmin: 'Todo, incluido el mantenimiento técnico (actualizador, voz, uso de IA).',
};

export const PERMISOS_DEL_ROL: Record<Rol, Permiso[]> = {
  usuario: [],
  soporte: ['soporte'],
  bibliotecario: ['biblioteca'],
  administrador: ['usuarios', 'planes', 'biblioteca', 'soporte', 'metricas'],
  superadmin: ['usuarios', 'planes', 'biblioteca', 'soporte', 'metricas', 'tecnico'],
};

export const NOMBRE_PERMISO: Record<Permiso, string> = {
  usuarios: 'Usuarios y roles',
  planes: 'Planes y créditos',
  biblioteca: 'Biblioteca Normativa',
  soporte: 'Soporte',
  metricas: 'Métricas',
  tecnico: 'Mantenimiento técnico',
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as string[]).includes(valor);
}

export function permisosDelRol(rol: Rol): Permiso[] {
  return PERMISOS_DEL_ROL[rol];
}

export function rolTiene(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_DEL_ROL[rol].includes(permiso);
}

/**
 * Qué roles puede dar quien tiene `rol`. Un administrador forma su equipo
 * (incluidos otros administradores) pero no crea superadministradores: el
 * acceso técnico lo da solo Promptive.
 */
export function rolesQuePuedeAsignar(rol: Rol): Rol[] {
  if (rol === 'superadmin') return ROLES;
  if (rol === 'administrador') return ['usuario', 'soporte', 'bibliotecario', 'administrador'];
  return [];
}

/**
 * Si `actor` puede modificar la cuenta de alguien con rol `objetivo`.
 * Nadie que no sea superadmin toca a un superadmin.
 */
export function puedeGestionarA(actor: Rol, objetivo: Rol): boolean {
  if (!rolTiene(actor, 'usuarios')) return false;
  if (objetivo === 'superadmin') return actor === 'superadmin';
  return true;
}
