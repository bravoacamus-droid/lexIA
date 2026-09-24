'use client';

/**
 * El resultado de la evaluación de bases.
 *
 * Se lee de dos maneras, según quién mira: el proveedor busca qué
 * consultar u observar —y puede llevarlo a su pliego de consultas—; la
 * Entidad, qué corregir antes de publicar. El perfil elige la lectura
 * por defecto y se puede cambiar.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Info,
  Loader2,
  MapPin,
  MessagesSquare,
  Quote,
  RefreshCw,
  ShieldAlert,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import { TEXTO_TIPO, type HallazgoBases, type ResultadoBases, type Severidad } from '@/lib/evaluacion/bases/tipos';

type Lectura = 'proveedor' | 'entidad';

const SEVERIDAD: Record<Severidad, { label: string; icono: typeof AlertCircle; pill: string; borde: string }> = {
  critico: { label: 'Crítico', icono: ShieldAlert, pill: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', borde: 'border-red-500/40 dark:border-red-900/60' },
  alto: { label: 'Alto', icono: AlertTriangle, pill: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', borde: 'border-orange-500/40 dark:border-orange-900/60' },
  medio: { label: 'Medio', icono: AlertCircle, pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', borde: 'border-amber-500/40 dark:border-amber-900/60' },
  bajo: { label: 'Bajo', icono: Info, pill: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300', borde: 'border-sky-500/40 dark:border-sky-900/60' },
};

interface Props {
  id: string;
  titulo: string;
  documento: string;
  resultado: ResultadoBases;
  completada: string | null;
  lecturaInicial: Lectura;
  /** El proveedor puede llevar hallazgos a su pliego de consultas. */
  puedeFormular: boolean;
  estandares: Array<{ id: string; titulo: string }>;
}

function Cita({ rotulo, texto, icono: Icono = Quote }: { rotulo: string; texto: string; icono?: typeof Quote }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icono className="h-3 w-3" />
        {rotulo}
      </p>
      <blockquote className="whitespace-pre-line border-l-2 border-border pl-3 text-[13px] leading-relaxed text-foreground/85">
        {texto}
      </blockquote>
    </div>
  );
}

export function BasesResultView({
  id,
  titulo,
  documento,
  resultado: inicial,
  completada,
  lecturaInicial,
  puedeFormular,
  estandares,
}: Props) {
  const router = useRouter();
  const [resultado, setResultado] = useState(inicial);
  const [lectura, setLectura] = useState<Lectura>(lecturaInicial);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [elegidos, setElegidos] = useState<Record<string, boolean>>({});
  const [bajando, setBajando] = useState(false);
  const [formulando, setFormulando] = useState(false);
  const [reevaluando, setReevaluando] = useState(false);
  const [otroEstandar, setOtroEstandar] = useState(resultado.estandar.id);

  const general = resultado.hallazgos.filter((h) => h.seccion === 'General');
  const especifica = resultado.hallazgos.filter((h) => h.seccion === 'Específica');
  const cuenta = useMemo(() => {
    const c: Record<Severidad, number> = { critico: 0, alto: 0, medio: 0, bajo: 0 };
    for (const h of resultado.hallazgos) c[h.severidad]++;
    return c;
  }, [resultado]);
  const numero = new Map(resultado.hallazgos.map((h, i) => [h.id, i + 1]));
  const cuantosElegidos = Object.values(elegidos).filter(Boolean).length;

  async function descargar() {
    setBajando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/bases/informe?para=${lectura}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const nombre =
        decodeURIComponent((res.headers.get('Content-Disposition') ?? '').match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? '') ||
        'Evaluación de bases.docx';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      toast.error(`No se pudo descargar: ${(e as Error).message}`);
    } finally {
      setBajando(false);
    }
  }

  async function formular() {
    const ids = Object.entries(elegidos).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    setFormulando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/bases/consultas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hallazgos: ids }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || j.error || `Error ${res.status}`);
      toast.success(`${j.entradas} ${j.entradas === 1 ? 'entrada lista' : 'entradas listas'} en tu pliego de consultas`);
      router.push(`/evaluar/consultas/${j.pliegoId}`);
    } catch (e) {
      toast.error(`No se pudo crear el pliego: ${(e as Error).message}`);
      setFormulando(false);
    }
  }

  async function reevaluar() {
    if (otroEstandar === resultado.estandar.id) return;
    setReevaluando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/bases/reevaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estandarId: otroEstandar }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || j.error || `Error ${res.status}`);
      setResultado(j.resultado as ResultadoBases);
      setElegidos({});
      toast.success('Evaluada otra vez con la bases estándar elegida');
    } catch (e) {
      toast.error(`No se pudo reevaluar: ${(e as Error).message}`);
    } finally {
      setReevaluando(false);
    }
  }

  const tarjeta = (h: HallazgoBases) => {
    const s = SEVERIDAD[h.severidad];
    const abierto = abiertos[h.id] ?? false;
    return (
      <Card key={h.id} className={cn('overflow-hidden border-l-4', s.borde)}>
        <div className="flex items-start gap-3 p-5">
          {puedeFormular && lectura === 'proveedor' && (
            <Checkbox
              checked={Boolean(elegidos[h.id])}
              onCheckedChange={(v) => setElegidos((e) => ({ ...e, [h.id]: v === true }))}
              aria-label={`Llevar la observación ${numero.get(h.id)} al pliego`}
              className="mt-1"
            />
          )}
          <button
            onClick={() => setAbiertos((a) => ({ ...a, [h.id]: !abierto }))}
            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
          >
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', s.pill)}>{s.label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {TEXTO_TIPO[h.tipo]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">N.° {numero.get(h.id)}</span>
              </div>
              <h3 className="text-base font-semibold leading-snug">{h.titulo}</h3>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {h.capitulo}
                {h.numeral ? ` · numeral ${h.numeral}` : ''}
              </p>
            </div>
            {abierto ? (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </div>
        {abierto && (
          <div className="space-y-4 border-t border-border bg-secondary/20 px-5 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Cita rotulo="Dicen las bases" texto={h.enLasBases || '(no figura en las bases)'} />
              {h.enElEstandar && <Cita rotulo="Dice la bases estándar" texto={h.enElEstandar} icono={Scale} />}
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Por qué</p>
              <p className="text-[13px] leading-relaxed text-foreground/90">{h.analisis}</p>
              {h.norma && (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  {h.norma}
                </p>
              )}
            </div>
            {h.avisos.length > 0 && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Cita por verificar: {h.avisos.map((a) => a.cita).join('; ')}. No venía en el sustento consultado.
              </p>
            )}
            <div className="rounded-lg border border-brand-200/60 bg-card p-4 dark:border-brand-900/60">
              {lectura === 'proveedor' ? (
                <>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                    {h.paraElProveedor.tipo === 'consulta' ? 'Para consultar' : 'Para observar'}
                  </p>
                  <p className="text-[13px] leading-relaxed">{h.paraElProveedor.solicitud}</p>
                </>
              ) : (
                <>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                    Qué corregir antes de publicar
                  </p>
                  <p className="text-[13px] leading-relaxed">{h.paraLaEntidad}</p>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          Evaluación completada
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {documento}
          {completada && (
            <>
              {' '}· Completada <RelativeTime date={completada} />
            </>
          )}
        </p>
      </header>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bases estándar de referencia
            </p>
            <p className="mt-1 text-lg font-semibold">{resultado.estandar.titulo}</p>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/90">{resultado.resumen}</p>
          </div>
          <div className="flex flex-col gap-2 md:w-72 md:shrink-0">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="otro-estandar">
              ¿No es esta? Elige la que corresponde:
            </label>
            <div className="flex gap-2">
              <select
                id="otro-estandar"
                value={otroEstandar}
                onChange={(e) => setOtroEstandar(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[12px]"
              >
                {estandares.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={reevaluar}
                disabled={reevaluando || otroEstandar === resultado.estandar.id}
                aria-label="Evaluar otra vez con esta bases estándar"
              >
                {reevaluando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['critico', 'alto', 'medio', 'bajo'] as Severidad[]).map((sev) => (
            <div key={sev} className={cn('rounded-lg py-2.5 text-center', SEVERIDAD[sev].pill)}>
              <div className="font-mono text-xl font-semibold tabular-nums">{cuenta[sev]}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">{SEVERIDAD[sev].label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-[12px]" role="group" aria-label="Leer como">
            {(['proveedor', 'entidad'] as Lectura[]).map((l) => (
              <button
                key={l}
                onClick={() => setLectura(l)}
                className={cn(
                  'rounded-md px-3 py-1.5 font-medium transition-colors',
                  lectura === l ? 'bg-brand-600 text-white dark:bg-brand-500' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l === 'proveedor' ? 'Qué consultar u observar' : 'Qué corregir antes de publicar'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={descargar} disabled={bajando}>
            {bajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Informe en Word
          </Button>
        </div>
      </Card>

      {puedeFormular && lectura === 'proveedor' && resultado.hallazgos.length > 0 && (
        <Card className="flex flex-col gap-3 border-brand-200/60 p-4 dark:border-brand-900/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-foreground/85">
            Marca los hallazgos que quieras formular y llévalos a un pliego de consultas y observaciones,
            con su escrito en borrador.
          </p>
          <Button onClick={formular} disabled={cuantosElegidos === 0 || formulando} className="sm:shrink-0">
            {formulando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
            Llevar {cuantosElegidos || ''} a Consultas y observaciones
          </Button>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sección General · {general.length}
        </h2>
        {general.length === 0 ? (
          <Card className="flex items-start gap-3 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[13px] leading-relaxed text-foreground/85">
              Los {resultado.seccionGeneral.textos} textos de la Sección General coinciden con la bases estándar.
              Esta sección no puede modificarse en ningún extremo, bajo sanción de nulidad.
            </p>
          </Card>
        ) : (
          general.map(tarjeta)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sección Específica · {especifica.length}
        </h2>
        {especifica.length === 0 ? (
          <Card className="flex items-start gap-3 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[13px] leading-relaxed text-foreground/85">
              No se encontraron hallazgos en los capítulos revisados.
            </p>
          </Card>
        ) : (
          especifica.map(tarjeta)
        )}
        {resultado.capitulosRevisados.length > 0 && (
          <p className="text-[12px] text-muted-foreground">
            Capítulos revisados: {resultado.capitulosRevisados.join(' · ')}.
          </p>
        )}
      </section>

      <p className="text-[12px] text-muted-foreground">
        A-LexIA puede equivocarse. Revisa cada hallazgo contra las bases antes de formularlo o de corregirlas.
      </p>
    </div>
  );
}
