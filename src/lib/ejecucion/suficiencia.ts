/**
 * Qué hay y qué falta, y cuánto pesa lo que falta (secciones 2, 11 y 12).
 *
 * La suficiencia se calcula sobre los requisitos que aplican al caso, no
 * sobre cuántos archivos se subieron: veinte documentos irrelevantes no
 * suben la cifra; cinco decisivos la llevan arriba. Cada requisito pesa
 * según su nivel y según esté acreditado, solo declarado o ausente, y un
 * requisito indispensable que falta pone techo a la cifra: sin él no
 * hay análisis confiable, por muchos complementarios que haya.
 */
import type { Contexto, ReglaRequisito } from './matriz';
import { nivelDe } from './matriz';
import type {
  DocumentoDelExpediente,
  Ficha,
  NivelDeSalida,
  RequisitoEvaluado,
  SemaforoInformacion,
  SemaforoProcedencia,
} from './tipos';

const PESO = { 1: 3, 2: 2, 3: 1 } as const;
const VALOR = { acreditado: 1, declarado: 0.35, falta: 0, no_aplica: 0 } as const;

export interface EvaluacionDeHecho {
  estado: 'acreditado' | 'declarado' | 'falta';
  documento?: string;
  declaracion?: string;
}

export function evaluarRequisitos(
  reglas: ReglaRequisito[],
  c: Contexto,
  documentos: DocumentoDelExpediente[],
  ficha: Ficha,
  porHecho: Record<string, EvaluacionDeHecho>,
): RequisitoEvaluado[] {
  const cargados = documentos.filter((d) => d.origen === 'cargado' && d.lectura === 'leido');
  const borradores = documentos.filter((d) => d.origen === 'lexia');
  return reglas.map((r) => {
    const base: RequisitoEvaluado = {
      id: r.id,
      texto: r.texto,
      nivel: nivelDe(r, c),
      estado: 'falta',
      porQue: r.porQue,
      base: c.regimen === 'ley_30225' ? undefined : r.base,
    };
    if (r.acreditaCon.length) {
      const doc = cargados.find(
        (d) => (d.clase && r.acreditaCon.includes(d.clase)) || (d.datos.contiene ?? []).some((x) => r.acreditaCon.includes(x)),
      );
      if (doc) return { ...base, estado: 'acreditado', documento: doc.nombre };
      const borrador = borradores.find((d) => d.clase && r.acreditaCon.includes(d.clase));
      if (borrador) {
        base.declaracion = `Existe el borrador de LexIA «${borrador.nombre}», que permanece como referencia de trabajo: para usarlo como antecedente formal, adjunta la versión oficialmente emitida, con número, fecha, firmante y fecha de presentación.`;
      }
    }
    if (r.bastanLosDatos?.length) {
      const datos = r.bastanLosDatos.map((k) => ficha[k]);
      if (datos.every(Boolean)) {
        const todosLeidos = datos.every((d) => !d!.delUsuario);
        const fuentes = [...new Set(datos.map((d) => d!.documento).filter(Boolean))];
        return {
          ...base,
          estado: todosLeidos ? 'acreditado' : 'declarado',
          documento: todosLeidos ? `Datos identificados en ${fuentes.join(', ')}` : undefined,
          declaracion: todosLeidos ? undefined : 'Datos declarados o corregidos por el usuario.',
        };
      }
    }
    if (r.porHecho) {
      const h = porHecho[r.id];
      if (h) return { ...base, estado: h.estado, documento: h.documento, declaracion: h.declaracion ?? base.declaracion };
    }
    return base;
  });
}

export interface Suficiencia {
  porcentaje: number;
  semaforo: SemaforoInformacion;
  niveles: NivelDeSalida[];
  mensaje: string;
  faltantes: Array<{ texto: string; nivel: 1 | 2 | 3; porQue: string }>;
}

export function calcularSuficiencia(reqs: RequisitoEvaluado[], procedencia: SemaforoProcedencia): Suficiencia {
  const aplican = reqs.filter((r) => r.estado !== 'no_aplica');
  // Lo complementario «puede mejorar el documento, pero no debe bloquear»
  // (sección 2): no entra en la cifra, solo en el semáforo de información.
  // Si todo lo aplicable es complementario, entonces sí cuenta.
  const cuentan = aplican.some((r) => r.nivel < 3) ? aplican.filter((r) => r.nivel < 3) : aplican;
  const total = cuentan.reduce((s, r) => s + PESO[r.nivel], 0);
  const logrado = cuentan.reduce((s, r) => s + PESO[r.nivel] * VALOR[r.estado], 0);
  let pct = total ? Math.round((logrado / total) * 100) : 0;

  const falta = (n: 1 | 2 | 3) => aplican.some((r) => r.nivel === n && r.estado === 'falta');
  const declarado = (n: 1 | 2 | 3) => aplican.some((r) => r.nivel === n && r.estado === 'declarado');

  if (falta(1)) pct = Math.min(pct, 39);
  else if (declarado(1)) pct = Math.min(pct, 69);
  else if (falta(2)) pct = Math.min(pct, 89);

  const semaforo: SemaforoInformacion = falta(1)
    ? 'rojo'
    : falta(2) || declarado(1)
      ? 'naranja'
      : falta(3) || declarado(2)
        ? 'amarillo'
        : 'verde';

  const niveles: NivelDeSalida[] = ['diagnostico'];
  if (pct >= 40) niveles.push('borrador_condicionado');
  if (pct >= 90 && procedencia !== 'rojo' && procedencia !== 'negro') niveles.push('revision_final');

  const faltantes = aplican
    .filter((r) => r.estado !== 'acreditado')
    .sort((a, b) => a.nivel - b.nivel)
    .map((r) => ({
      texto: r.estado === 'declarado' ? `${r.texto} (declarado, no acreditado)` : r.texto,
      nivel: r.nivel,
      porQue: r.porQue,
    }));

  const pendientes = faltantes.filter((f) => f.nivel < 3).map((f) => f.texto.charAt(0).toLowerCase() + f.texto.slice(1));
  let mensaje: string;
  if (pct < 40) {
    mensaje = `Con la documentación actual el expediente es insuficiente para un análisis confiable: falta información indispensable. Aun así, puedo darte un diagnóstico preliminar que deje visibles sus limitaciones. Lo indispensable es: ${lista(faltantes.filter((f) => f.nivel === 1).map((f) => f.texto.charAt(0).toLowerCase() + f.texto.slice(1)))}.`;
  } else if (pct < 70) {
    mensaje = `Con la documentación actual puedo realizar un diagnóstico preliminar. Para emitir una conclusión definitiva, falta únicamente acreditar: ${lista(pendientes)}.`;
  } else if (pct < 90) {
    mensaje = `El expediente permite un análisis técnico o administrativo. Puedes generar un borrador condicionado, pero no se recomienda usarlo como sustento definitivo hasta incorporar: ${lista(pendientes)}.`;
  } else {
    mensaje = 'Los requisitos esenciales están acreditados: puedo generar el documento para revisión final, sujeto a validación humana.';
  }
  return { porcentaje: pct, semaforo, niveles, mensaje, faltantes };
}

function lista(xs: string[]): string {
  if (xs.length === 0) return 'nada esencial';
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join('; ')} y ${xs[xs.length - 1]}`;
}

/** El peor de los dos semáforos de procedencia. */
const GRAVEDAD: SemaforoProcedencia[] = ['verde', 'amarillo', 'naranja', 'rojo', 'negro'];
export function peor(a: SemaforoProcedencia, b: SemaforoProcedencia): SemaforoProcedencia {
  return GRAVEDAD.indexOf(a) >= GRAVEDAD.indexOf(b) ? a : b;
}

export const TEXTO_PROCEDENCIA: Record<SemaforoProcedencia, string> = {
  verde: 'Procedente',
  amarillo: 'Procedente con subsanaciones',
  naranja: 'Riesgo técnico o jurídico relevante',
  rojo: 'No procedente',
  negro: 'La figura solicitada no corresponde',
};

export const TEXTO_INFORMACION: Record<SemaforoInformacion, string> = {
  verde: 'Información suficiente',
  amarillo: 'Falta información no determinante',
  naranja: 'Falta evidencia relevante',
  rojo: 'Falta información indispensable',
};

export const TEXTO_NIVEL: Record<NivelDeSalida, string> = {
  diagnostico: 'Diagnóstico preliminar',
  borrador_condicionado: 'Borrador condicionado',
  revision_final: 'Documento listo para revisión final',
};
