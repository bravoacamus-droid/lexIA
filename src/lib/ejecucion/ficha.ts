/**
 * La ficha maestra del contrato (fase 2, «Reconstrucción»).
 *
 * Se arma con lo que leyó cada documento y no se le vuelve a preguntar
 * al usuario lo que ya está ahí (sección 10). Si dos documentos dicen
 * cosas distintas del mismo dato, eso es una contradicción y se enseña:
 * no se elige una en silencio.
 *
 * Lo que el usuario corrige o declara se guarda aparte, en
 * `expedientes.ficha`, y manda sobre lo leído: pero queda marcado como
 * declaración, no como dato acreditado.
 */
import type { ClaseDocumental } from './catalogo';
import { aNumero } from './calculos';
import { fechaISO } from './regimen';
import { LISTA_CAMPOS, type CampoFicha, type Contradiccion, type DocumentoDelExpediente, type Ficha } from './tipos';

/** De qué documento se fía más cada dato. */
const PRIORIDAD: ClaseDocumental[] = ['contrato', 'orden', 'adenda', 'bases', 'resolucion', 'informe_dec', 'informe_area_usuaria'];

/** Los datos que cambian legítimamente con el tiempo: la adenda manda. */
const CAMBIAN: CampoFicha[] = ['monto_vigente', 'fecha_fin', 'plazo_dias'];

/** Los que no pueden diferir entre documentos sin que sea un problema. */
const FIJOS: CampoFicha[] = ['numero_contrato', 'ruc_contratista', 'monto_original', 'fecha_suscripcion', 'fecha_convocatoria'];

/** El número de un contrato sin su rótulo: «Contrato de Ejecución de Obra N.° 010-2025» → «010-2025». */
export function soloElNumero(v: string): string {
  return v
    .replace(/^\s*contrato\b.*?\b(?:N\s*\.?\s*[°º]|Nro\.?|No\.?(?=\s*\d)|N[úu]mero)\s*/i, '')
    .replace(/^\s*contrato\s+/i, '')
    .trim();
}

function rango(clase: ClaseDocumental | null): number {
  const i = clase ? PRIORIDAD.indexOf(clase) : -1;
  return i < 0 ? PRIORIDAD.length : i;
}

function clave(campo: CampoFicha, valor: string): string {
  if (campo === 'monto_original' || campo === 'monto_vigente') {
    const n = aNumero(valor);
    return n === null ? valor : n.toFixed(2);
  }
  if (campo.startsWith('fecha')) return fechaISO(valor) ?? valor.trim();
  if (campo === 'plazo_dias') return String(aNumero(valor) ?? valor);
  if (campo === 'ruc_contratista') return valor.replace(/\D/g, '');
  // «Contrato N.° 015-2026-MDVE/GAF» y «015-2026-MDVE/GAF» son el mismo.
  if (campo === 'numero_contrato') valor = soloElNumero(valor);
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function reconstruirFicha(
  documentos: DocumentoDelExpediente[],
  delUsuario: Ficha,
): { ficha: Ficha; contradicciones: Contradiccion[] } {
  const ficha: Ficha = {};
  const contradicciones: Contradiccion[] = [];
  // Solo lo que se cargó y se leyó; lo que generó LexIA no es fuente.
  const leidos = documentos
    .filter((d) => d.origen === 'cargado' && d.lectura === 'leido')
    .sort((a, b) => rango(a.clase) - rango(b.clase));

  for (const campo of LISTA_CAMPOS) {
    const valores: Array<{ valor: string; documento: string; documentoId: string; cita?: string; clase: ClaseDocumental | null; fecha: string }> = [];
    for (const d of leidos) {
      for (const f of d.datos.ficha ?? []) {
        if (f.campo !== campo || !f.valor?.trim()) continue;
        valores.push({ valor: f.valor.trim(), documento: d.nombre, documentoId: d.id, cita: f.cita, clase: d.clase, fecha: d.datos.fecha ?? d.created_at });
      }
    }
    if (valores.length === 0) continue;

    let elegido = valores[0];
    if (CAMBIAN.includes(campo)) {
      // Lo último que se modificó: la adenda o la resolución más reciente.
      const modificaciones = valores.filter((v) => v.clase === 'adenda' || v.clase === 'resolucion');
      if (modificaciones.length) elegido = modificaciones.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
    }
    ficha[campo] = { valor: elegido.valor, documento: elegido.documento, documentoId: elegido.documentoId, cita: elegido.cita };

    if (FIJOS.includes(campo)) {
      const distintos = new Map<string, (typeof valores)[number]>();
      for (const v of valores) if (!distintos.has(clave(campo, v.valor))) distintos.set(clave(campo, v.valor), v);
      if (distintos.size > 1) {
        const lista = [...distintos.values()];
        contradicciones.push({
          campo,
          descripcion: `Los documentos no coinciden en ${nombreDe(campo)}: ${lista.map((v) => `«${v.valor}» (${v.documento})`).join(' frente a ')}.`,
          valores: lista.map((v) => ({ valor: v.valor, documento: v.documento, cita: v.cita })),
        });
      }
    }
  }

  for (const campo of LISTA_CAMPOS) {
    const u = delUsuario[campo];
    if (u?.valor?.trim()) ficha[campo] = { valor: u.valor.trim(), delUsuario: true };
  }
  return { ficha, contradicciones };
}

function nombreDe(campo: CampoFicha): string {
  const nombres: Partial<Record<CampoFicha, string>> = {
    numero_contrato: 'el número de contrato',
    ruc_contratista: 'el RUC del contratista',
    monto_original: 'el monto del contrato original',
    fecha_suscripcion: 'la fecha de suscripción',
    fecha_convocatoria: 'la fecha de convocatoria',
  };
  return nombres[campo] ?? campo;
}
