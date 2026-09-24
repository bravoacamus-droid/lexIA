/**
 * El informe de la evaluación de bases, en Word.
 *
 * Dos lectores con dos preguntas: el proveedor quiere saber qué consultar
 * u observar; quien elabora o revisa las bases, qué corregir antes de
 * publicarlas. El informe es el mismo; cambia la última columna.
 */
import type { CeldaCuadro, Pieza } from '@/lib/documentos/piezas';
import { FORMATO_DOCUMENTO, piezasADocx } from '@/lib/documentos/word';
import { aRomano } from '@/lib/documentos/numeracion';
import { TEXTO_TIPO, type HallazgoBases, type ResultadoBases } from './tipos';

export type Destinatario = 'proveedor' | 'entidad';

const SEVERIDAD: Record<string, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };

const celda = (texto: string, extra: Partial<CeldaCuadro> = {}): CeldaCuadro => ({ texto, ...extra });

function propuesta(h: HallazgoBases, para: Destinatario): string {
  if (para === 'entidad') return h.paraLaEntidad;
  const tipo = h.paraElProveedor.tipo === 'consulta' ? 'Consulta' : 'Observación';
  return `**${tipo}.** ${h.paraElProveedor.solicitud}`;
}

function cuadro(hallazgos: HallazgoBases[], para: Destinatario, desde: number): Pieza {
  return {
    clase: 'cuadro',
    proporciones: [4, 14, 22, 32, 28],
    partible: true,
    repetirCabecera: true,
    filas: [
      [
        celda('N.°', { gris: true }),
        celda('Ubicación', { gris: true }),
        celda('Dicen las bases', { gris: true }),
        celda('Observación', { gris: true }),
        celda(para === 'entidad' ? 'Qué corregir antes de publicar' : 'Qué consultar u observar', { gris: true }),
      ],
      ...hallazgos.map((h, i) => [
        celda(String(desde + i)),
        celda(`${h.capitulo}${h.numeral ? `, numeral ${h.numeral}` : ''}\n${TEXTO_TIPO[h.tipo]} · ${SEVERIDAD[h.severidad]}`),
        celda(h.enLasBases || '(no figura en las bases)'),
        celda(
          `**${h.titulo}.** ${h.analisis}${h.enElEstandar ? ` El estándar dice: «${h.enElEstandar.slice(0, 500)}${h.enElEstandar.length > 500 ? '…' : ''}».` : ''}${h.norma ? ` (${h.norma})` : ''}${h.avisos.length ? ` Cita por verificar: ${h.avisos.map((a) => a.cita).join('; ')}.` : ''}`,
        ),
        celda(propuesta(h, para)),
      ]),
    ],
  };
}

export function piezasDelInforme(d: {
  titulo: string;
  documento: string;
  resultado: ResultadoBases;
  para: Destinatario;
}): Pieza[] {
  const r = d.resultado;
  const fecha = new Date(r.generadoEn).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const general = r.hallazgos.filter((h) => h.seccion === 'General');
  const especifica = r.hallazgos.filter((h) => h.seccion === 'Específica');
  const piezas: Pieza[] = [
    { clase: 'seccion', orientacion: 'horizontal' },
    { clase: 'titulo', rol: 'encabezado', nivel: 0, texto: 'INFORME DE EVALUACIÓN DE BASES' },
    { clase: 'titulo', rol: 'subtitulo', nivel: 0, texto: d.titulo },
    {
      clase: 'datos',
      filas: [
        { etiqueta: 'Documento evaluado', valor: d.documento },
        { etiqueta: 'Bases estándar de referencia', valor: r.estandar.titulo },
        { etiqueta: 'Fecha', valor: fecha },
        {
          etiqueta: 'Resultado',
          valor: `${r.hallazgos.length} ${r.hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'}: ${general.length} en la Sección General y ${especifica.length} en la Sección Específica.`,
        },
      ],
    },
    { clase: 'parrafo', texto: r.resumen },
  ];

  let n = 0;
  const titulo = (texto: string) => {
    n += 1;
    piezas.push({ clase: 'titulo', nivel: 1, numero: `${aRomano(n)}.`, texto });
  };

  titulo('SECCIÓN GENERAL');
  piezas.push({
    clase: 'parrafo',
    texto: general.length
      ? `Las bases estándar disponen que la Sección General «no debe ser modificada en ningún extremo, bajo sanción de nulidad». Se cotejaron ${r.seccionGeneral.textos} textos con la bases estándar de ${r.estandar.titulo}; los siguientes difieren:`
      : `Las bases estándar disponen que la Sección General «no debe ser modificada en ningún extremo, bajo sanción de nulidad». Se cotejaron ${r.seccionGeneral.textos} textos con la bases estándar de ${r.estandar.titulo} y coinciden todos.`,
  });
  if (general.length) piezas.push(cuadro(general, d.para, 1));

  titulo('SECCIÓN ESPECÍFICA');
  piezas.push({
    clase: 'parrafo',
    texto: especifica.length
      ? `Se revisaron los capítulos ${r.capitulosRevisados.map((c) => c.split(' — ')[0].replace('CAPÍTULO ', '')).join(', ')} contra los mismos capítulos de la bases estándar y sus instrucciones:`
      : 'Se revisaron los capítulos de la sección específica contra la bases estándar y no se encontraron hallazgos.',
  });
  if (especifica.length) piezas.push(cuadro(especifica, d.para, general.length + 1));

  piezas.push({
    clase: 'parrafo',
    texto:
      'Las observaciones se sustentan en las bases estándar aprobadas por el OECE para el procedimiento y en la normativa citada en cada una. Deben revisarse antes de formularlas o de corregir las bases.',
  });
  return piezas;
}

export async function informeADocx(d: Parameters<typeof piezasDelInforme>[0]): Promise<Buffer> {
  return piezasADocx(piezasDelInforme(d), FORMATO_DOCUMENTO);
}
