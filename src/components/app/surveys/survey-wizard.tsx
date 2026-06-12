'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gift,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type {
  SurveyDefinition,
  SurveyQuestion,
} from '@/lib/surveys/catalog';
import { SURVEY_REWARDS } from '@/lib/surveys/catalog';

type Answers = Record<string, string | string[] | number>;

interface Props {
  survey: SurveyDefinition;
  initialAnswers?: Answers;
  /** Si true, hay un botón "Lo haré más tarde". */
  showSkip?: boolean;
  /** Callback al completar exitosamente. Si retorna false, no se cierra. */
  onCompleted?: (granted: {
    generator_call: number;
    evaluation_run: number;
  }) => void;
  /** Callback cuando el usuario presiona "Lo haré más tarde". */
  onSkip?: () => void;
}

export function SurveyWizard({
  survey,
  initialAnswers,
  showSkip = false,
  onCompleted,
  onSkip,
}: Props) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(initialAnswers || {});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | {
    generator_call: number;
    evaluation_run: number;
    re_completion: boolean;
  }>(null);

  const totalSteps = survey.steps.length;
  const stepQs = useMemo(
    () => survey.questions.filter((q) => q.step === step),
    [survey, step],
  );
  const stepMeta = survey.steps[step - 1];

  const canAdvance = useMemo(() => {
    return stepQs.every((q) => {
      if (!q.required) return true;
      const v = answers[q.id];
      if (q.type === 'multi') return Array.isArray(v) && v.length > 0;
      if (q.type === 'rating') return typeof v === 'number' && v > 0;
      return v !== undefined && v !== null && v !== '';
    });
  }, [stepQs, answers]);

  function setAnswer(id: string, value: string | string[] | number) {
    setAnswers((p) => ({ ...p, [id]: value }));
  }

  function toggleMulti(id: string, value: string, max?: number) {
    const cur = (answers[id] as string[]) || [];
    if (cur.includes(value)) {
      setAnswer(
        id,
        cur.filter((v) => v !== value),
      );
    } else {
      if (max && cur.length >= max) {
        toast.warning(`Máximo ${max} opciones`);
        return;
      }
      setAnswer(id, [...cur, value]);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message || json?.error || 'No se pudo guardar');
        return;
      }
      const granted = json.granted || { generator_call: 0, evaluation_run: 0 };
      const re = !json.reward_granted; // si era false → ya estaba premiada antes
      setDone({ ...granted, re_completion: re });
      if (!re) {
        // Confetti
        confetti({
          particleCount: 120,
          spread: 90,
          startVelocity: 45,
          origin: { y: 0.6 },
          colors: ['#0583F2', '#3FA2F6', '#10B981', '#F59E0B', '#FFFFFF'],
        });
        setTimeout(
          () =>
            confetti({
              particleCount: 80,
              spread: 70,
              startVelocity: 35,
              origin: { x: 0.2, y: 0.7 },
              colors: ['#0583F2', '#FFFFFF'],
            }),
          250,
        );
        setTimeout(
          () =>
            confetti({
              particleCount: 80,
              spread: 70,
              startVelocity: 35,
              origin: { x: 0.8, y: 0.7 },
              colors: ['#10B981', '#F59E0B'],
            }),
          400,
        );
      }
      onCompleted?.(granted);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function skip() {
    try {
      await fetch('/api/surveys', { method: 'PATCH' });
    } catch {
      /* noop */
    }
    onSkip?.();
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-8 text-center"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-5">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h2 className="font-semibold text-2xl tracking-tight text-slate-900 mb-2">
          {done.re_completion ? '¡Gracias por actualizar tus respuestas!' : '¡Gracias por tu tiempo!'}
        </h2>
        <p className="text-sm text-slate-600 mb-7 max-w-md mx-auto">
          {done.re_completion
            ? 'Ya habías recibido los créditos extra antes — esta vez no se duplican, pero tu nueva información sí queda guardada.'
            : 'Hemos sumado créditos extra a tu cuenta este mes. Úsalos cuando quieras.'}
        </p>

        {!done.re_completion && (
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-7">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="font-mono text-3xl font-semibold text-brand-700">
                +{done.generator_call}
              </p>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-700 mt-1">
                generaciones
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-mono text-3xl font-semibold text-emerald-700">
                +{done.evaluation_run}
              </p>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700 mt-1">
                evaluaciones
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Estos créditos extra se suman a tu cuota normal del mes.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-600 mb-1">
              {survey.title}
            </p>
            <h2 className="font-semibold text-lg text-slate-900 tracking-tight">
              {stepMeta.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{stepMeta.subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono text-slate-500">
              {step} / {totalSteps}
            </p>
          </div>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-1.5" />

        {/* Banner reward */}
        {step === 1 && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 flex items-center gap-2.5">
            <Gift className="h-4 w-4 text-emerald-700 shrink-0" />
            <p className="text-xs text-emerald-900">
              Al completar la encuesta recibirás{' '}
              <strong className="font-semibold">
                +{SURVEY_REWARDS.generator_call} generaciones
              </strong>{' '}
              y{' '}
              <strong className="font-semibold">
                +{SURVEY_REWARDS.evaluation_run} evaluaciones
              </strong>{' '}
              gratis este mes, que se suman a tu cuota.
            </p>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="px-6 sm:px-8 py-6 space-y-7 max-h-[65vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-7"
          >
            {stepQs.map((q, qi) => (
              <QuestionView
                key={q.id}
                q={q}
                index={qi}
                answer={answers[q.id]}
                onSet={(v) => setAnswer(q.id, v)}
                onToggleMulti={(v) => toggleMulti(q.id, v, q.maxOptions)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 sm:px-8 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Anterior
            </Button>
          ) : (
            showSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skip}
                className="text-slate-500 hover:text-slate-700"
              >
                Lo haré más tarde
              </Button>
            )
          )}
        </div>

        {step < totalSteps ? (
          <Button
            size="sm"
            disabled={!canAdvance}
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
          >
            Siguiente
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="glow"
            loading={submitting}
            disabled={!canAdvance}
            onClick={submit}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Enviar y obtener créditos
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionView({
  q,
  index,
  answer,
  onSet,
  onToggleMulti,
}: {
  q: SurveyQuestion;
  index: number;
  answer: string | string[] | number | undefined;
  onSet: (v: string | number) => void;
  onToggleMulti: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-2 mb-3">
        <span className="font-mono text-[10px] text-slate-400 mt-1">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            {q.question}
            {q.required && <span className="text-rose-500 ml-1">*</span>}
          </p>
          {q.hint && (
            <p className="text-[11px] text-slate-500 mt-0.5">{q.hint}</p>
          )}
        </div>
      </div>

      {q.type === 'single' && q.options && (
        <div className="space-y-2 pl-6">
          {q.options.map((o) => {
            const selected = answer === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onSet(o.value)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  selected
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 text-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-slate-300 bg-white',
                  )}
                >
                  {selected && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'multi' && q.options && (
        <div className="space-y-2 pl-6">
          {q.options.map((o) => {
            const arr = (answer as string[]) || [];
            const selected = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onToggleMulti(o.value)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                  selected
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 text-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    selected
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-slate-300 bg-white',
                  )}
                >
                  {selected && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'rating' && (
        <div className="pl-6">
          <div className="flex items-center gap-2">
            {Array.from({ length: q.ratingMax || 5 }, (_, i) => i + 1).map((n) => {
              const selected = answer === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSet(n)}
                  className={cn(
                    'h-10 w-10 rounded-lg border text-sm font-semibold transition-all',
                    selected
                      ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/30 scale-110'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {q.ratingLabel && (
            <div className="mt-2 flex justify-between text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              <span>{q.ratingLabel.low}</span>
              <span>{q.ratingLabel.high}</span>
            </div>
          )}
        </div>
      )}

      {q.type === 'text' && (
        <div className="pl-6">
          <Textarea
            value={(answer as string) || ''}
            onChange={(e) => onSet(e.target.value)}
            placeholder={q.placeholder}
            maxLength={q.maxLength ?? 500}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
