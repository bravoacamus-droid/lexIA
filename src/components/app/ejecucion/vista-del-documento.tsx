'use client';

import { Fragment } from 'react';
import type { Pieza } from '@/lib/documentos/piezas';
import { cn } from '@/lib/utils';

/**
 * La vista previa del documento, de las mismas piezas que el Word: lo
 * que se ve en pantalla es lo que se descarga —el rótulo PARA / ASUNTO /
 * REFERENCIA, la raya, los «1.1», los subtítulos, las citas y los
 * cuadros—.
 */
export function VistaDelDocumento({ piezas }: { piezas: Pieza[] }) {
  return (
    <>
      {piezas.map((p, i) => (
        <Fragment key={i}>{pieza(p)}</Fragment>
      ))}
    </>
  );
}

function pieza(p: Pieza) {
  switch (p.clase) {
    case 'titulo':
      if (p.rol) return <p className="text-center text-[13.5px] font-bold">{<Texto t={p.texto} />}</p>;
      return (
        <p className={cn('mt-4 flex gap-2 font-bold', p.numero ? '' : 'pl-7')}>
          {p.numero && <span className="w-7 shrink-0">{p.numero}</span>}
          <span className={p.subrayado ? 'underline' : undefined}>
            <Texto t={p.texto} />
          </span>
        </p>
      );
    case 'parrafo':
      if (p.cita)
        return (
          <p className="mx-10 mt-2 text-justify font-serif italic">
            <Texto t={p.texto} />
          </p>
        );
      if (p.numero)
        return (
          <p className="mt-2 flex gap-2 text-justify">
            <span className="w-7 shrink-0">{p.numero}</span>
            <span>
              <Texto t={p.texto} />
            </span>
          </p>
        );
      return (
        <p
          className={cn(
            p.pegado ? 'mt-0' : 'mt-2',
            p.alineacion === 'derecha' ? 'text-right' : p.alineacion === 'centro' ? 'text-center' : p.alineacion === 'izquierda' ? 'text-left' : 'text-justify',
            p.sangriaPrimera && 'indent-10',
          )}
        >
          <Texto t={p.texto} />
        </p>
      );
    case 'rotulo':
      return (
        <div className="mt-1 grid grid-cols-[110px_12px_minmax(0,1fr)]">
          <span className="font-bold">{p.etiqueta.toUpperCase()}</span>
          <span>:</span>
          <span>
            {p.lineas.map((l, j) => (
              <span key={j} className="block">
                <Texto t={l} />
              </span>
            ))}
          </span>
        </div>
      );
    case 'raya':
      return <hr className="my-3 border-foreground/60" />;
    case 'campo':
      return (
        <p className="mt-1">
          <strong>{p.etiqueta.replace(/:$/, '')}:</strong> <Texto t={p.valor} />
        </p>
      );
    case 'nota':
      return (
        <p className="mt-2 text-red-600 dark:text-red-400">
          <Texto t={p.texto.startsWith('[') ? p.texto : `[${p.texto}]`} />
        </p>
      );
    case 'lista':
      return (
        <ul className="mt-1 space-y-0.5 pl-10">
          {p.encabezado && <li className="-ml-3 list-none">{p.encabezado}</li>}
          {p.elementos.map((e, j) => (
            <li key={j} className="flex gap-2">
              <span className="shrink-0">{p.marca === 'literal' ? `${String.fromCharCode(97 + (j % 26))})` : p.marca === 'numero' ? `${j + 1}.` : '-'}</span>
              <span className="text-justify">
                <Texto t={e} />
              </span>
            </li>
          ))}
        </ul>
      );
    case 'tabla':
      return (
        <div className="my-2 overflow-x-auto pl-9">
          {p.titulo && <p className="font-bold">{p.titulo}</p>}
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                {p.columnas.map((c, j) => (
                  <th key={j} className="border border-slate-400 bg-[#0E2841] px-2 py-1 text-center font-bold text-white">
                    <Texto t={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.filas.map((f, j) => (
                <tr key={j}>
                  {p.columnas.map((_c, k) => (
                    <td key={k} className="border border-slate-400 px-2 py-1 align-top">
                      <Texto t={f[k] ?? ''} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'firma':
      return (
        <div className={cn('mt-10', p.alineacion === 'izquierda' ? 'text-left' : 'text-center')}>
          <p>___________________________</p>
          <p className="font-bold">
            <Texto t={p.nombre} />
          </p>
          {p.cargo && (
            <p>
              <Texto t={p.cargo} />
            </p>
          )}
          {p.entidad && (
            <p className="font-bold">
              <Texto t={p.entidad} />
            </p>
          )}
        </div>
      );
    case 'firmas':
      return (
        <div className="mt-10 grid grid-cols-2 gap-6 text-center">
          {p.personas.map((x, j) => (
            <div key={j}>
              <p>___________________________</p>
              <p className="font-bold">
                <Texto t={x.cargo ?? ''} />
              </p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

/** Un texto del documento, con **negritas**, *cursivas* y los huecos en rojo. */
function Texto({ t }: { t: string }) {
  // Las mismas marcas que el Word: «***…***», «**… *…* …**», «*…*».
  const trozos = t.split(/(\*\*\*[^*]+\*\*\*|\*\*(?:[^*]|\*[^*\s][^*]*\*)+?\*\*|\*[^*\s\n][^*\n]*\*|\[[^\]\n]{1,200}\])/g);
  return (
    <>
      {trozos.map((x, i) =>
        x.startsWith('***') && x.endsWith('***') && x.length > 6 ? (
          <strong key={i}>
            <em>{x.slice(3, -3)}</em>
          </strong>
        ) : x.startsWith('**') && x.endsWith('**') && x.length > 4 ? (
          <strong key={i}>
            {x
              .slice(2, -2)
              .split(/(\*[^*]+\*)/)
              .map((y, j) => (/^\*[^*]+\*$/.test(y) ? <em key={j}>{y.slice(1, -1)}</em> : <Fragment key={j}>{y}</Fragment>))}
          </strong>
        ) : x.startsWith('*') && x.endsWith('*') && x.length > 2 ? (
          <em key={i}>{x.slice(1, -1)}</em>
        ) : x.startsWith('[') && x.endsWith(']') && !/^\[[\d\s,;.-]*\]$/.test(x) ? (
          <span key={i} className="rounded bg-red-50 px-0.5 font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {x}
          </span>
        ) : (
          <span key={i}>{x}</span>
        ),
      )}
    </>
  );
}
