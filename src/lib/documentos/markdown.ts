/**
 * Las piezas de un documento, en Markdown.
 *
 * Para la copia que se guarda con la evaluación y para leerlo en una
 * prueba sin abrir un Word. Sale de las mismas piezas que el Word, así
 * que no puede decir otra cosa: antes el acta se escribía directamente en
 * Markdown y el Word se reconstruía de ahí, y lo que el Markdown no sabía
 * expresar —una celda que ocupa dos columnas, el cuadro de firmas— no
 * llegaba.
 */
import type { CeldaCuadro, Pieza } from './piezas';

const celda = (v: string) => (v.trim() || ' ').replace(/\|/g, '\\|').replace(/\n+/g, ' · ');

function tablaMd(cabecera: string[], filas: string[][]): string {
  return [
    `| ${cabecera.map(celda).join(' | ')} |`,
    `| ${cabecera.map(() => '---').join(' | ')} |`,
    ...filas.map((f) => `| ${cabecera.map((_c, j) => celda(f[j] ?? '')).join(' | ')} |`),
  ].join('\n');
}

/** Una fila de un cuadro, con cada celda repetida en las columnas que ocupa. */
function filaPlana(fila: CeldaCuadro[], columnas: number): string[] {
  const salida: string[] = [];
  for (const c of fila) {
    salida.push(c.texto);
    for (let i = 1; i < (c.columnas ?? 1); i++) salida.push('');
  }
  while (salida.length < columnas) salida.push('');
  return salida.slice(0, columnas);
}

export function piezasAMarkdown(piezas: Pieza[]): string {
  const partes: string[] = [];
  for (const p of piezas) {
    switch (p.clase) {
      case 'titulo':
        if (p.rol === 'encabezado') partes.push(`# ${p.texto}`);
        else if (p.rol === 'subtitulo') partes.push(`## ${p.texto}`);
        else partes.push(`${'#'.repeat(Math.min(p.nivel + 2, 6))} ${p.numero ? `${p.numero} ` : ''}${p.texto}`);
        break;
      case 'parrafo':
        partes.push(p.texto);
        break;
      case 'campo':
        partes.push(`**${p.etiqueta.replace(/:$/, '')}:** ${p.pendiente ? `**[PENDIENTE: ${p.etiqueta}]**` : p.valor}`);
        break;
      case 'pendiente':
        partes.push(`**[PENDIENTE: ${p.etiqueta}]**`);
        break;
      case 'nota':
        partes.push(`> *${p.texto}*`);
        break;
      case 'lista':
        partes.push(
          [
            ...(p.encabezado ? [p.encabezado, ''] : []),
            ...p.elementos.map((e, i) =>
              p.marca === 'numero' ? `${i + 1}. ${e}` : p.marca === 'literal' ? `${String.fromCharCode(97 + (i % 26))}) ${e}` : `- ${e}`,
            ),
          ].join('\n'),
        );
        break;
      case 'tabla':
        if (p.titulo) partes.push(`**${p.titulo}**`);
        partes.push(tablaMd(p.columnas, p.filas.length > 0 ? p.filas : [p.columnas.map(() => '')]));
        break;
      case 'cuadro': {
        const columnas = p.proporciones.length;
        const [primera, ...resto] = p.filas.map((f) => filaPlana(f, columnas));
        if (primera) partes.push(tablaMd(primera, resto));
        break;
      }
      case 'datos':
        partes.push(tablaMd(['Dato', 'Valor'], p.filas.map((f) => [f.etiqueta, f.pendiente ? '[PENDIENTE]' : f.valor])));
        break;
      case 'firmas': {
        const gente = p.personas.length > 0 ? p.personas : [{}, {}, {}];
        partes.push(
          tablaMd(
            gente.map(() => 'Firma'),
            [gente.map((x) => x.nombre || 'Nombres y apellidos'), gente.map((x) => x.cargo || 'Cargo')],
          ),
        );
        break;
      }
      case 'seccion':
        partes.push('---');
        break;
      case 'firma':
        partes.push(['___________________________', `**${p.nombre}**`, p.cargo ?? '', p.entidad ? `**${p.entidad}**` : ''].filter(Boolean).join('\n'));
        break;
    }
  }
  return partes.join('\n\n').trim() + '\n';
}
