'use client';

/**
 * La versión mejorada del requerimiento, en la pantalla del resultado.
 *
 * Un panel para generarla y descargarla, y dentro de cada hallazgo lo
 * que A-LexIA concluyó al comprobarlo: si se corrige, si no procede o si
 * lo decide el área usuaria, con el «Dice / Debe decir» y un interruptor
 * para dejarlo fuera. Ver `src/lib/evaluacion/mejora/`.
 */
import { useState } from 'react';
import {
  Wand2,
  Loader2,
  FileDown,
  FileText,
  CheckCircle2,
  XCircle,
  UserCog,
  AlertTriangle,
  BookOpenCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { comparar } from '@/lib/evaluacion/mejora/texto';
import { TEXTO_VEREDICTO, type Mejora, type MejoraDelRequerimiento, type Veredicto } from '@/lib/evaluacion/mejora/tipos';

const ESTILO_VEREDICTO: Record<Veredicto, { icono: typeof CheckCircle2; clase: string }> = {
  aplicar: {
    icono: CheckCircle2,
    clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  decide_area: {
    icono: UserCog,
    clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  descartar: {
    icono: XCircle,
    clase: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

export function InsigniaVeredicto({ veredicto }: { veredicto: Veredicto }) {
  const e = ESTILO_VEREDICTO[veredicto];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', e.clase)}>
      <e.icono className="h-3 w-3" />
      {TEXTO_VEREDICTO[veredicto]}
    </span>
  );
}

// ── El panel ────────────────────────────────────────────────────────

async function descargar(url: string, respaldo: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.detail || j.error || `Error ${res.status}`);
  }
  const blob = await res.blob();
  const nombre =
    decodeURIComponent(
      (res.headers.get('Content-Disposition') ?? '').match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? '',
    ) || respaldo;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return res;
}

interface PanelProps {
  id: string;
  origen: 'docx' | 'pdf';
  hallazgos: number;
  mejora: MejoraDelRequerimiento | null;
  onMejora: (m: MejoraDelRequerimiento) => void;
}

export function PanelVersionMejorada({ id, origen, hallazgos, mejora, onMejora }: PanelProps) {
  const [generando, setGenerando] = useState(false);
  const [bajando, setBajando] = useState<'word' | 'cuadro' | null>(null);

  async function generar() {
    setGenerando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/mejora`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || j.error || `Error ${res.status}`);
      onMejora(j.mejora as MejoraDelRequerimiento);
      toast.success('Versión mejorada lista');
    } catch (e) {
      toast.error(`No se pudo generar: ${(e as Error).message.slice(0, 120)}`);
    } finally {
      setGenerando(false);
    }
  }

  async function bajar(formato: 'word' | 'cuadro') {
    setBajando(formato);
    try {
      const res = await descargar(
        `/api/evaluations/${id}/mejora/${formato}`,
        formato === 'word' ? 'Requerimiento con cambios.docx' : 'Cuadro de cambios.docx',
      );
      const aMano = Number(res.headers.get('X-Cambios-A-Mano') ?? 0);
      if (formato === 'word' && aMano > 0) {
        toast.info(`${aMano} cambio(s) no se pudieron marcar en el Word: están en el cuadro de cambios.`);
      }
    } catch (e) {
      toast.error((e as Error).message.slice(0, 160));
    } finally {
      setBajando(null);
    }
  }

  const cuenta = (v: Veredicto) => mejora?.mejoras.filter((m) => m.veredicto === v).length ?? 0;
  const incluidos = mejora?.mejoras.filter((m) => m.incluir).length ?? 0;

  return (
    <Card className="p-6 border-brand-200/60 dark:border-brand-900/60">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
            <Wand2 className="h-3.5 w-3.5" />
            Versión mejorada del requerimiento
          </h2>
          {!mejora ? (
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">
              A-LexIA comprueba cada hallazgo contra la normativa de la biblioteca —bases estándar,
              Ley y Reglamento— y redacta la corrección. Lo que la norma no respalde se descarta, y
              lo que dependa de una decisión del área usuaria queda señalado para que lo complete.
            </p>
          ) : (
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">
              <strong>{cuenta('aplicar')}</strong> {cuenta('aplicar') === 1 ? 'se corrige' : 'se corrigen'},{' '}
              <strong>{cuenta('decide_area')}</strong>{' '}
              {cuenta('decide_area') === 1 ? 'lo decide' : 'los decide'} el área usuaria y{' '}
              <strong>{cuenta('descartar')}</strong> {cuenta('descartar') === 1 ? 'no procede' : 'no proceden'}.{' '}
              {incluidos === 1 ? 'Entra' : 'Entran'} <strong>{incluidos}</strong>{' '}
              {incluidos === 1 ? 'cambio' : 'cambios'} en la versión mejorada; puedes quitar los que no
              quieras en cada hallazgo.
            </p>
          )}
          {origen === 'pdf' && (
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Este requerimiento se evaluó desde un PDF: recibirás el cuadro de cambios «Dice / Debe
              decir». Para recibir tu propio documento con control de cambios, evalúalo en Word.
            </p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 md:w-64 md:shrink-0">
          {!mejora ? (
            <Button onClick={generar} disabled={generando || hallazgos === 0}>
              {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generando ? 'Comprobando contra la norma…' : 'Generar versión mejorada'}
            </Button>
          ) : (
            <>
              {origen === 'docx' && (
                <Button onClick={() => bajar('word')} disabled={bajando !== null || incluidos === 0}>
                  {bajando === 'word' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  Word con control de cambios
                </Button>
              )}
              <Button
                variant={origen === 'docx' ? 'outline' : 'default'}
                onClick={() => bajar('cuadro')}
                disabled={bajando !== null}
              >
                {bajando === 'cuadro' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Cuadro de cambios
              </Button>
              <Button variant="ghost" size="sm" onClick={generar} disabled={generando}>
                {generando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Volver a generar
              </Button>
            </>
          )}
        </div>
      </div>
      {generando && (
        <p className="mt-4 text-[12px] text-muted-foreground">
          Se revisan los {hallazgos} hallazgos uno por uno contra la biblioteca. Tarda alrededor de un
          minuto.
        </p>
      )}
    </Card>
  );
}

// ── Dentro de cada hallazgo ─────────────────────────────────────────

/** El texto con los huecos para el área usuaria en rojo. */
function ConHuecos({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\[[^\]\n]{2,200}\])/).map((t, i) =>
        /^\[[^\]]+\]$/.test(t) ? (
          <span key={i} className="rounded bg-red-50 px-0.5 font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
            {t}
          </span>
        ) : (
          <span key={i}>{t}</span>
        ),
      )}
    </>
  );
}

function DiceDebeDecir({ antes, despues }: { antes: string; despues: string }) {
  const ops = comparar(antes, despues);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dice</p>
        <p className="rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed">
          {ops.map((o, i) =>
            o.tipo === 'inserta' ? null : o.tipo === 'borra' ? (
              <del key={i} className="bg-red-100/70 text-red-800 decoration-red-500 dark:bg-red-950/50 dark:text-red-300">
                {o.texto}
              </del>
            ) : (
              <span key={i}>{o.texto}</span>
            ),
          )}
        </p>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Debe decir</p>
        <p className="rounded-md border border-emerald-500/30 bg-emerald-50/40 px-3 py-2 text-[13px] leading-relaxed dark:bg-emerald-950/20">
          {ops.map((o, i) =>
            o.tipo === 'borra' ? null : o.tipo === 'inserta' ? (
              <ins key={i} className="bg-emerald-100 font-medium text-emerald-900 no-underline dark:bg-emerald-900/50 dark:text-emerald-200">
                <ConHuecos texto={o.texto} />
              </ins>
            ) : (
              <span key={i}>{o.texto}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Los guardados de los interruptores, de uno en uno.
 *
 * Cada guardado reescribe la versión mejorada entera: dos interruptores
 * pulsados seguidos harían dos lecturas del mismo estado y el segundo
 * borraría el primero. En fila, cada uno lee lo que dejó el anterior.
 */
let cola: Promise<unknown> = Promise.resolve();
function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(tarea, tarea);
  cola = siguiente.catch(() => undefined);
  return siguiente;
}

interface MejoraProps {
  id: string;
  mejora: Mejora;
  origen: 'docx' | 'pdf';
  onCambio: (m: Mejora) => void;
}

export function MejoraDelHallazgo({ id, mejora: m, origen, onCambio }: MejoraProps) {
  const [guardando, setGuardando] = useState(false);

  async function alternar(incluir: boolean) {
    const antes = m.incluir;
    onCambio({ ...m, incluir });
    setGuardando(true);
    try {
      const res = await enCola(() =>
        fetch(`/api/evaluations/${id}/mejora`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hallazgoId: m.hallazgoId, incluir }),
        }),
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
    } catch {
      onCambio({ ...m, incluir: antes });
      toast.error('No se pudo guardar el cambio');
    } finally {
      setGuardando(false);
    }
  }

  const incluible = m.veredicto !== 'descartar' && Boolean(m.textoMejorado);

  return (
    <div className="space-y-3 rounded-lg border border-brand-200/60 bg-card p-4 dark:border-brand-900/60">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
          <BookOpenCheck className="h-3.5 w-3.5" />
          Comprobado contra la norma
        </p>
        <InsigniaVeredicto veredicto={m.veredicto} />
      </div>

      <p className="text-[13px] leading-relaxed text-foreground/90">{m.motivo}</p>

      {m.avisos.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Cita por verificar: {m.avisos.map((a) => a.cita).join('; ')}. No venía en el sustento que se
            consultó; compruébala antes de usarla.
          </span>
        </p>
      )}

      {m.textoOriginal && m.textoMejorado && <DiceDebeDecir antes={m.textoOriginal} despues={m.textoMejorado} />}

      {m.decisionPendiente && (
        <p className="rounded-md bg-amber-50/70 px-3 py-2 text-[12px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <strong>Decide el área usuaria:</strong> {m.decisionPendiente}
        </p>
      )}

      {incluible && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 flex-wrap">
          <p className="text-[12px] text-muted-foreground">
            {origen === 'pdf'
              ? 'Irá en el cuadro de cambios.'
              : m.enWord?.marcable === false
                ? `No se puede marcar en tu Word (${m.enWord.motivo}): irá en el cuadro para llevarlo a mano.`
                : 'Irá marcado con control de cambios en tu Word.'}
          </p>
          <label className="flex items-center gap-2 text-[12px] font-medium">
            <Switch checked={m.incluir} disabled={guardando} onCheckedChange={alternar} aria-label="Incluir en la versión mejorada" />
            Incluir en la versión mejorada
          </label>
        </div>
      )}
    </div>
  );
}
