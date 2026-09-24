import { AlertTriangle, CheckCircle2, CircleAlert, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import type { SaludDelActualizador } from '@/lib/scraping/salud';

export const ESTADO_CORRIDA: Record<string, { texto: string; clase: string }> = {
  ok: { texto: 'Correcta', clase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  con_errores: { texto: 'Con errores', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  partial: { texto: 'Parcial (tiempo)', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  failed: { texto: 'Fallida', clase: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
  abandonada: { texto: 'Abandonada', clase: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
  running: { texto: 'En curso', clase: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300' },
  prueba_invalida: { texto: 'Prueba local', clase: 'bg-secondary text-muted-foreground' },
};

export function EstadoCorrida({ status }: { status: string }) {
  const e = ESTADO_CORRIDA[status] ?? { texto: status, clase: 'bg-secondary text-muted-foreground' };
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', e.clase)}>{e.texto}</span>;
}

/** El estado del actualizador de la biblioteca, arriba de todo en su página. */
export function SaludActualizador({ s }: { s: SaludDelActualizador }) {
  const Icono = s.nivel === 'ok' ? CheckCircle2 : s.nivel === 'atencion' ? CircleAlert : AlertTriangle;
  return (
    <section className="space-y-4">
      <Card
        className={cn(
          'p-5',
          s.nivel === 'ok' && 'border-emerald-300 dark:border-emerald-900/60',
          s.nivel === 'atencion' && 'border-amber-300 dark:border-amber-900/60',
          s.nivel === 'problema' && 'border-red-400 dark:border-red-900/60',
        )}
      >
        <div className="flex items-start gap-3">
          <Icono
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              s.nivel === 'ok' ? 'text-emerald-600' : s.nivel === 'atencion' ? 'text-amber-600' : 'text-red-600',
            )}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">
              {s.nivel === 'ok' ? 'El actualizador funciona correctamente' : s.nivel === 'atencion' ? 'El actualizador necesita atención' : 'El actualizador tiene un problema'}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {s.ultimaCorrida ? (
                <>
                  Última corrida <RelativeTime date={s.ultimaCorrida} /> · corre cada día a las 03:00 (hora de Lima)
                </>
              ) : (
                'Sin corridas registradas'
              )}
            </p>
            {s.avisos.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] leading-relaxed">
                {s.avisos.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {s.porFuente.map((f) => (
          <Card key={f.fuente} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{f.fuente}</p>
              {f.ultima ? <EstadoCorrida status={f.ultima.status} /> : <EstadoCorrida status="sin corridas" />}
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Trae lo publicado desde el {f.publicadosDesde ? f.publicadosDesde.split('-').reverse().join('/') : '—'}
              {f.ultima && (
                <>
                  {' '}· última corrida <RelativeTime date={f.ultima.started_at} />: {f.ultima.docs_new} nuevos, {f.ultima.docs_existentes} ya estaban,{' '}
                  {f.ultima.docs_fallidos} con error, {f.ultima.docs_en_espera} en espera, {f.ultima.docs_omitidos} anteriores al corte
                </>
              )}
            </p>
            {f.ultima?.error_message && <p className="mt-1.5 text-[12px] text-red-700 dark:text-red-300">{f.ultima.error_message}</p>}
          </Card>
        ))}
      </div>

      {(s.fallosAgotados.length > 0 || s.anterioresAlCorte.length > 0 || s.fallosEnEspera > 0) && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Documentos por atender</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {s.fallosEnEspera} en espera de reintento automático (al día siguiente, a los tres días y a la semana).
          </p>
          {s.fallosAgotados.length > 0 && (
            <>
              <p className="mt-3 text-[12px] font-semibold">Agotaron sus intentos: cargar a mano</p>
              <ul className="mt-1 space-y-1 text-[12px]">
                {s.fallosAgotados.map((f) => (
                  <li key={f.url} className="break-all">
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
                      {f.url.replace('https://www.gob.pe/institucion/oece/', '')}
                    </a>{' '}
                    — {f.motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
          {s.anterioresAlCorte.length > 0 && (
            <>
              <p className="mt-3 text-[12px] font-semibold">Publicados con fecha anterior al corte</p>
              <ul className="mt-1 space-y-1 text-[12px]">
                {s.anterioresAlCorte.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
                      {f.motivo}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </section>
  );
}
