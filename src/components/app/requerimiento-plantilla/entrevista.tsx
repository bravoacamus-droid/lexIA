'use client';

/**
 * "Cuéntame qué necesitas" y LexIA decide qué apartados corresponden.
 *
 * César, trasladando a sus colegas: la estructura les parece correcta
 * "pero llenar uno a uno es un poco tedioso y genera mayor tiempo". En
 * Bienes en General hay treinta y cuatro interruptores que decidir antes
 * de escribir una línea.
 *
 * PROPONE, NO APLICA. Se enseña qué encendería y por qué —una frase por
 * apartado, referida a este caso— y el usuario aplica o no. Cambiar
 * treinta y cuatro interruptores sin enseñarlos antes sería peor que el
 * formulario que viene a sustituir.
 *
 * Lo que LexIA no sabe se queda como está, y lleva al lado la pregunta
 * que lo resolvería —no en una lista aparte al final, que decía lo
 * mismo con otras palabras—. Apagar de más cuesta un clic; encender de
 * más mete en el documento una exigencia que nadie pidió.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2, Check, X, CircleHelp, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Decision {
  id: string;
  titulo: string;
  estado: 'corresponde' | 'no_corresponde' | 'no_se_sabe';
  razon: string;
}

export function Entrevista({
  id,
  onAplicar,
}: {
  id: string;
  /** Enciende y apaga de una vez; el formulario decide cómo guardarlo. */
  onAplicar: (condiciones: Record<string, boolean>) => void;
}) {
  const [relato, setRelato] = useState('');
  const [pensando, setPensando] = useState(false);
  const [decisiones, setDecisiones] = useState<Decision[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [descartados, setDescartados] = useState<Set<string>>(new Set());

  async function preguntar() {
    if (relato.trim().length < 20) {
      toast.error('Cuéntame un poco más', {
        description: 'Con dos o tres líneas sobre qué se contrata y para qué, basta.',
      });
      return;
    }
    setPensando(true);
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}/entrevista`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relato }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('LexIA no pudo leer la necesidad', {
          description: j?.detail ?? j?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setDecisiones(j.decisiones ?? []);
      setDescartados(new Set());
      setAbierto(true);
    } catch (e) {
      toast.error('LexIA no pudo leer la necesidad', { description: (e as Error).message });
    } finally {
      setPensando(false);
    }
  }

  const corresponden = (decisiones ?? []).filter((d) => d.estado === 'corresponde');
  const noCorresponden = (decisiones ?? []).filter((d) => d.estado === 'no_corresponde');
  const dudas = (decisiones ?? []).filter((d) => d.estado === 'no_se_sabe');

  function aplicar() {
    const condiciones: Record<string, boolean> = {};
    for (const d of corresponden) if (!descartados.has(d.id)) condiciones[d.id] = true;
    for (const d of noCorresponden) if (!descartados.has(d.id)) condiciones[d.id] = false;
    onAplicar(condiciones);
    toast.success('Apartados ajustados', {
      description:
        dudas.length > 0
          ? `${Object.keys(condiciones).length} decididos. Los ${dudas.length} sin decidir se quedan como estaban: revísalos.`
          : `${Object.keys(condiciones).length} apartados decididos.`,
    });
    setDecisiones(null);
    setAbierto(false);
  }

  const alternar = (idCond: string) =>
    setDescartados((s) => {
      const n = new Set(s);
      if (n.has(idCond)) n.delete(idCond);
      else n.add(idCond);
      return n;
    });

  const grupos = [
    { titulo: 'Corresponden', lista: corresponden, icono: Check, color: 'text-emerald-600' },
    { titulo: 'No corresponden', lista: noCorresponden, icono: X, color: 'text-muted-foreground' },
  ];

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <h3 className="text-sm font-medium">Cuéntame qué necesitas</h3>
          <p className="text-xs text-muted-foreground">
            En dos o tres líneas: qué se va a contratar, para qué, quién lo usa y dónde. LexIA
            decide qué apartados del formato corresponden y te dice por qué.
          </p>
        </div>
      </div>

      <Textarea
        value={relato}
        onChange={(e) => setRelato(e.target.value)}
        rows={3}
        placeholder="Necesitamos un grupo electrógeno de respaldo para la sede, porque los cortes de energía detienen la atención al público. Se instala en el patio y hay que capacitar al personal de mantenimiento."
        className="resize-y text-sm"
      />

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={preguntar} disabled={pensando}>
          {pensando ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {pensando ? 'Leyendo la necesidad…' : 'Proponer apartados'}
        </Button>
        {decisiones && !abierto && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setAbierto(true)}>
            Ver la propuesta
          </Button>
        )}
      </div>

      {decisiones && abierto && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {corresponden.length} corresponden · {noCorresponden.length} no corresponden ·{' '}
            {dudas.length} sin decidir. Quita el visto a lo que no quieras aplicar.
          </p>

          {grupos.map(({ titulo, lista, icono: Icono, color }) =>
            lista.length === 0 ? null : (
              <div key={titulo} className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {titulo}
                </p>
                {lista.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => alternar(d.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-background',
                      descartados.has(d.id) && 'opacity-40 line-through',
                    )}
                  >
                    <Icono className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', color)} />
                    <span>
                      <span className="font-medium">{d.titulo}</span>
                      {d.razon ? <span className="text-muted-foreground"> — {d.razon}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            ),
          )}

          {dudas.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                {dudas.length} sin decidir, con la pregunta que lo resolvería
              </summary>
              <div className="mt-1 space-y-1">
                {dudas.map((d) => (
                  <p key={d.id} className="flex items-start gap-2 px-2 text-xs">
                    <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      <span className="font-medium">{d.titulo}</span>
                      <span className="text-muted-foreground">
                        {' — '}
                        {d.razon || 'no se deduce de lo que contaste.'}
                      </span>
                    </span>
                  </p>
                ))}
              </div>
            </details>
          )}

          <div className="flex gap-2 border-t pt-2">
            <Button type="button" size="sm" onClick={aplicar}>
              Aplicar a los apartados
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAbierto(false)}>
              Ahora no
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
