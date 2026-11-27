/**
 * El Word de las observaciones al requerimiento: solo las que el usuario
 * seleccionó (reunión con César del 27/11/2026: «selecciono las que
 * quiero… y descargo el Word»).
 *
 * La forma es la del pliego de César (modelo de formulación de consultas y
 * observaciones, documento 14; `src/lib/consultas/tipos.ts`): apaisado, una
 * fila por observación con N.°, capítulo, numeral, literal y página —«No
 * corresponde» cuando no hay, nunca en blanco—, el escrito con sus rótulos
 * (Referencia, 1. Sustento fáctico, 2. Sustento jurídico, 3. Solicitud) y
 * la norma que se vulnera. Sin encabezado: cada entidad pone el suyo.
 */
import type { CeldaCuadro, Pieza } from '@/lib/documentos/piezas';
import { FORMATO_DOCUMENTO, piezasADocx } from '@/lib/documentos/word';
import type { HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import type { CaratulaDelWord } from './observaciones';

const NO_CORRESPONDE = 'No corresponde';
const SEVERIDAD: Record<string, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };
const SOLICITUD: Record<string, string> = {
  modificar: 'Modificar',
  suprimir: 'Suprimir',
  ampliar: 'Ampliar',
  precisar: 'Precisar',
  incorporar: 'Incorporar',
};

const celda = (texto: string, extra: Partial<CeldaCuadro> = {}): CeldaCuadro => ({ texto, ...extra });
const oNo = (t: string | undefined) => (t && t.trim() ? t.trim() : NO_CORRESPONDE);

function fechaLarga(iso?: string): string {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** La norma que se vulnera: lo que no es precedente (Ley, Reglamento, artículo). */
function normaVulnerada(h: HallazgoDeAuditoria): string {
  const normas = (h.fundamento_normativo ?? []).filter((f) => !f.articulo || /^(Ley|Reglamento)\b/i.test(f.articulo));
  return normas.map((f) => (f.articulo && !/^(Ley|Reglamento):/i.test(f.articulo) ? `${f.norma}, ${f.articulo}` : f.norma)).join('; ');
}

/** Los precedentes de la biblioteca con su criterio. */
function sustentoJuridico(h: HallazgoDeAuditoria): string {
  const precedentes = (h.fundamento_normativo ?? []).filter((f) => f.articulo && !/^(Ley|Reglamento)\b/i.test(f.articulo));
  const norma = normaVulnerada(h);
  const partes: string[] = [];
  if (norma) partes.push(norma + '.');
  for (const p of precedentes) {
    const criterio = (p.articulo ?? '').replace(/^[^:]+:\s*/, '');
    partes.push(`**${p.norma}**: ${criterio.length > 420 ? `${criterio.slice(0, 420)}…` : criterio}`);
  }
  return partes.join(' ') || 'Ley N° 32069 y su Reglamento.';
}

function escrito(h: HallazgoDeAuditoria): string {
  const omision = /^\(omisi[óo]n\)/i.test(h.extracto_literal.trim());
  const referencia = omision
    ? `${h.titulo}. ${h.extracto_literal.replace(/^\(omisi[óo]n\)\s*/i, 'Se omite: ')}`
    : `${h.titulo}. El requerimiento dice: «${h.extracto_literal.trim()}»`;
  const solicitud = h.solicitud ? `${SOLICITUD[h.solicitud]}: ` : '';
  return [
    `**Referencia:** ${referencia}`,
    `**1. Sustento fáctico:** ${h.descripcion}`,
    `**2. Sustento jurídico:** ${sustentoJuridico(h)}`,
    `**3. Solicitud:** ${solicitud}${h.recomendacion}`,
  ].join('\n');
}

export function piezasDeObservaciones(d: { denominacion: string; observaciones: HallazgoDeAuditoria[]; caratula?: CaratulaDelWord }): Pieza[] {
  const c = d.caratula ?? {};
  const datos = [
    { etiqueta: 'Denominación de la contratación', valor: d.denominacion },
    ...(c.entidad?.trim() ? [{ etiqueta: 'Entidad', valor: c.entidad.trim() }] : []),
    ...(c.dirigidoA?.trim() ? [{ etiqueta: 'Dirigido a', valor: c.dirigidoA.trim() }] : []),
    ...(c.elaboradoPor?.trim() ? [{ etiqueta: 'Elaborado por', valor: c.elaboradoPor.trim() }] : []),
    ...(c.referencia?.trim() ? [{ etiqueta: 'Referencia', valor: c.referencia.trim() }] : []),
    { etiqueta: 'Fecha', valor: fechaLarga(c.fecha) },
  ];
  return [
    { clase: 'seccion', orientacion: 'horizontal' },
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'OBSERVACIONES AL REQUERIMIENTO' },
    { clase: 'datos', filas: datos },
    {
      clase: 'cuadro',
      proporciones: [4, 13, 7, 7, 6, 45, 18],
      partible: true,
      repetirCabecera: true,
      filas: [
        [
          celda('N.°', { gris: true }),
          celda('Capítulo o sección', { gris: true }),
          celda('Numeral', { gris: true }),
          celda('Literal', { gris: true }),
          celda('Página', { gris: true }),
          celda('Observación', { gris: true }),
          celda('Artículo y norma que se vulnera', { gris: true }),
        ],
        ...d.observaciones.map((h, i) => {
          const u = h.ubicacion_detalle;
          return [
            celda(String(i + 1)),
            celda(`${oNo(u?.capitulo)}\n${SEVERIDAD[h.severidad] ?? ''}`.trim()),
            celda(oNo(u?.numeral)),
            celda(oNo(u?.literal)),
            celda(oNo(u?.pagina)),
            celda(escrito(h)),
            celda(normaVulnerada(h) || NO_CORRESPONDE),
          ];
        }),
      ],
    },
  ];
}

export async function observacionesADocx(d: Parameters<typeof piezasDeObservaciones>[0]): Promise<Buffer> {
  return piezasADocx(piezasDeObservaciones(d), FORMATO_DOCUMENTO);
}
