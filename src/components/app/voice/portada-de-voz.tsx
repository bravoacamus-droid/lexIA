'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mic, Lightbulb, HelpCircle, ScrollText, FileText, ArrowRight, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * El arranque de «Habla con A-LexIA».
 *
 * El mockup convierte esta pantalla en un botón grande: un micrófono con
 * ondas, la pregunta «¿Listo para hablar?» y la voz elegida debajo. Lo
 * que antes estaba repartido entre una lista de llamadas y una pantalla
 * de configuración aparte ahora se decide aquí, y la voz escogida viaja
 * en la URL hasta el consentimiento.
 */

const VOCES = [
  { id: 'Aoede', label: 'Aoede (femenina, neutra)' },
  { id: 'Kore', label: 'Kore (femenina, cálida)' },
  { id: 'Puck', label: 'Puck (masculina, juvenil)' },
  { id: 'Charon', label: 'Charon (masculina, grave)' },
] as const;

const CONSEJOS = [
  { icono: Mic, texto: 'Habla con claridad y a un ritmo natural' },
  { icono: HelpCircle, texto: 'Puedes hacer preguntas complejas' },
  { icono: ScrollText, texto: 'A-LexIA identificará la normativa aplicable' },
];

const EJEMPLOS = [
  '¿Cuándo procede una ampliación de plazo?',
  '¿Cómo se calcula la penalidad por mora?',
  '¿Qué requisitos se solicitan para acreditar la experiencia del postor?',
];

export function PortadaDeVoz({ disponible }: { disponible: boolean }) {
  const [voz, setVoz] = useState<string>('Aoede');

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-5 py-12 text-center shadow-soft sm:py-16">
        {disponible ? (
          <Link
            href={`/llamadas/nueva?voz=${encodeURIComponent(voz)}`}
            aria-label="Iniciar la consulta por voz"
            className="group relative inline-flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40"
          >
            {/* las ondas del mockup: tres anillos que salen del botón */}
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                className="absolute inset-0 rounded-full border border-consultar-400/40 motion-safe:animate-companero-onda"
                style={{ animationDelay: `${i * 0.6}s` }}
              />
            ))}
            <span className="absolute inset-4 rounded-full bg-consultar-500/10" />
            <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-consultar-400 to-consultar-600 text-white shadow-glow-strong transition-transform group-hover:scale-105 sm:h-24 sm:w-24">
              <Mic className="h-9 w-9 sm:h-10 sm:w-10" strokeWidth={1.9} />
            </span>
          </Link>
        ) : (
          <span className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Mic className="h-9 w-9" strokeWidth={1.9} />
          </span>
        )}

        <h2 className="mt-7 text-2xl font-bold tracking-tight sm:text-[1.7rem]">
          {disponible ? '¿Listo para hablar?' : 'La voz no está en tu plan'}
        </h2>
        <p className="mt-1.5 max-w-sm text-pretty text-[14px] leading-relaxed text-muted-foreground">
          {disponible
            ? 'Presiona el botón y realiza tu consulta sobre contrataciones del Estado.'
            : 'Actualiza tu plan para conversar por voz con A-LexIA y recibir respuestas con su sustento citado.'}
        </p>

        {disponible ? (
          <div className="mt-6 w-full max-w-xs">
            <label className="sr-only" htmlFor="voz-del-agente">
              Voz del agente
            </label>
            <Select value={voz} onValueChange={setVoz}>
              <SelectTrigger id="voz-del-agente" className="rounded-full">
                <span className="mr-2 inline-flex items-center text-consultar-500">
                  <Ondas />
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOCES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Crown className="h-4 w-4" />
            Ver planes
          </Link>
        )}
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <header className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" strokeWidth={2} />
            <h3 className="text-[14px] font-bold tracking-tight">
              Consejos para una mejor consulta
            </h3>
          </header>
          <ul className="mt-3 space-y-2">
            {CONSEJOS.map((c) => (
              <li
                key={c.texto}
                className="flex items-center gap-2.5 rounded-xl bg-secondary/50 px-3 py-2.5"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-consultar-50 dark:bg-consultar-900/40">
                  <c.icono
                    className="h-3.5 w-3.5 text-consultar-600 dark:text-consultar-400"
                    strokeWidth={2}
                  />
                </span>
                <span className="text-[12.5px] leading-snug">{c.texto}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <header className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-consultar-500" strokeWidth={2} />
            <h3 className="text-[14px] font-bold tracking-tight">Ejemplos que puedes probar</h3>
          </header>
          <ul className="mt-3 space-y-2">
            {EJEMPLOS.map((e) => (
              <li key={e}>
                {/* Los ejemplos llevan al chat escrito: por voz no se
                    puede precargar una pregunta —hay que dictarla—, y un
                    enlace que no hiciera nada sería peor que ninguno. */}
                <Link
                  href={`/chat?new=1&q=${encodeURIComponent(e)}`}
                  className="group flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-consultar-300 hover:bg-consultar-50/60 dark:hover:border-consultar-700 dark:hover:bg-consultar-900/20"
                >
                  <span className="min-w-0 flex-1 text-pretty text-[12.5px] leading-snug">
                    {e}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-consultar-500 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Las tres barritas de audio que el mockup pone junto al nombre de la voz. */
function Ondas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={cn('h-3.5 w-4', className)} aria-hidden>
      {[
        { x: 1, h: 6 },
        { x: 5, h: 12 },
        { x: 9, h: 8 },
        { x: 13, h: 12 },
        { x: 17, h: 5 },
      ].map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={(14 - b.h) / 2}
          width="2"
          height={b.h}
          rx="1"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
