'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check } from 'lucide-react';

const CASES = {
  postores: {
    title: 'Para Postores y Contratistas',
    bullets: [
      'Detecta requisitos críticos en las Bases antes de presentar',
      'Identifica observaciones subsanables y cómo levantarlas',
      'Redacta solicitudes de ampliación de plazo con sustento normativo',
      'Encuentra precedentes del Tribunal aplicables a tu caso',
    ],
  },
  funcionarios: {
    title: 'Para Funcionarios y Área Usuaria',
    bullets: [
      'Resuelve dudas normativas en segundos durante el proceso',
      'Evalúa propuestas con criterio fundamentado y trazable',
      'Acceso instantáneo a opiniones y pronunciamientos del OSCE',
      'Reduce tiempo de respuesta en consultas internas',
    ],
  },
  consultores: {
    title: 'Para Consultores Legales',
    bullets: [
      'Acelera la investigación normativa con búsqueda semántica',
      'Construye expedientes de defensa con citas verificables',
      'Genera documentos formales en minutos, no horas',
      'Biblioteca personal con highlights y carpetas por cliente',
    ],
  },
};

export function UseCases() {
  return (
    <section id="casos" className="py-20 sm:py-24 border-t border-border bg-secondary/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-brand-700 dark:text-brand-400 mb-3">
            Casos de uso
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance">
            Pensada para cada{' '}
            <span className="italic gradient-text">actor</span> del sistema
          </h2>
        </div>

        <Tabs defaultValue="postores" className="max-w-3xl mx-auto">
          <TabsList className="w-full grid grid-cols-3 h-auto p-1.5">
            <TabsTrigger value="postores" className="py-2.5 text-xs sm:text-sm">Postores</TabsTrigger>
            <TabsTrigger value="funcionarios" className="py-2.5 text-xs sm:text-sm">Funcionarios</TabsTrigger>
            <TabsTrigger value="consultores" className="py-2.5 text-xs sm:text-sm">Consultores</TabsTrigger>
          </TabsList>

          {(Object.keys(CASES) as Array<keyof typeof CASES>).map((key) => (
            <TabsContent key={key} value={key} className="mt-8">
              <div className="rounded-xl border border-border bg-card p-8">
                <h3 className="font-serif text-2xl mb-6 text-balance">
                  {CASES[key].title}
                </h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {CASES[key].bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-sm text-muted-foreground leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
