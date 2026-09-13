'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Gift, Clock } from 'lucide-react';
import { SurveyWizard } from './survey-wizard';
import { SURVEY_REWARDS, type SurveyDefinition } from '@/lib/surveys/catalog';

/**
 * Modal que aparece automáticamente 5 segundos después del primer ingreso
 * a la plataforma post-onboarding. Si el usuario:
 *   - Acepta → se abre el SurveyWizard inline.
 *   - Postpone → registra skip y cierra. Puede retomarla desde /encuestas.
 *   - Cierra (X) → solo cierra esta sesión; vuelve al próximo login.
 *
 * Una vez completada, no vuelve a aparecer (consulta /api/surveys).
 */

const SESSION_DISMISS_KEY = 'lexia.survey_prompt.dismissed_session';

/** Espera desde que entra hasta el primer intento de abrir. */
const ESPERA_INICIAL = 5000;
/** Si estaba ocupado, cada cuánto se vuelve a mirar. */
const REINTENTO = 4000;
/** Silencio de teclado o de ratón que se exige para considerarlo desocupado. */
const QUIETUD = 2500;

/**
 * Si el usuario está en medio de algo, la encuesta no interrumpe.
 *
 * El modal se abría a los cinco segundos pasara lo que pasara. Al
 * abrirse toma el foco —es un diálogo modal— y las teclas siguientes se
 * pierden: apareció redactando un requerimiento, escribiendo el correo
 * de la mesa de partes, y de "mesadepartes.muni.gob.pe" solo quedó
 * "mesadepartes.m". No era un fallo de ese campo: le pasa a cualquier
 * caja de texto de la aplicación.
 */
function estaOcupado(ultimoGesto: number) {
  if (Date.now() - ultimoGesto < QUIETUD) return true;

  // Y tampoco encima de algo que está cargando. Escribir la necesidad,
  // pedirle a LexIA que proponga los apartados y esperar siete segundos
  // deja el foco en un botón, no en una caja de texto: por ahí se colaba
  // la encuesta justo cuando llegaba la respuesta. Todo lo que tarda en
  // esta aplicación enseña la misma rueda, así que vale para cualquier
  // pantalla, no solo para el generador.
  if (document.querySelector('.animate-spin')) return true;

  const foco = document.activeElement as HTMLElement | null;
  if (foco) {
    const etiqueta = foco.tagName;
    if (
      etiqueta === 'INPUT' ||
      etiqueta === 'TEXTAREA' ||
      etiqueta === 'SELECT' ||
      foco.isContentEditable
    ) {
      return true;
    }
  }

  // Tampoco se apila sobre otro diálogo ya abierto.
  return !!document.querySelector('[role="dialog"][data-state="open"]');
}

export function SurveyPromptModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'invite' | 'wizard'>('invite');
  const [survey, setSurvey] = useState<SurveyDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  const closeForSession = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      /* noop */
    }
    setOpen(false);
  }, []);

  // Marca del último gesto, para saber si está en medio de algo. No
  // solo teclas: quien acaba de pulsar un botón y espera el resultado
  // está tan ocupado como quien escribe.
  const ultimoGesto = useRef(0);
  useEffect(() => {
    const anotar = () => {
      ultimoGesto.current = Date.now();
    };
    window.addEventListener('keydown', anotar, true);
    window.addEventListener('pointerdown', anotar, true);
    return () => {
      window.removeEventListener('keydown', anotar, true);
      window.removeEventListener('pointerdown', anotar, true);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const intentarAbrir = () => {
      if (!mounted) return;
      if (estaOcupado(ultimoGesto.current)) {
        timer = setTimeout(intentarAbrir, REINTENTO);
        return;
      }
      setOpen(true);
    };

    async function load() {
      // Si en esta sesión ya cerró el modal, no molestamos otra vez
      try {
        if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
          setLoading(false);
          return;
        }
      } catch {
        /* noop */
      }

      try {
        const res = await fetch('/api/surveys');
        const json = await res.json();
        if (!mounted) return;
        // Solo mostramos si el perfil ya hizo onboarding y la encuesta no está completada
        if (
          json?.onboarding_completed &&
          json?.profile_role &&
          json?.status === 'pending' &&
          json?.survey
        ) {
          setSurvey(json.survey as SurveyDefinition);
          timer = setTimeout(intentarAbrir, ESPERA_INICIAL);
        }
      } catch {
        /* noop */
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (loading || !survey) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeForSession()}>
      <DialogContent className="max-w-xl p-0 bg-white border-slate-200 shadow-2xl overflow-hidden gap-0 sm:rounded-2xl">
        {phase === 'invite' ? (
          <Invite
            survey={survey}
            onAccept={() => setPhase('wizard')}
            onClose={closeForSession}
          />
        ) : (
          <SurveyWizard
            survey={survey}
            showSkip
            onCompleted={() => {
              setTimeout(() => closeForSession(), 3500);
            }}
            onSkip={closeForSession}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Invite({
  survey,
  onAccept,
  onClose,
}: {
  survey: SurveyDefinition;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_0%,rgba(5,131,242,0.15),transparent_70%),radial-gradient(35%_45%_at_85%_30%,rgba(16,185,129,0.10),transparent_70%)]" />
      <div className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgba(2,29,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,29,64,0.04)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black_0%,transparent_70%)]" />

      <div className="p-8 sm:p-10">
        <motion.div
          initial={{ scale: 0.7, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl shadow-brand-500/40 mb-5"
        >
          <Gift className="h-6 w-6" />
        </motion.div>

        <h2 className="font-semibold text-2xl sm:text-3xl tracking-[-0.02em] text-slate-900 leading-tight mb-2">
          Ayúdanos a hacer LexIA{' '}
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            mejor para ti
          </span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Sabemos que tu tiempo vale. Si te tomas{' '}
          <strong className="text-slate-900 font-semibold">
            ~{survey.estimatedMinutes} minutos
          </strong>{' '}
          en responder esta encuesta, recibirás créditos extra para usar este mes:
        </p>

        {/* Rewards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4">
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="font-mono text-3xl font-semibold text-brand-700">
                +{SURVEY_REWARDS.generator_call}
              </span>
              <span className="text-xs font-medium text-brand-700">extra</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-700">
              Generaciones de documentos
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="font-mono text-3xl font-semibold text-emerald-700">
                +{SURVEY_REWARDS.evaluation_run}
              </span>
              <span className="text-xs font-medium text-emerald-700">extra</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">
              Evaluaciones / revisiones
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 flex items-center gap-2.5 mb-7">
          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <p className="text-[11px] text-slate-600 leading-snug">
            Estos créditos se{' '}
            <strong className="font-semibold text-slate-900">
              suman a tu cuota normal
            </strong>{' '}
            del mes — sobrepasan tu plan actual.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            size="lg"
            variant="glow"
            onClick={onAccept}
            className="flex-1 shadow-xl shadow-brand-500/30"
          >
            <Sparkles className="h-4 w-4" />
            Responder ahora
          </Button>
          <Button
            asChild={false}
            size="lg"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-slate-300 text-slate-700"
          >
            Lo haré más tarde
          </Button>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          Podrás volver a la encuesta cuando quieras desde{' '}
          <Link href="/encuestas" onClick={onClose} className="underline">
            Encuestas
          </Link>{' '}
          en el menú lateral.
        </p>
      </div>
    </motion.div>
  );
}
