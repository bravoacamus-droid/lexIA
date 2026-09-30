'use client';

import { Fragment, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MensajeDeTicket } from '@/lib/soporte/tipos';

/**
 * El hilo de una conversación de soporte. Lo usan el botón «Ayuda» (del
 * lado del usuario) y la bandeja del equipo: lo propio va a la derecha,
 * lo del otro lado a la izquierda, con separadores por día.
 */
export function Hilo({
  mensajes,
  vistaDeEquipo = false,
  nombreDelUsuario,
  compacto = false,
}: {
  mensajes: MensajeDeTicket[];
  vistaDeEquipo?: boolean;
  nombreDelUsuario?: string | null;
  compacto?: boolean;
}) {
  const fin = useRef<HTMLDivElement>(null);
  const ultimo = mensajes[mensajes.length - 1]?.id;

  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' });
  }, [ultimo]);

  let diaAnterior = '';
  return (
    <div className={cn('flex flex-col gap-2', compacto ? 'px-3 py-3' : 'px-5 py-4')}>
      {mensajes.map((m) => {
        const dia = new Date(m.created_at).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
        const nuevoDia = dia !== diaAnterior;
        diaAnterior = dia;
        const propio = m.propio;
        const autor = m.de_equipo ? 'Equipo A-LexIA' : vistaDeEquipo ? nombreDelUsuario || 'Usuario' : 'Tú';
        return (
          <Fragment key={m.id}>
            {nuevoDia && (
              <div className="my-2 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {dia}
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className={cn('flex items-end gap-2', propio ? 'justify-end' : 'justify-start')}>
              {!propio && <Avatar deEquipo={m.de_equipo} nombre={autor} />}
              <div className={cn('flex max-w-[82%] flex-col', propio ? 'items-end' : 'items-start')}>
                <span className="mb-0.5 px-1 text-[10.5px] font-medium text-muted-foreground">
                  {autor} ·{' '}
                  {new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm',
                    propio
                      ? 'rounded-br-md bg-brand-600 text-white'
                      : m.de_equipo
                        ? 'rounded-bl-md border border-brand-100 bg-brand-50 text-foreground dark:border-brand-900 dark:bg-brand-950/60'
                        : 'rounded-bl-md border border-border bg-card text-foreground',
                  )}
                >
                  {m.cuerpo && <TextoConFormato texto={m.cuerpo} claro={propio} />}
                  {m.adjunto && <Adjunto adjunto={m.adjunto} claro={propio} conTexto={!!m.cuerpo} />}
                </div>
              </div>
            </div>
          </Fragment>
        );
      })}
      <div ref={fin} />
    </div>
  );
}

function Avatar({ deEquipo, nombre }: { deEquipo: boolean; nombre: string }) {
  if (deEquipo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icon.png"
        alt=""
        className="mb-0.5 h-7 w-7 shrink-0 rounded-full border border-brand-100 bg-white object-contain p-0.5"
      />
    );
  }
  return (
    <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold uppercase text-muted-foreground">
      {nombre.trim().charAt(0) || '?'}
    </span>
  );
}

function Adjunto({
  adjunto,
  claro,
  conTexto,
}: {
  adjunto: NonNullable<MensajeDeTicket['adjunto']>;
  claro: boolean;
  conTexto: boolean;
}) {
  if (adjunto.esImagen) {
    return (
      <a href={adjunto.url} target="_blank" rel="noopener noreferrer" className={cn('block', conTexto && 'mt-2')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={adjunto.url}
          alt={adjunto.nombre}
          className="max-h-56 w-auto max-w-full rounded-lg border border-black/10 object-contain"
        />
      </a>
    );
  }
  return (
    <a
      href={adjunto.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium underline-offset-2 hover:underline',
        conTexto && 'mt-2',
        claro ? 'bg-white/15 text-white' : 'bg-secondary text-foreground',
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{adjunto.nombre}</span>
    </a>
  );
}

/**
 * Texto con saltos de línea, **negritas** y enlaces que se pueden abrir.
 * Sin HTML: todo lo que no es negrita o enlace se pinta tal cual.
 */
export function TextoConFormato({ texto, claro = false }: { texto: string; claro?: boolean }) {
  return (
    <div className="space-y-1.5 whitespace-pre-wrap break-words">
      {texto.split(/\n{2,}/).map((parrafo, i) => (
        <p key={i}>{trozos(parrafo, claro)}</p>
      ))}
    </div>
  );
}

// Las rutas de la plataforma que el equipo suele indicar («entra a
// /cuenta/suscripcion»). Solo estas se vuelven enlace: un «y/o» no.
const RUTAS = '(?:app|chat|llamadas|buscador|biblioteca|consultar|generar|generador|evaluar|evaluador|revisor-tdr|revision-oferta|rnp|cuenta|pricing|ajustes)';
const PARTES = new RegExp(`(\\*\\*[^*]+\\*\\*|https?://[^\\s)]+|(?<=^|\\s)/${RUTAS}(?:[/?][\\w\\-/?=&]*)?(?=$|[\\s.,;:)]))`, 'g');

function trozos(texto: string, claro: boolean) {
  const partes = texto.split(PARTES);
  return partes.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(p) || new RegExp(`^/${RUTAS}`).test(p)) {
      return (
        <a
          key={i}
          href={p}
          target={p.startsWith('/') ? undefined : '_blank'}
          rel="noopener noreferrer"
          className={cn('font-medium underline underline-offset-2', claro ? 'text-white' : 'text-brand-700 dark:text-brand-300')}
        >
          {p}
        </a>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}
