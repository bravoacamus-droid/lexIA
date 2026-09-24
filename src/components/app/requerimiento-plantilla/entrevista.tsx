'use client';

/**
 * «Cuéntame qué necesitas» y A-LexIA genera el requerimiento.
 *
 * César, 23/09/2026: «no vienen generando como lo esperado, no sé cómo
 * podemos mejorar a fin de que su generación sea sencilla». Antes eran
 * dos botones —«Proponer apartados» y «Redactar lo que esté en blanco»—
 * con un «Aplicar» entre medias que, si no se pulsaba, dejaba redactar
 * también lo que la propuesta había descartado. Ahora es uno: decide los
 * apartados, lleva los datos del relato a sus campos y cuadros, y
 * redacta lo que queda en blanco. Ver `generadores/generacion.ts`.
 *
 * Después enseña qué hizo, y todo se puede deshacer desde aquí:
 *
 *   · lo que apagó, con su motivo y un botón para volver a encenderlo;
 *   · lo que no pudo decidir —encendido, como pidió César, y sin
 *     redactar—, con la pregunta al lado y los dos botones para
 *     resolverlo;
 *   · cuántos datos y textos puso.
 *
 * No toca nada de lo que ya estaba escrito.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Loader2,
  CircleHelp,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  FileCheck2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { DestinoRespuesta, RespuestasRequerimiento } from '@/lib/generadores/ensamblador';

interface Apartado {
  id: string;
  titulo: string;
  razon: string;
}

interface Resumen {
  apagados: Apartado[];
  encendidos: Apartado[];
  porDecidir: Apartado[];
  datos: number;
  redactados: number;
  fallidos: number;
  sinUbicar: string[];
}

export interface CambioDeGeneracion {
  destino: DestinoRespuesta;
  bloqueId: string;
  texto: string;
  filas?: string[][];
}

export function Entrevista({
  id,
  respuestas,
  onGenerado,
  onCondicion,
}: {
  id: string;
  /** Lo que tiene el formulario, guardado o no: se genera sobre esto. */
  respuestas: RespuestasRequerimiento;
  /** Coloca de una vez los interruptores y los textos. */
  onGenerado: (condiciones: Record<string, boolean>, cambios: CambioDeGeneracion[]) => void;
  /** Enciende o apaga un apartado desde el resumen. */
  onCondicion: (id: string, valor: boolean) => void;
}) {
  const [relato, setRelato] = useState('');
  const [generando, setGenerando] = useState(false);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  /** Lo que el usuario ya resolvió desde el resumen, para quitarlo de la lista. */
  const [resueltos, setResueltos] = useState<Record<string, boolean>>({});

  async function generar(confirmados?: string[]) {
    if (relato.trim().length < 20) {
      toast.error('Cuéntame un poco más', {
        description: 'Con dos o tres líneas sobre qué se contrata, para qué, dónde y por cuánto tiempo, basta.',
      });
      return;
    }
    setGenerando(true);
    // Al volver a generar con lo confirmado, lo que el usuario ya resolvió
    // se conserva: no tiene que contestarlo otra vez.
    if (!confirmados) {
      setResumen(null);
      setResueltos({});
    }
    const aviso = toast.loading('Generando el requerimiento…', {
      description: 'Decido los apartados, coloco tus datos y redacto lo que falta. Tarda uno o dos minutos.',
    });
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relato,
          respuestas,
          confirmados,
          descartados: confirmados
            ? Object.entries(resueltos)
                .filter(([, v]) => !v)
                .map(([k]) => k)
            : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('No se pudo generar', {
          id: aviso,
          description: j?.detail ?? j?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      onGenerado(j.condiciones ?? {}, j.cambios ?? []);
      setResumen(j.resumen);
      toast.success('Requerimiento generado', {
        id: aviso,
        description: 'Revisa el resumen: lo que queda por completar está marcado en el índice.',
      });
    } catch (e) {
      toast.error('No se pudo generar', { id: aviso, description: (e as Error).message });
    } finally {
      setGenerando(false);
    }
  }

  const resolver = (idCond: string, valor: boolean) => {
    onCondicion(idCond, valor);
    setResueltos((r) => ({ ...r, [idCond]: valor }));
  };

  const porDecidir = (resumen?.porDecidir ?? []).filter((p) => !(p.id in resueltos));
  const confirmadosPendientes = Object.entries(resueltos)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .filter((k) => !(resumen?.encendidos ?? []).some((e) => e.id === k));
  const apagados = resumen?.apagados ?? [];

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <h3 className="text-sm font-medium">Cuéntame qué necesitas</h3>
          <p className="text-xs text-muted-foreground">
            Qué se va a contratar, para qué, dónde, por cuánto tiempo y con qué personal o equipos.
            A-LexIA decide qué apartados del formato corresponden, coloca tus datos y redacta lo que
            falta. No toca lo que ya escribiste.
          </p>
        </div>
      </div>

      <Textarea
        value={relato}
        onChange={(e) => setRelato(e.target.value)}
        rows={4}
        placeholder="Necesitamos el servicio de limpieza de la sede central, en Jr. 28 de Julio 101, por 12 meses, con 6 operarios de lunes a sábado de 7:00 a 15:00. El contratista pone los materiales y equipos. El pago es mensual."
        className="resize-y text-sm"
      />

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => generar()} disabled={generando}>
          {generando ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {generando ? 'Generando…' : 'Generar requerimiento'}
        </Button>
        {generando && (
          <span className="text-xs text-muted-foreground">Tarda uno o dos minutos.</span>
        )}
      </div>

      {resumen && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-xs">
          <p className="flex items-start gap-2">
            <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              Coloqué <strong>{resumen.datos}</strong> {resumen.datos === 1 ? 'dato' : 'datos'} de tu
              relato y redacté <strong>{resumen.redactados}</strong>{' '}
              {resumen.redactados === 1 ? 'apartado' : 'apartados'}.
              {apagados.length > 0 && (
                <>
                  {' '}
                  Apagué <strong>{apagados.length}</strong> que no corresponden.
                </>
              )}
              {resumen.fallidos > 0 && (
                <> {resumen.fallidos} no salieron: siguen en blanco.</>
              )}{' '}
              Son borradores: léelos en su sitio. Lo que falta está en rojo en el índice.
            </span>
          </p>

          {confirmadosPendientes.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-1.5 dark:border-emerald-900 dark:bg-emerald-950/30">
              <span>
                Confirmaste {confirmadosPendientes.length}{' '}
                {confirmadosPendientes.length === 1 ? 'apartado' : 'apartados'}. ¿Los redacto?
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={generando}
                onClick={() => generar(confirmadosPendientes)}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Redactar los que confirmaste
              </Button>
            </div>
          )}

          {porDecidir.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-medium uppercase tracking-wide text-muted-foreground">
                Decide tú si corresponden ({porDecidir.length})
              </p>
              <p className="text-muted-foreground">
                Siguen encendidos y sin redactar: rellenarlos sin saberlo sería añadir exigencias que
                nadie pidió.
              </p>
              {porDecidir.map((d) => (
                <div key={d.id} className="flex items-start gap-2 rounded-md bg-background px-2 py-1.5">
                  <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{d.titulo}</span>
                    {d.razon ? <span className="text-muted-foreground"> — {d.razon}</span> : null}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => resolver(d.id, true)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Sí
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => resolver(d.id, false)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      No
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {apagados.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 font-medium uppercase tracking-wide text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                Apagados porque no corresponden ({apagados.length})
              </summary>
              <div className="mt-1 space-y-1">
                {apagados.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 px-2 py-1">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{d.titulo}</span>
                      {d.razon ? <span className="text-muted-foreground"> — {d.razon}</span> : null}
                    </span>
                    {resueltos[d.id] === true ? (
                      <span className="shrink-0 text-emerald-700">Encendido</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 shrink-0 px-2 text-[11px]"
                        onClick={() => resolver(d.id, true)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Encender
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {resumen.sinUbicar.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 font-medium uppercase tracking-wide text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                De tu relato, sin sitio en el formato ({resumen.sinUbicar.length})
              </summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-6 text-muted-foreground">
                {resumen.sinUbicar.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
