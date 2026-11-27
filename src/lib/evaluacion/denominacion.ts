import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';

/**
 * La denominación de la contratación, leída del documento que se sube.
 *
 * Reunión con César, 27/11/2026: «ya no debería poner el nombre, me
 * debería detectar ya de este título». Todo requerimiento y todas las
 * bases llevan una denominación («Servicio de mantenimiento preventivo y
 * correctivo de grupo electrógeno…», «Adquisición de mesas y sillas para
 * la oficina…»). Primero se busca el rótulo «Denominación de la
 * contratación» en el texto; si no está, el modelo rápido la lee de las
 * primeras páginas. El usuario la puede corregir.
 */

const ROTULO =
  /denominaci[óo]n\s+de\s+la\s+contrataci[óo]n\s*[:：\-–]?\s*([\s\S]{8,400}?)(?:\n\s*\n|\n\s*(?:\d+(?:\.\d+)*\.?|[IVX]+\.)\s+[A-ZÁÉÍÓÚÑ]|$)/i;

/** Limpia saltos, comillas y el punto final. */
function limpiar(t: string): string {
  return t
    .replace(/\s+/g, ' ')
    .replace(/^["“«]+|["”»]+$/g, '')
    .replace(/[.;,]\s*$/, '')
    .trim()
    .slice(0, 300);
}

export function denominacionPorRotulo(texto: string): string | null {
  const m = ROTULO.exec(texto.slice(0, 20_000));
  if (!m) return null;
  const d = limpiar(m[1]);
  return d.length >= 8 ? d : null;
}

export async function leerDenominacion(texto: string): Promise<{ denominacion: string | null; via: 'rotulo' | 'modelo' | null }> {
  const porRotulo = denominacionPorRotulo(texto);
  if (porRotulo) return { denominacion: porRotulo, via: 'rotulo' };
  const inicio = texto.slice(0, 8_000).trim();
  if (inicio.length < 40) return { denominacion: null, via: null };
  try {
    const { text } = await generateText({
      model: fastModel,
      system:
        'Lees el inicio de un requerimiento (términos de referencia o especificaciones técnicas) o de unas bases de una contratación pública peruana. Devuelve SOLO JSON {"denominacion": "..."} con la denominación de la contratación copiada LITERAL del documento: el título que dice qué se contrata (p. ej., "Servicio de mantenimiento preventivo y correctivo de grupo electrógeno de la sede central"). Sin número de procedimiento ni nombre de la entidad si no forman parte del título. Si no aparece, {"denominacion": ""}.',
      prompt: inicio,
      temperature: 0,
      maxTokens: 300,
    });
    const d = limpiar(parseJsonLoose<{ denominacion?: string }>(text).denominacion ?? '');
    return d.length >= 8 ? { denominacion: d, via: 'modelo' } : { denominacion: null, via: null };
  } catch {
    return { denominacion: null, via: null };
  }
}
