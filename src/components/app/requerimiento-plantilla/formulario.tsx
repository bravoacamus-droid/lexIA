'use client';

/**
 * Formulario de requerimiento generado desde la plantilla.
 *
 * Recorre las secciones de la plantilla y pinta el control que
 * corresponde a cada bloque. No hay ningún campo escrito a mano aquí: al
 * codificar las catorce plantillas restantes, esta pantalla las soporta
 * sin cambios.
 *
 * El panel derecho muestra lo que devuelve el servidor —qué falta, qué
 * topes se incumplen, qué secciones quedaron fuera— y no lo recalcula por
 * su cuenta, para que el aviso que ve el usuario sea exactamente el que
 * se aplica al exportar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileDown,
  AlertTriangle,
  CircleAlert,
  EyeOff,
  Check,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  PlantillaRequerimiento,
  Seccion,
  Bloque,
} from '@/lib/generadores/plantilla-tipos';
import type { RespuestasRequerimiento, Falta, Aviso } from '@/lib/generadores/ensamblador';
import {
  ControlCampo,
  ControlOpcion,
  ControlParrafo,
  ControlRedactado,
  ControlTabla,
} from './bloques';

interface Estado {
  faltantes: Falta[];
  avisos: Aviso[];
  omitidas: string[];
}

interface Props {
  id: string;
  plantilla: PlantillaRequerimiento;
  inicial: {
    denominacion: string;
    cuantia: number | null;
    monto_contrato: number | null;
    respuestas: RespuestasRequerimiento;
  };
  estadoInicial: Estado;
}

/** Reúne las condiciones declaradas en la plantilla, con su título. */
function condicionesDe(secciones: Seccion[], acc: Array<{ id: string; titulo: string }> = []) {
  for (const s of secciones) {
    if (s.condicion && !acc.some((c) => c.id === s.condicion)) {
      acc.push({ id: s.condicion, titulo: s.titulo });
    }
    if (s.subsecciones) condicionesDe(s.subsecciones, acc);
  }
  return acc;
}

export function FormularioRequerimiento({ id, plantilla, inicial, estadoInicial }: Props) {
  const [denominacion, setDenominacion] = useState(inicial.denominacion);
  const [cuantia, setCuantia] = useState(inicial.cuantia?.toString() ?? '');
  const [montoContrato, setMontoContrato] = useState(inicial.monto_contrato?.toString() ?? '');
  const [r, setR] = useState<RespuestasRequerimiento>(inicial.respuestas);
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(true);

  const condiciones = useMemo(() => condicionesDe(plantilla.secciones), [plantilla]);

  // ── Guardado ────────────────────────────────────────────────────────
  // Se agrupa el guardado en vez de disparar uno por tecla: escribir un
  // párrafo largo lanzaría cientos de peticiones.
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef({ denominacion, cuantia, montoContrato, r });
  ultimo.current = { denominacion, cuantia, montoContrato, r };

  const guardar = useCallback(async () => {
    setGuardando(true);
    const v = ultimo.current;
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denominacion: v.denominacion,
          cuantia: v.cuantia ? Number(v.cuantia) : null,
          monto_contrato: v.montoContrato ? Number(v.montoContrato) : null,
          respuestas: v.r,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Se relee el estado del servidor: los avisos de topes dependen de
      // la cuantía, que también acaba de cambiar.
      const detalle = await fetch(`/api/generadores/requerimientos/${id}`, {
        cache: 'no-store',
      });
      if (detalle.ok) {
        // Se comprueba la forma antes de guardarla: un `estado` ausente
        // dejaba el componente con undefined y la siguiente pintada
        // reventaba en estado.avisos, que es justo la pantalla en blanco
        // sin información que reportó César.
        const j = (await detalle.json()) as { estado?: Partial<Estado> };
        if (j?.estado && Array.isArray(j.estado.avisos)) {
          setEstado({
            faltantes: j.estado.faltantes ?? [],
            avisos: j.estado.avisos ?? [],
            omitidas: j.estado.omitidas ?? [],
          });
        }
      }
      setGuardado(true);
    } catch (e) {
      toast.error('No se pudo guardar', { description: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }, [id]);

  const marcarSucio = useCallback(() => {
    setGuardado(false);
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = setTimeout(guardar, 1200);
  }, [guardar]);

  useEffect(() => {
    return () => {
      if (pendiente.current) clearTimeout(pendiente.current);
    };
  }, []);

  // ── Mutadores ───────────────────────────────────────────────────────
  const setCampo = (k: string, v: string) => {
    setR((p) => ({ ...p, campos: { ...p.campos, [k]: v } }));
    marcarSucio();
  };
  const setRedaccion = (k: string, v: string) => {
    setR((p) => ({ ...p, redacciones: { ...p.redacciones, [k]: v } }));
    marcarSucio();
  };
  const setOpcion = (k: string, v: string) => {
    setR((p) => ({ ...p, opciones: { ...p.opciones, [k]: v } }));
    marcarSucio();
  };
  const setTabla = (k: string, v: string[][]) => {
    setR((p) => ({ ...p, tablas: { ...p.tablas, [k]: v } }));
    marcarSucio();
  };
  const setCondicion = (k: string, v: boolean) => {
    setR((p) => ({ ...p, condiciones: { ...p.condiciones, [k]: v } }));
    marcarSucio();
  };

  /**
   * Pide a LexIA el texto de un apartado.
   *
   * Cuando el apartado ya tiene texto, se envia: el modelo lo mejora en
   * vez de escribir otro. Antes no se enviaba nunca y el boton
   * descartaba en silencio lo que habia escrito el area usuaria.
   */
  async function redactar(
    bloqueId: string,
    aporte: string,
    textoActual: string,
  ): Promise<string | null> {
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}/redactar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloque_id: bloqueId,
          aporte,
          texto_actual: textoActual.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('LexIA no pudo redactar este apartado', {
          description: j?.detail ?? j?.error ?? `HTTP ${res.status}`,
        });
        return null;
      }
      if (!j.con_sustento) {
        toast.warning(
          j.modo === 'mejorado' ? 'Mejorado sin sustento normativo' : 'Redactado sin sustento normativo',
          {
            description: 'No se encontró norma aplicable en la biblioteca; revisa las citas.',
          },
        );
      }
      return j.texto as string;
    } catch (e) {
      toast.error('Fallo al redactar', { description: (e as Error).message });
      return null;
    }
  }

  // ── Pintado ─────────────────────────────────────────────────────────
  const bloqueVisible = (b: Bloque, clave: string) => {
    switch (b.clase) {
      case 'campo':
        return (
          <ControlCampo
            key={clave}
            bloque={b}
            valor={r.campos[b.id] ?? ''}
            onChange={(v) => setCampo(b.id, v)}
            onMejorar={
              b.tipo === 'texto_largo'
                ? (aporte, textoActual) => redactar(b.id, aporte, textoActual)
                : undefined
            }
          />
        );
      case 'parrafo':
        return (
          <ControlParrafo key={clave} bloque={b} valores={r.campos} onChange={setCampo} />
        );
      case 'opcion':
        return (
          <ControlOpcion
            key={clave}
            bloque={b}
            valor={r.opciones[b.id] ?? ''}
            onChange={(v) => setOpcion(b.id, v)}
          />
        );
      case 'redactado':
        return (
          <ControlRedactado
            key={clave}
            bloque={b}
            valor={r.redacciones[b.id] ?? ''}
            onChange={(v) => setRedaccion(b.id, v)}
            onRedactar={(aporte, textoActual) => redactar(b.id, aporte, textoActual)}
          />
        );
      case 'tabla':
        return (
          <ControlTabla
            key={clave}
            bloque={b}
            filas={r.tablas[b.id] ?? []}
            onChange={(f) => setTabla(b.id, f)}
          />
        );
      case 'nota':
        return (
          <p
            key={clave}
            className="rounded-md border-l-2 border-amber-400/60 bg-amber-50/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground dark:bg-amber-950/20"
          >
            {b.texto}
          </p>
        );
      case 'fijo':
        // Texto invariable: se muestra para que el usuario sepa que
        // estará en el documento, pero no es editable. Ese es justo el
        // punto de la plantilla.
        return (
          <div
            key={clave}
            className="rounded-md bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
          >
            <span className="mb-1 block font-medium uppercase tracking-wide">
              Texto obligatorio del formato
            </span>
            {b.texto.length > 320 ? `${b.texto.slice(0, 320)}…` : b.texto}
          </div>
        );
      default:
        return null;
    }
  };

  const pintarSeccion = (s: Seccion, numero: string, nivel: number) => {
    if (s.condicion && !r.condiciones[s.condicion]) return null;
    const utiles = s.bloques.filter((b) => b.clase !== 'titulo');
    return (
      <div key={s.id} className={cn(nivel > 1 && 'border-l pl-4')}>
        <h3
          className={cn(
            'font-semibold',
            nivel === 1 ? 'text-base' : 'text-sm text-muted-foreground',
          )}
        >
          {numero}. {s.titulo}
        </h3>
        {utiles.length > 0 && <div className="mt-3 space-y-4">{utiles.map((b, i) => bloqueVisible(b, `${s.id}-${i}`))}</div>}
        {s.subsecciones && s.subsecciones.length > 0 && (
          <div className="mt-4 space-y-5">
            {s.subsecciones
              .filter((h) => !h.condicion || r.condiciones[h.condicion])
              .map((h, i) => pintarSeccion(h, `${numero}.${i + 1}`, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  const errores = estado.avisos.filter((a) => a.nivel === 'error');
  const advertencias = estado.avisos.filter((a) => a.nivel === 'advertencia');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Cabecera */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/generador/requerimiento-plantilla">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Requerimientos
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{plantilla.encabezado}</h1>
            <p className="text-xs text-muted-foreground">{plantilla.subtitulo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {guardando ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
              </>
            ) : guardado ? (
              <>
                <Check className="h-3 w-3" /> Guardado
              </>
            ) : (
              'Sin guardar'
            )}
          </span>
          <a href={`/api/generadores/requerimientos/${id}/export?format=docx`}>
            <Button size="sm">
              <FileDown className="mr-1.5 h-4 w-4" />
              Descargar Word
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Formulario */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Datos del expediente</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label htmlFor="denominacion" className="text-sm font-medium">
                  Denominación de la contratación
                </Label>
                <Input
                  id="denominacion"
                  value={denominacion}
                  onChange={(e) => {
                    setDenominacion(e.target.value);
                    marcarSucio();
                  }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="cuantia" className="text-sm font-medium">
                  Cuantía de la contratación
                </Label>
                <Input
                  id="cuantia"
                  value={cuantia}
                  onChange={(e) => {
                    setCuantia(e.target.value);
                    marcarSucio();
                  }}
                  inputMode="decimal"
                  placeholder="S/"
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Sin este dato no se pueden verificar los topes de experiencia.
                </p>
              </div>
              <div>
                <Label htmlFor="monto" className="text-sm font-medium">
                  Monto del contrato
                </Label>
                <Input
                  id="monto"
                  value={montoContrato}
                  onChange={(e) => {
                    setMontoContrato(e.target.value);
                    marcarSucio();
                  }}
                  inputMode="decimal"
                  placeholder="S/"
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          {/* Qué apartados aplican */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Qué apartados corresponden</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              El formato oficial marca estos apartados como &ldquo;de corresponder&rdquo;. Los que
              dejes apagados no aparecen en el documento.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {condiciones.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span>{c.titulo}</span>
                  <Switch
                    checked={r.condiciones[c.id] ?? false}
                    onCheckedChange={(v) => setCondicion(c.id, v)}
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card className="space-y-8 p-5">
            {plantilla.secciones
              .filter((s) => !s.condicion || r.condiciones[s.condicion])
              .map((s, i) => pintarSeccion(s, String(i + 1), 1))}
          </Card>
        </div>

        {/* Estado del documento */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {errores.length > 0 && (
            <Card className="border-destructive/40 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                <CircleAlert className="h-4 w-4" />
                Topes incumplidos ({errores.length})
              </h3>
              <ul className="mt-2 space-y-2">
                {errores.map((a, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    {a.mensaje}
                    <span className="mt-0.5 block text-muted-foreground">{a.fundamento}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {advertencias.length > 0 && (
            <Card className="border-amber-400/40 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                No se pudo verificar
              </h3>
              <ul className="mt-2 space-y-2">
                {advertencias.map((a, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    {a.mensaje}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="text-sm font-semibold">
              Pendientes{' '}
              <Badge variant={estado.faltantes.length ? 'danger' : 'secondary'}>
                {estado.faltantes.length}
              </Badge>
            </h3>
            {estado.faltantes.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No falta ningún dato obligatorio.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {estado.faltantes.map((f, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    <span className="font-medium">{f.etiqueta}</span>
                    <span className="block text-muted-foreground">{f.seccion}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {estado.omitidas.length > 0 && (
            <Card className="p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <EyeOff className="h-4 w-4" />
                Fuera del documento ({estado.omitidas.length})
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {estado.omitidas.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
