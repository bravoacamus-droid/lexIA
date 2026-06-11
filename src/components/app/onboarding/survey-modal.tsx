'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SURVEYS, type SurveyQuestion } from '@/lib/surveys/definitions';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  role: ProfileRole;
  /** Si true, fuerza apertura inicial. Pasa false si el usuario ya completó. */
  open: boolean;
  /** Llamado tras enviar o saltar — el server-side sirve para hacer fetch al refresh. */
  onClose: () => void;
}

export function SurveyModal({ role, open, onClose }: Props) {
  const survey = SURVEYS[role];
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => setInternalOpen(open), [open]);

  function setSingle(q: SurveyQuestion, value: string) {
    setAnswers((p) => ({ ...p, [q.id]: value }));
  }

  function toggleMulti(q: SurveyQuestion, value: string) {
    setAnswers((p) => {
      const cur = (p[q.id] as string[] | undefined) || [];
      const has = cur.includes(value);
      return {
        ...p,
        [q.id]: has ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  }

  async function send(skipped: boolean) {
    if (!skipped) {
      // Validar que todas las no-opcionales tengan respuesta
      for (const q of survey.questions) {
        if (q.optional) continue;
        const v = answers[q.id];
        const isEmpty =
          v == null
          || (typeof v === 'string' && v.trim() === '')
          || (Array.isArray(v) && v.length === 0);
        if (isEmpty) {
          toast.error(`Falta responder: «${q.prompt.slice(0, 70)}»`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_slug: role,
          answers: skipped ? {} : answers,
          skipped,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!skipped) toast.success('¡Gracias por compartir tu experiencia!');
      setInternalOpen(false);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={internalOpen}
      onOpenChange={(o) => {
        setInternalOpen(o);
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            {survey.title}
          </DialogTitle>
          <DialogDescription>{survey.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {survey.questions.map((q, i) => (
            <div key={q.id}>
              <Label className="text-sm font-semibold mb-2 block">
                {i + 1}. {q.prompt}
                {q.optional && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                    opcional
                  </span>
                )}
              </Label>

              {q.type === 'single' && q.options && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSingle(q, opt)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-sm transition-all',
                          selected
                            ? 'border-brand-500 ring-2 ring-brand-500/15 bg-brand-50/40 dark:bg-brand-950/30'
                            : 'border-border hover:border-brand-300 dark:hover:border-brand-700',
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'multi' && q.options && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => {
                    const cur = (answers[q.id] as string[] | undefined) || [];
                    const selected = cur.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleMulti(q, opt)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-sm transition-all',
                          selected
                            ? 'border-brand-500 ring-2 ring-brand-500/15 bg-brand-50/40 dark:bg-brand-950/30'
                            : 'border-border hover:border-brand-300 dark:hover:border-brand-700',
                        )}
                      >
                        {selected ? '✓ ' : ''}{opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'text' && (
                <Textarea
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => setSingle(q, e.target.value)}
                  rows={3}
                  placeholder="Escribe tu respuesta…"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => send(true)}
            disabled={submitting}
          >
            Saltar
          </Button>
          <Button
            onClick={() => send(false)}
            loading={submitting}
            variant="glow"
          >
            Enviar respuestas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Hook que decide si mostrar el modal: lo abre una sola vez tras el primer login post-onboarding. */
export function SurveyModalLauncher({ role }: { role: ProfileRole }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch('/api/surveys');
        const data = await res.json();
        if (canceled) return;
        if (!data.completed) {
          // Pequeño delay para no abrirlo al instante mientras se hidrata la home
          setTimeout(() => setOpen(true), 800);
        }
      } catch {
        /* silencio */
      }
    })();
    return () => { canceled = true; };
  }, []);

  return <SurveyModal role={role} open={open} onClose={() => setOpen(false)} />;
}
