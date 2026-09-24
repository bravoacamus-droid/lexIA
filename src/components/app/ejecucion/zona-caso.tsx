'use client';

/**
 * Zona 1 — Caso: quién emite, qué actuación se identificó, en qué estado
 * está el contrato y qué se pidió.
 */
import { Sparkles } from 'lucide-react';
import { ACTUACIONES, PERFILES, TIPOS_CONTRATACION } from '@/lib/ejecucion/catalogo';
import type { ActuacionDelExpediente } from '@/lib/ejecucion/estado';
import type { Ficha } from '@/lib/ejecucion/tipos';
import { ICONO_PERFIL } from './perfiles';
import { Zona } from './zona';

function fecha(v?: string) {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v;
}

export function ZonaCaso({ act, ficha }: { act: ActuacionDelExpediente; ficha: Ficha }) {
  const a = act.analisis;
  const Icono = ICONO_PERFIL[act.perfil];
  const identificada = a?.actuacion ?? act.actuacion;
  const porLexia = !!a && !a.actuacionPedida;
  const estado: Array<[string, string | undefined]> = [
    ['Tipo de contratación', a?.tipo ? TIPOS_CONTRATACION[a.tipo] : ficha.tipo_contratacion?.valor],
    ['Régimen', a?.regimen.clave === 'por_determinar' ? 'Por determinar' : a?.regimen.clave === 'ley_30225' ? 'Ley N.° 30225 (régimen anterior)' : a ? 'Ley N.° 32069 y su Reglamento' : undefined],
    ['Monto vigente', ficha.monto_vigente?.valor ?? ficha.monto_original?.valor],
    ['Plazo', ficha.plazo_dias?.valor ? `${ficha.plazo_dias.valor} días` : undefined],
    ['Inicio', fecha(ficha.fecha_inicio?.valor)],
  ];
  return (
    <Zona numero="1" titulo="Caso" bajada="Quién emite, qué hay que resolver y en qué está el contrato.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-secondary/40 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil emisor</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13.5px] font-semibold">
            <Icono className="h-4 w-4 text-generar-600" />
            {PERFILES[act.perfil].nombre}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/40 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Actuación</p>
          <p className="mt-1 text-[13.5px] font-semibold">{identificada ? ACTUACIONES[identificada].nombre : 'Por identificar'}</p>
          {porLexia && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-generar-700 dark:text-generar-400">
              <Sparkles className="h-3 w-3" /> identificada por A-LexIA
            </p>
          )}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Estado del contrato</p>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
          {estado.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{k}</dt>
              <dd className="truncate font-medium">{v || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
      {act.pedido && (
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Lo que pediste</p>
          <p className="mt-1 whitespace-pre-line text-pretty text-[13px] leading-relaxed text-foreground/90">{act.pedido}</p>
        </div>
      )}
      {a?.entendimiento && (
        <div className="rounded-lg border border-generar-200 bg-generar-50/50 p-3 dark:border-generar-900/60 dark:bg-generar-900/15">
          <p className="text-[12px] font-semibold text-generar-800 dark:text-generar-300">Lo que entiende A-LexIA</p>
          <p className="mt-1 text-pretty text-[13px] leading-relaxed">{a.entendimiento}</p>
        </div>
      )}
    </Zona>
  );
}
