'use client';

/**
 * La segunda evaluación: el comité sube lo que llegó después de la
 * primera acta y A-LexIA evalúa solo eso.
 *
 * Documento 13 de César (10/10/2026): «debe habilitarse un botón para
 * poder agregar estos documentos» —de subsanación, de rechazo de oferta o
 * de negociación— «y a partir de la segunda evaluación A-LexIA ya no
 * debería evaluar nuevamente las ofertas inicialmente evaluadas».
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FilePlus2, Loader2, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { loObservado, tieneQueSubsanar } from '@/lib/evaluacion/observados';
import type { ResultadoPostor } from '@/lib/evaluacion/etapas';
import type { EtapasFinales } from '@/lib/evaluacion/economica';

type Tipo = 'subsanacion' | 'rechazo' | 'negociacion';
interface Subido {
  name: string;
  path: string;
  size: number;
  partes?: string[];
}

export interface RondaGuardada {
  numero: number;
  fecha: string;
  noSubsanaron?: string[];
  cambios: Array<{ postor: string; cambios: string[] }>;
}

const ETIQUETA: Record<Tipo, string> = {
  subsanacion: 'Documento de subsanación',
  rechazo: 'Detalle de la composición de la oferta o decisión de rechazo',
  negociacion: 'Acta o documento de negociación',
};

export function SegundaEvaluacion({
  id,
  postores,
  finales,
  rondas,
}: {
  id: string;
  postores: ResultadoPostor[];
  finales?: EtapasFinales;
  rondas?: RondaGuardada[];
}) {
  const router = useRouter();
  const [subidos, setSubidos] = useState<Record<string, Subido | null>>({});
  const [noSubsanaron, setNoSubsanaron] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  // Qué puede llegar de cada postor.
  const filas: Array<{ postor: ResultadoPostor; tipo: Tipo; detalle: string[] }> = [];
  for (const p of postores.filter(tieneQueSubsanar)) {
    filas.push({
      postor: p,
      tipo: 'subsanacion',
      detalle: loObservado(p).map((o) => `${o.requisito}${o.quePresentar ? `: ${o.quePresentar}` : o.hallazgo ? `: ${o.hallazgo}` : ''}`),
    });
  }
  for (const r of finales?.rechazo ?? []) {
    const p = postores.find((x) => x.postor === r.postor);
    if (p) filas.push({ postor: p, tipo: 'rechazo', detalle: [r.fundamento] });
  }
  if (finales?.negociacion) {
    const p = postores.find((x) => x.postor === finales.negociacion!.postor);
    if (p) filas.push({ postor: p, tipo: 'negociacion', detalle: [finales.negociacion.fundamento] });
  }

  const clave = (f: { postor: ResultadoPostor; tipo: Tipo }) => `${f.postor.postor}::${f.tipo}`;
  const listos = filas.filter((f) => subidos[clave(f)]);
  const puede = !enviando && (listos.length > 0 || noSubsanaron.size > 0);

  async function evaluar() {
    setEnviando(true);
    try {
      const r = await fetch(`/api/evaluations/${id}/ronda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentos: listos.map((f) => {
            const s = subidos[clave(f)]!;
            return { postor: f.postor.postor, tipo: f.tipo, nombre: s.name, path: s.path, partes: s.partes };
          }),
          noSubsanaron: [...noSubsanaron],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.detail ?? j.error ?? `HTTP ${r.status}`);
      toast.success('Evaluando los documentos nuevos');
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo iniciar la segunda evaluación: ${(e as Error).message}`);
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      {rondas && rondas.length > 0 && (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <History className="h-4 w-4" />
            Evaluaciones posteriores a la primera acta
          </h3>
          <div className="mt-3 space-y-3">
            {rondas.map((r) => (
              <div key={r.numero} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">
                  Sesión {r.numero + 1} · {new Date(r.fecha).toLocaleString('es-PE')}
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700">
                  {r.cambios.flatMap((c) =>
                    c.cambios.map((x, i) => (
                      <li key={`${c.postor}-${i}`}>
                        <span className="font-medium">{c.postor}</span>: {x}
                      </li>
                    )),
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filas.length > 0 && (
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FilePlus2 className="h-4 w-4" />
            Segunda evaluación: subsanación, rechazo o negociación
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Cuando el comité tenga los documentos —o el plazo haya vencido sin que el postor subsane—, súbelos aquí. A-LexIA
            evalúa solo esos documentos sobre los resultados de la primera acta, sin volver a evaluar las ofertas, y
            actualiza el resultado y el acta.
          </p>
          <div className="mt-4 space-y-4">
            {filas.map((f) => {
              const k = clave(f);
              const sinSubsanar = f.tipo === 'subsanacion' && noSubsanaron.has(f.postor.postor);
              return (
                <div key={k} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">{f.postor.postor}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{ETIQUETA[f.tipo]}</p>
                  {f.detalle.length > 0 && (
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
                      {f.detalle.slice(0, 6).map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3">
                    {sinSubsanar ? (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Se registrará que no presentó la subsanación: lo observado pasa a no cumplir.
                      </p>
                    ) : (
                      <PdfDropzone
                        folder="evaluations/ronda"
                        value={subidos[k] ?? null}
                        onChange={(v) => setSubidos((s) => ({ ...s, [k]: v }))}
                        label={ETIQUETA[f.tipo]}
                        compact
                        dividir
                      />
                    )}
                  </div>
                  {f.tipo === 'subsanacion' && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={sinSubsanar}
                        onChange={(e) =>
                          setNoSubsanaron((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(f.postor.postor);
                            else n.delete(f.postor.postor);
                            return n;
                          })
                        }
                      />
                      No presentó la subsanación en el plazo
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={evaluar} disabled={!puede}>
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
              Evaluar los documentos nuevos
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
