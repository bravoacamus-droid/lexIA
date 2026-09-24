/**
 * La auditoría del documento antes de descargarlo (sección 16).
 *
 * Casi todo se comprueba sin modelo, porque es comprobable: un RUC que
 * no es el del contratista, una fecha o un monto que no están en ningún
 * documento ni salen de un cálculo, un artículo que no estaba en el
 * sustento, la Ley nueva citada para un contrato del régimen anterior,
 * una resolución firmada por la autoridad que no es la competente. Solo
 * la coherencia entre antecedentes, análisis, conclusiones y parte
 * resolutiva la lee el modelo.
 *
 * Si hay un error, el documento definitivo no se emite: «Se detectó una
 * inconsistencia que debe ser revisada antes de emitir el documento».
 */
import { auditarCitas, type BuscarEnBiblioteca } from '@/lib/normativa/citas';
import { aNumero } from './calculos';
import { soloElNumero } from './ficha';
import { pedirJSON } from './modelo';
import { fechaISO } from './regimen';
import { TEXTO_PROCEDENCIA } from './suficiencia';
import type {
  AnalisisDeActuacion,
  AuditoriaDelDocumento,
  DocumentoDelExpediente,
  Ficha,
  HallazgoDeAuditoria,
  Respuesta,
} from './tipos';

export const MENSAJE_BLOQUEO = 'Se detectó una inconsistencia que debe ser revisada antes de emitir el documento.';

const MESES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

/** Todas las fechas de un texto, en AAAA-MM-DD, con cómo aparecían. */
export function fechasDe(texto: string): Array<{ iso: string; tal: string }> {
  const out: Array<{ iso: string; tal: string }> = [];
  const largas = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|se?ptiembre|octubre|noviembre|diciembre)\s+(?:de|del)\s+(\d{4})\b/gi;
  for (const m of texto.matchAll(largas)) {
    out.push({ iso: `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`, tal: m[0] });
  }
  const cortas = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g;
  for (const m of texto.matchAll(cortas)) {
    const iso = fechaISO(`${m[1]}/${m[2]}/${m[3]}`);
    if (iso) out.push({ iso, tal: m[0] });
  }
  return out;
}

/** Todos los montos en soles de un texto. */
export function montosDe(texto: string): Array<{ n: number; tal: string }> {
  const out: Array<{ n: number; tal: string }> = [];
  for (const m of texto.matchAll(/S\/\.?\s*(\d(?:[\d'.,]*\d)?)/g)) {
    const n = aNumero(m[1]);
    if (n !== null) out.push({ n, tal: m[0].trim() });
  }
  return out;
}

const RUC = /\b(?:10|15|16|17|20)\d{9}\b/g;

function numeroDeContrato(texto: string): string[] {
  return [...texto.matchAll(/\bContrato\s+(?:de\s+[A-Za-zÁÉÍÓÚáéíóúñ ]{3,40}?\s+)?N\.?\s*[°ºo]?\.?\s*([0-9][\w\-/.]*[\w])/g)].map((m) => m[1]);
}

const normal = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Los porcentajes que da la norma y se pueden citar siempre. */
const PORCENTAJES_NORMATIVOS = new Set([10, 15, 20, 25, 30, 40, 50, 100]);

export interface EntradaAuditoria {
  texto: string;
  analisis: AnalisisDeActuacion;
  ficha: Ficha;
  documentos: DocumentoDelExpediente[];
  respuestas: Respuesta[];
  pedido: string;
  perfil: string;
  hoy: string;
  buscarEnBiblioteca?: BuscarEnBiblioteca;
}

export async function auditoriaDeterminista(e: EntradaAuditoria): Promise<HallazgoDeAuditoria[]> {
  const h: HallazgoDeAuditoria[] = [];
  const a = e.analisis;
  const fuentes = [
    ...e.documentos.filter((d) => d.origen === 'cargado').map((d) => d.texto ?? ''),
    e.pedido,
    ...e.respuestas.map((r) => r.respuesta),
    ...Object.values(e.ficha).map((v) => v!.valor),
  ].join('\n');

  // ── Identificación ──
  const rucFicha = e.ficha.ruc_contratista?.valor?.replace(/\D/g, '');
  const rucsFuente = new Set(fuentes.match(RUC) ?? []);
  for (const ruc of new Set(e.texto.match(RUC) ?? [])) {
    if (rucFicha && ruc !== rucFicha && !rucsFuente.has(ruc))
      h.push({ tipo: 'identificacion', gravedad: 'error', texto: `El RUC ${ruc} no coincide con el del contratista (${rucFicha}).` });
    else if (!rucsFuente.has(ruc))
      h.push({ tipo: 'identificacion', gravedad: 'error', texto: `El RUC ${ruc} no consta en ningún documento del expediente.` });
  }
  const contratoFicha = e.ficha.numero_contrato?.valor;
  const contratosFuente = new Set(numeroDeContrato(fuentes).map(normal));
  if (contratoFicha) for (const n of numeroDeContrato(contratoFicha)) contratosFuente.add(normal(n));
  if (contratoFicha) contratosFuente.add(normal(soloElNumero(contratoFicha)));
  // Un número con espacios («0115-2024-GRA-SEDE CENTRAL-OAPF») se lee
  // cortado en el primer espacio: vale si es el principio de uno conocido.
  const conocido = (n: string) =>
    contratosFuente.has(normal(n)) || (normal(n).length >= 6 && [...contratosFuente].some((f) => f.startsWith(normal(n)) || normal(n).startsWith(f)));
  for (const n of new Set(numeroDeContrato(e.texto))) {
    if (contratosFuente.size && !conocido(n))
      h.push({ tipo: 'identificacion', gravedad: 'error', texto: `El contrato «N.° ${n}» no coincide con el del expediente${contratoFicha ? ` (${contratoFicha})` : ''}.` });
  }

  // ── Fechas ──
  const fechasPermitidas = new Set<string>([e.hoy]);
  for (const f of fechasDe(fuentes)) fechasPermitidas.add(f.iso);
  for (const v of Object.values(e.ficha)) {
    const iso = fechaISO(v!.valor);
    if (iso) fechasPermitidas.add(iso);
  }
  for (const d of e.documentos) if (d.datos.fecha) fechasPermitidas.add(d.datos.fecha);
  for (const x of a.hechos) if (x.fecha) fechasPermitidas.add(x.fecha);
  for (const c of a.calculos) for (const v of c.valores ?? []) for (const f of fechasDe(v)) fechasPermitidas.add(f.iso);
  // Las fechas que la norma nombra (vigencia de la Ley, publicación del
  // Reglamento, modificaciones) no son del caso: salen del sustento.
  for (const f of fechasDe(a.sustento)) fechasPermitidas.add(f.iso);
  const vistasF = new Set<string>();
  for (const f of fechasDe(e.texto)) {
    if (fechasPermitidas.has(f.iso) || vistasF.has(f.iso)) continue;
    vistasF.add(f.iso);
    h.push({
      tipo: 'fechas',
      gravedad: 'error',
      texto: `La fecha «${f.tal}» no consta en los documentos del expediente, en lo declarado ni en los cálculos.`,
    });
  }

  // ── Economía ──
  const montosPermitidos: number[] = [];
  for (const m of montosDe(fuentes)) montosPermitidos.push(m.n);
  for (const d of e.documentos) for (const m of d.datos.montos ?? []) montosPermitidos.push(m.monto);
  for (const k of ['monto_original', 'monto_vigente'] as const) {
    const n = aNumero(e.ficha[k]?.valor);
    if (n !== null) montosPermitidos.push(n);
  }
  for (const r of e.respuestas) {
    const n = aNumero(r.respuesta);
    if (n !== null) montosPermitidos.push(n);
  }
  for (const c of a.calculos) for (const v of c.valores ?? []) for (const m of montosDe(v)) montosPermitidos.push(m.n);
  const vistosM = new Set<number>();
  for (const m of montosDe(e.texto)) {
    if (vistosM.has(m.n)) continue;
    vistosM.add(m.n);
    if (!montosPermitidos.some((p) => Math.abs(p - m.n) < 0.011))
      h.push({ tipo: 'economia', gravedad: 'error', texto: `El monto «${m.tal}» no consta en los documentos ni resulta de los cálculos.` });
  }
  const porcentajesPermitidos = new Set<string>();
  for (const c of a.calculos) for (const v of c.valores ?? []) for (const p of v.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) porcentajesPermitidos.add(p[1].replace(',', '.'));
  for (const p of fuentes.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) porcentajesPermitidos.add(p[1].replace(',', '.'));
  for (const p of a.sustento.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) porcentajesPermitidos.add(p[1].replace(',', '.'));
  porcentajesPermitidos.add(String(a.suficiencia));
  const vistosP = new Set<string>();
  for (const p of e.texto.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    const v = p[1].replace(',', '.');
    if (vistosP.has(v)) continue;
    vistosP.add(v);
    if (PORCENTAJES_NORMATIVOS.has(Number(v)) || porcentajesPermitidos.has(v) || porcentajesPermitidos.has(String(Number(v)))) continue;
    h.push({ tipo: 'economia', gravedad: 'advertencia', texto: `El porcentaje «${p[0]}» no sale de los cálculos ni de los documentos: verifícalo.` });
  }

  // ── Normativa ──
  const anterior = a.regimen.clave === 'ley_30225';
  if (anterior) {
    if (/Decreto\s+Supremo\s+N\.?\s*[°º]?\s*009-2025-EF|Reglamento\s+de\s+la\s+Ley\s+N\.?\s*[°º]?\s*32069/i.test(e.texto))
      h.push({
        tipo: 'normativa',
        gravedad: 'error',
        texto: 'El contrato se rige por el régimen anterior (Ley N.° 30225 y su Reglamento), pero el documento aplica el Reglamento de la Ley N.° 32069.',
      });
  } else {
    const auditoria = await auditarCitas(e.texto, a.sustento, e.buscarEnBiblioteca);
    for (const av of auditoria.avisos) {
      const grave = /derogad|sustituido|no aparece en el sustento/.test(av.motivo);
      h.push({ tipo: 'normativa', gravedad: grave ? 'error' : 'advertencia', texto: `«${av.cita}»: ${av.motivo}.` });
    }
  }

  // ── Competencia ──
  const organo = a.competencia.organo.toLowerCase();
  if (e.perfil === 'aga' && /^titular/.test(organo))
    h.push({ tipo: 'competencia', gravedad: 'error', texto: `La decisión corresponde a: ${a.competencia.organo} (${a.competencia.base}); no a la autoridad de la gestión administrativa.` });
  if (e.perfil === 'titular' && /^autoridad de la gesti/.test(organo))
    h.push({ tipo: 'competencia', gravedad: 'advertencia', texto: `La norma atribuye esta decisión a la autoridad de la gestión administrativa (${a.competencia.base}): verifica por qué la emite el Titular.` });
  if (/^ninguno/.test(organo))
    h.push({ tipo: 'competencia', gravedad: 'error', texto: `${a.competencia.organo}. Ningún órgano puede aprobarlo (${a.competencia.base}).` });

  // ── Lo que falta completar ──
  const huecos = (e.texto.match(/\[[^\]\n]{1,80}\]/g) ?? []).filter((x) => !/^\[(?:x|X| )\]$/.test(x));
  if (huecos.length)
    h.push({
      tipo: 'identificacion',
      gravedad: 'advertencia',
      texto: `El documento tiene ${huecos.length} ${huecos.length === 1 ? 'dato' : 'datos'} por completar entre corchetes (número, fecha, firmante…).`,
    });
  return h;
}

export async function auditoriaDeCoherencia(
  texto: string,
  a: AnalisisDeActuacion,
  usuario: string | null,
): Promise<HallazgoDeAuditoria[]> {
  try {
    const r = await pedirJSON<{ hallazgos?: Array<{ gravedad?: string; texto?: string }> }>(
      `Eres el auditor de calidad de documentos administrativos de A-LexIA. Revisa la COHERENCIA del documento. No corrijas el estilo.

DIAGNÓSTICO DEL CASO: figura «${a.figura.nombre}» (${a.figura.corresponde ? 'corresponde' : 'NO corresponde'}); procedencia: ${TEXTO_PROCEDENCIA[a.procedencia.semaforo]}; competencia: ${a.competencia.organo}.

DOCUMENTO:
"""
${texto.slice(0, 60_000)}
"""

Revisa solo:
1. Que las conclusiones se sigan del análisis y las recomendaciones de las conclusiones.
2. Que la parte resolutiva (si la hay) se siga de los considerandos.
3. Que los antecedentes no contradigan el análisis (fechas, montos, hechos distintos para lo mismo).
4. Que el documento no apruebe lo que el diagnóstico dice que no procede o que no corresponde, ni afirme como acreditado lo que el diagnóstico da por no acreditado.
5. Que los nombres, cargos y números se usen de forma consistente de principio a fin.

Devuelve SOLO JSON: {"hallazgos": [ {"gravedad": "error" | "advertencia", "texto": "la inconsistencia concreta, citando el pasaje"} ]}. "error" solo si el documento se contradice o contradice el diagnóstico; si no hay nada, {"hallazgos": []}.`,
      { usuario, funcion: 'ejecucion_auditoria' },
    );
    return (r.hallazgos ?? [])
      .filter((x) => x.texto?.trim())
      .map((x) => ({ tipo: 'coherencia' as const, gravedad: x.gravedad === 'error' ? ('error' as const) : ('advertencia' as const), texto: x.texto!.trim() }));
  } catch (e) {
    return [{ tipo: 'coherencia', gravedad: 'advertencia', texto: `No se pudo revisar la coherencia con el modelo (${(e as Error).message}): revísala a mano.` }];
  }
}

export async function auditarDocumento(
  e: EntradaAuditoria & { version: number; usuario: string | null },
): Promise<AuditoriaDelDocumento> {
  const [det, coh] = await Promise.all([auditoriaDeterminista(e), auditoriaDeCoherencia(e.texto, e.analisis, e.usuario)]);
  const hallazgos = [...det, ...coh].sort((x, y) => (x.gravedad === y.gravedad ? 0 : x.gravedad === 'error' ? -1 : 1));
  return {
    generadoEn: new Date().toISOString(),
    version: e.version,
    hallazgos,
    bloquea: hallazgos.some((x) => x.gravedad === 'error'),
  };
}
