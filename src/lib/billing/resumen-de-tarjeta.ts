/**
 * Lo que pinta la tarjeta «Consumo del mes» del menú lateral.
 *
 * Lo arman dos lados: el layout de la aplicación (servidor, con
 * `bolsaDelUsuario`) y la propia tarjeta cuando el saldo cambia
 * (cliente, con GET /api/cuenta/plan?breve=1). Por eso vive aquí, sin
 * nada de servidor: los dos tienen que decir exactamente lo mismo.
 *
 * Antes la tarjeta mostraba tres cuotas (Consultar, Generar, Evaluar)
 * del modelo viejo de planes. Con el documento «PLANES DE A-LEXIA» de
 * César (17/10/2026) hay una sola bolsa de créditos que comparten todas
 * las herramientas: la tarjeta enseña esa bolsa.
 */
import { planDelCatalogo, type IdDePlan } from './catalogo';

export interface ResumenDePlan {
  /** Nombre del plan; si es de equipo, el nombre del equipo. */
  etiqueta: string;
  /** «Plan Equipos» bajo el nombre del equipo; null en planes individuales. */
  subtitulo: string | null;
  plan: IdDePlan;
  creditosMes: number;
  usadosDelMes: number;
  recargas: number;
  disponibles: number;
  /** «Renueva el 17/11/2026», «Prueba: vence el …» o «Venció el …». */
  renovacion: string | null;
  vencido: boolean;
}

/** Los datos mínimos de la bolsa (de `bolsaDelUsuario` o de la API). */
export interface DatosDeBolsa {
  plan: IdDePlan;
  equipo: { nombre: string } | null;
  creditosMes: number;
  delMes: number;
  recargas: number;
  disponibles: number;
  renovacion: string;
  venceAt: string | null;
  vencido: boolean;
}

/** dd/mm/aaaa en hora de Lima: en Vercel el servidor está en UTC. */
const fecha = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - 5 * 3_600_000);
  const dos = (x: number) => String(x).padStart(2, '0');
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

export function resumenDeTarjeta(d: DatosDeBolsa): ResumenDePlan {
  const cat = planDelCatalogo(d.plan);
  const esPrueba = d.plan === 'prueba';
  let renovacion: string | null;
  if (d.vencido && d.venceAt && new Date(d.venceAt).getTime() <= Date.now()) {
    renovacion = `${esPrueba ? 'La prueba venció' : 'Venció'} el ${fecha(d.venceAt)}`;
  } else if (d.vencido) {
    renovacion = 'Plan suspendido';
  } else if (esPrueba) {
    renovacion = `Prueba: vence el ${fecha(d.venceAt ?? d.renovacion)}`;
  } else {
    renovacion = `Renueva el ${fecha(d.renovacion)}`;
  }
  return {
    etiqueta: d.equipo?.nombre ?? cat.nombre,
    subtitulo: d.equipo ? `Plan ${cat.nombre}` : null,
    plan: d.plan,
    creditosMes: d.creditosMes,
    usadosDelMes: Math.max(d.creditosMes - d.delMes, 0),
    recargas: d.recargas,
    disponibles: d.disponibles,
    renovacion,
    vencido: d.vencido,
  };
}

/**
 * Aviso para que la tarjeta lateral vuelva a leer el saldo. Lo emiten las
 * pantallas que gastan créditos (chat, búsqueda, evaluaciones…): el
 * layout de la aplicación no se vuelve a pintar al navegar, así que sin
 * esto la tarjeta seguiría con el saldo de cuando se abrió la página.
 */
export const EVENTO_CREDITOS = 'alexia:creditos';
export function creditosCambiaron() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CREDITOS));
}
