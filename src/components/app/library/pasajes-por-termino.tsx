'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TAG_COLORS } from '@/components/app/library/tag-search-input';

export interface PasajeDeTermino {
  termino: number;
  texto: string;
  chunkIndex: number;
}

/**
 * Los pasajes de un documento donde aparece cada palabra buscada.
 *
 * César (27/09/2026) mostró cómo lo espera: bajo el título, cada palabra
 * con los pasajes en que aparece y la palabra resaltada. Se agrupan por
 * término, en el orden de los chips y con su mismo color, para que se
 * vea de un vistazo que el documento las tiene todas. Cada pasaje abre
 * el documento en ese punto.
 */
export function PasajesPorTermino({
  pasajes,
  terminos,
  hrefDocumento,
  visibles = 2,
}: {
  pasajes: PasajeDeTermino[];
  terminos: string[];
  /** Arma el enlace al visor con el texto que debe resaltar. */
  hrefDocumento: (resaltar: string) => string;
  /** Pasajes por término antes de «ver más». */
  visibles?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const grupos = terminos
    .map((t, i) => ({ termino: t, indice: i, lista: pasajes.filter((p) => p.termino === i) }))
    .filter((g) => g.lista.length > 0);
  if (grupos.length === 0) return null;
  const ocultos = grupos.reduce((n, g) => n + Math.max(0, g.lista.length - visibles), 0);

  return (
    <div className="mt-3 space-y-2.5">
      {grupos.map((g) => (
        <div key={g.indice}>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              TAG_COLORS[g.indice % TAG_COLORS.length],
            )}
          >
            {g.termino}
          </span>
          <ul className="mt-1.5 space-y-1.5">
            {(abierto ? g.lista : g.lista.slice(0, visibles)).map((p, k) => (
              <li key={`${p.chunkIndex}-${k}`}>
                <Link
                  href={hrefDocumento(textoParaResaltar(p.texto))}
                  className="block rounded-lg border-l-2 border-border bg-secondary/40 py-1.5 pl-3 pr-2 text-[13.5px] italic leading-relaxed text-foreground/85 transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30"
                >
                  «… <Marcado texto={p.texto} termino={g.termino} color={TAG_COLORS[g.indice % TAG_COLORS.length]} /> …»
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {ocultos > 0 && (
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          className="text-[12px] font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          {abierto ? 'Ver menos pasajes' : `Ver ${ocultos} ${ocultos === 1 ? 'pasaje más' : 'pasajes más'}`}
        </button>
      )}
    </div>
  );
}

const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'a', 'en', 'por', 'con', 'para', 'al', 'o', 'u', 'e']);
const palabras = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w && !VACIAS.has(w));

/**
 * Pinta las ⟦marcas⟧ que pone la base.
 *
 * «⟦Anexo⟧ ⟦N⟧° ⟦3⟧» se une en una sola marca, y también «⟦plazo⟧ de
 * ⟦pago⟧»: la frase se resalta entera. La base resalta además cada
 * palabra de la frase donde aparezca suelta —una «N» de «Resolución N°»
 * en el mismo pasaje—; esas no son la frase buscada y no se pintan.
 */
function Marcado({ texto, termino, color }: { texto: string; termino: string; color: string }) {
  const unido = texto.replace(/⟧(\s*[°º.,\-]?\s*(?:[\p{L}]{1,3}\s+)?)⟦/gu, '$1');
  const minimo = palabras(termino).length;
  const partes = unido.split(/(⟦[^⟧]*⟧)/g).filter(Boolean);
  return (
    <>
      {partes.map((parte, i) => {
        if (!parte.startsWith('⟦')) return <span key={i}>{parte}</span>;
        const dentro = parte.slice(1, -1);
        if (palabras(dentro).length < minimo) return <span key={i}>{dentro}</span>;
        return (
          <mark key={i} className={cn('rounded px-0.5 not-italic font-medium', color)}>
            {dentro}
          </mark>
        );
      })}
    </>
  );
}

/**
 * El trozo que el visor busca para llevar al pasaje. El visor compara los
 * primeros 60 caracteres contra los párrafos del documento; un pasaje de
 * ts_headline puede empezar a media frase y cruzar dos párrafos, así que
 * se toma desde la palabra resaltada y solo el primer trozo.
 */
function textoParaResaltar(texto: string): string {
  const primero = texto.split(' … ')[0];
  const inicio = Math.max(0, primero.indexOf('⟦'));
  return primero
    .slice(inicio)
    .replace(/[⟦⟧]/g, '')
    .slice(0, 80)
    .trim();
}
