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
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type {
  PlantillaRequerimiento,
  Seccion,
  Bloque,
} from '@/lib/generadores/plantilla-tipos';
import type {
  RespuestasRequerimiento,
  Falta,
  Aviso,
  ApartadoExtra,
  DestinoRespuesta,
} from '@/lib/generadores/ensamblador';
import {
  apartadosOrdenados,
  campoOpcionPropia,
  nuevoIdExtra,
} from '@/lib/generadores/ensamblador';
import {
  anclaApartado,
  anclaBloque,
  construirIndice,
  resumenIndice,
} from '@/lib/generadores/indice';
import {
  ControlCampo,
  ControlOpcion,
  ControlParrafo,
  ControlRedactado,
  ControlTabla,
  TextoFijo,
} from './bloques';
import { RevisionGlobal } from './revision-global';
import { CargarProyecto } from './cargar-proyecto';
import { ApartadoPropio } from './apartado-propio';
import { IndiceDocumento } from './indice-documento';

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
  const [r, setR] = useState<RespuestasRequerimiento>(inicial.respuestas);
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(true);

  const condiciones = useMemo(() => condicionesDe(plantilla.secciones), [plantilla]);

  // ── Guardado ────────────────────────────────────────────────────────
  // Se agrupa el guardado en vez de disparar uno por tecla: escribir un
  // párrafo largo lanzaría cientos de peticiones.
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef({ denominacion, cuantia, r });
  ultimo.current = { denominacion, cuantia, r };

  const guardar = useCallback(async () => {
    setGuardando(true);
    const v = ultimo.current;
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denominacion: v.denominacion,
          // Se manda tal cual: el servidor la interpreta con el mismo
          // analizador que lee los importes de las plantillas. Antes se
          // convertía aquí con Number(), y "100,000.00" salía NaN, la
          // petición devolvía 400 y no se guardaba nada de lo escrito.
          cuantia: v.cuantia.trim() || null,
          respuestas: v.r,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // El servidor avisa de lo que no pudo interpretar —una cuantía mal
      // escrita, por ejemplo—. Sin esto el usuario ve "Guardado" y el
      // dato no está, que es justo la queja que hubo.
      const guardado = (await res.json().catch(() => null)) as { avisos?: string[] } | null;
      for (const aviso of guardado?.avisos ?? []) toast.warning(aviso);

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
    // La denominación del expediente y la del numeral 1 son la misma:
    // se escribe en el documento y el expediente la sigue. Antes se
    // pedía tres veces —al crear, en el expediente y en el numeral 1—.
    if (k === 'denominacion') setDenominacion(v);
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
  /** Escribe un texto donde corresponda, venga de donde venga. */
  const escribirEn = (destino: DestinoRespuesta, bloqueId: string, texto: string) => {
    if (destino === 'campos') setCampo(bloqueId, texto);
    else if (destino === 'redacciones') setRedaccion(bloqueId, texto);
    else cambiarExtra(bloqueId, { texto });
  };

  // ── Apartados propios y su colocación ───────────────────────────────

  const cambiarExtra = (idExtra: string, cambio: Partial<ApartadoExtra>) => {
    setR((p) => ({
      ...p,
      extras: p.extras.map((e) => (e.id === idExtra ? { ...e, ...cambio } : e)),
    }));
    marcarSucio();
  };

  const anadirExtra = () => {
    setR((p) => {
      const extra: ApartadoExtra = { id: nuevoIdExtra(p.extras), titulo: '', texto: '' };
      // Se coloca al final del orden vigente; desde ahí el usuario lo
      // sube a donde quiera.
      const orden = apartadosOrdenados(plantilla, p).map((a) => a.id);
      return { ...p, extras: [...p.extras, extra], orden: [...orden, extra.id] };
    });
    marcarSucio();
  };

  const borrarExtra = (idExtra: string) => {
    setR((p) => ({
      ...p,
      extras: p.extras.filter((e) => e.id !== idExtra),
      orden: p.orden.filter((x) => x !== idExtra),
    }));
    marcarSucio();
  };

  /**
   * Sube o baja un apartado de primer nivel.
   *
   * Se intercambia con el siguiente apartado VISIBLE, no con el
   * siguiente de la lista: si en medio hay una sección apagada por su
   * condición, saltársela es lo que el usuario espera —de lo contrario
   * pulsa y no se mueve nada—.
   */
  const mover = (idApartado: string, direccion: -1 | 1) => {
    setR((p) => {
      const orden = apartadosOrdenados(plantilla, p);
      const visible = (a: (typeof orden)[number]) =>
        a.tipo === 'extra' || !a.seccion.condicion || p.condiciones[a.seccion.condicion];
      const i = orden.findIndex((a) => a.id === idApartado);
      if (i < 0) return p;
      let j = i + direccion;
      while (j >= 0 && j < orden.length && !visible(orden[j])) j += direccion;
      if (j < 0 || j >= orden.length) return p;
      const ids = orden.map((a) => a.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return { ...p, orden: ids };
    });
    marcarSucio();
  };

  /**
   * Apartados plegados.
   *
   * Un requerimiento entero es una lista vertical larguísima —solo la
   * garantía de la prestación trae tres textos invariables seguidos— y
   * recorrerla para llegar a un apartado concreto es el problema que
   * César describió. Se pliegan por apartado, y el índice despliega
   * solo el que necesita antes de saltar.
   *
   * No se guarda en la base: es cómo mira el documento cada uno, no
   * parte del documento.
   */
  const [plegados, setPlegados] = useState<Set<string>>(new Set());

  const alternarPliegue = (idApartado: string) =>
    setPlegados((p) => {
      const n = new Set(p);
      if (n.has(idApartado)) n.delete(idApartado);
      else n.add(idApartado);
      return n;
    });

  const desplegar = useCallback((idApartado: string) => {
    setPlegados((p) => {
      if (!p.has(idApartado)) return p;
      const n = new Set(p);
      n.delete(idApartado);
      return n;
    });
  }, []);

  /** Vuelve al orden del formato oficial, sin borrar nada. */
  const restaurarOrden = () => {
    setR((p) => ({ ...p, orden: [] }));
    marcarSucio();
  };

  /**
   * Escribe de una vez el reparto de un proyecto cargado.
   *
   * Un solo `setR` en lugar de uno por apartado: veinte llamadas
   * sueltas encadenan veinte pintadas y veinte guardados.
   */
  const aplicarLote = (
    cambios: Array<{ destino: DestinoRespuesta; bloqueId: string; texto: string }>,
    condicionesEncendidas: string[],
  ) => {
    setR((p) => {
      const campos = { ...p.campos };
      const redacciones = { ...p.redacciones };
      let extras = p.extras;
      for (const c of cambios) {
        if (c.destino === 'campos') campos[c.bloqueId] = c.texto;
        else if (c.destino === 'redacciones') redacciones[c.bloqueId] = c.texto;
        else extras = extras.map((e) => (e.id === c.bloqueId ? { ...e, texto: c.texto } : e));
      }
      const condiciones = { ...p.condiciones };
      for (const k of condicionesEncendidas) condiciones[k] = true;
      return { ...p, campos, redacciones, extras, condiciones };
    });
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
            textoPropio={r.campos[campoOpcionPropia(b.id)] ?? ''}
            onTextoPropio={(v) => setCampo(campoOpcionPropia(b.id), v)}
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
          // Advertencia del formato oficial. En rojo, no en ámbar: es
          // una condición que si se pasa por alto invalida el
          // requerimiento, no un consejo. Petición de César del
          // 18/08/2026.
          <p
            key={clave}
            className="flex gap-2 rounded-md border-l-2 border-destructive/70 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive dark:bg-destructive/10"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{b.texto}</span>
          </p>
        );
      case 'fijo':
        // Texto invariable: se muestra para que el usuario sepa que
        // estará en el documento, pero no es editable. Ese es justo el
        // punto de la plantilla.
        return <TextoFijo key={clave} texto={b.texto} />;
      default:
        return null;
    }
  };

  const pintarSeccion = (s: Seccion, numero: string, nivel: number) => {
    if (s.condicion && !r.condiciones[s.condicion]) return null;
    const utiles = s.bloques.filter((b) => b.clase !== 'titulo');
    return (
      <div
        key={s.id}
        // El ancla de primer nivel la pone la envoltura que además
        // lleva los controles de colocación; aquí solo las hijas, para
        // no repetir un id en el documento.
        id={nivel > 1 ? anclaApartado(s.id) : undefined}
        className={cn('scroll-mt-24 transition', nivel > 1 && 'border-l pl-4')}
      >
        <h3
          className={cn(
            'font-semibold',
            nivel === 1 ? 'text-base' : 'text-sm text-muted-foreground',
          )}
        >
          {numero}. {s.titulo}
        </h3>
        {utiles.length > 0 && (
          <div className="mt-3 space-y-4">
            {utiles.map((b, i) => {
              // El ancla la lleva la envoltura, no el control: un
              // párrafo con huecos no tiene id propio y una tabla
              // tampoco expone uno en el DOM.
              const idBloque =
                b.clase === 'parrafo'
                  ? b.campos[0]?.id
                  : 'id' in b && typeof b.id === 'string'
                    ? b.id
                    : undefined;
              return (
                <div
                  key={`${s.id}-${i}`}
                  id={idBloque ? anclaBloque(idBloque) : undefined}
                  className="scroll-mt-24 transition"
                >
                  {bloqueVisible(b, `${s.id}-${i}`)}
                </div>
              );
            })}
          </div>
        )}
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

  /**
   * Los apartados de primer nivel, en su orden y con su número.
   *
   * La numeración se calcula igual que en el ensamblador —solo cuentan
   * los que salen— para que el número que se ve en pantalla sea el que
   * saldrá en el Word.
   */
  const apartados = useMemo(() => {
    let n = 0;
    return apartadosOrdenados(plantilla, r)
      .filter(
        (a) => a.tipo === 'extra' || !a.seccion.condicion || r.condiciones[a.seccion.condicion],
      )
      .map((a) => ({ apartado: a, numero: String(++n) }));
  }, [plantilla, r]);

  // El índice se calcula aquí y no en el servidor: tiene que ponerse en
  // verde según se escribe, no en el siguiente guardado.
  const indice = useMemo(() => construirIndice(plantilla, r), [plantilla, r]);
  const resumen = useMemo(() => resumenIndice(indice), [indice]);

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
            {denominacion.trim() && (
              <p className="mt-0.5 max-w-xl truncate text-xs text-muted-foreground">
                {denominacion}
              </p>
            )}
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
            <h2 className="text-sm font-semibold">Datos del expediente</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              La denominación de la contratación se escribe una sola vez, en el numeral 1 del
              documento; aquí no se repite.
            </p>
            <div className="mt-4 max-w-xs">
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
                placeholder="S/ 100,000.00"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Sin este dato no se pueden verificar los topes de experiencia. Se admite escribirla
                con separadores.
              </p>
            </div>
          </Card>

          <CargarProyecto id={id} onAplicar={aplicarLote} />

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
            {apartados.map(({ apartado, numero }, i) => {
              const plegado = plegados.has(apartado.id);
              const titulo =
                apartado.tipo === 'extra'
                  ? apartado.extra.titulo.trim() || 'Apartado adicional'
                  : apartado.seccion.titulo;
              return (
                <div
                  key={apartado.id}
                  id={anclaApartado(apartado.id)}
                  className="group/apartado relative scroll-mt-24 transition"
                >
                  {/* Plegar y colocar. Cada entidad ordena el documento
                      como le conviene, y no tiene por qué recorrerlo
                      entero para llegar a un apartado. */}
                  <div className="absolute -top-1 right-0 z-10 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover/apartado:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={i === 0}
                      title="Subir este apartado"
                      aria-label={`Subir ${numero}`}
                      onClick={() => mover(apartado.id, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={i === apartados.length - 1}
                      title="Bajar este apartado"
                      aria-label={`Bajar ${numero}`}
                      onClick={() => mover(apartado.id, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {plegado ? (
                    <button
                      type="button"
                      onClick={() => alternarPliegue(apartado.id)}
                      className="flex w-full items-center gap-2 rounded-md py-1 pr-16 text-left text-base font-semibold hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        {numero}. {titulo}
                      </span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => alternarPliegue(apartado.id)}
                        title="Plegar este apartado"
                        aria-label={`Plegar ${numero}`}
                        className="absolute -left-5 top-1 hidden text-muted-foreground hover:text-foreground group-hover/apartado:block"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {apartado.tipo === 'extra' ? (
                        <ApartadoPropio
                          extra={apartado.extra}
                          numero={numero}
                          onChange={(cambio) => cambiarExtra(apartado.id, cambio)}
                          onBorrar={() => borrarExtra(apartado.id)}
                        />
                      ) : (
                        pintarSeccion(apartado.seccion, numero, 1)
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={anadirExtra}>
                <Plus className="mr-1.5 h-4 w-4" />
                Añadir un apartado propio
              </Button>
              {r.orden.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={restaurarOrden}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Volver al orden del formato
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPlegados((p) =>
                    p.size === apartados.length
                      ? new Set()
                      : new Set(apartados.map((a) => a.apartado.id)),
                  )
                }
              >
                {plegados.size === apartados.length ? (
                  <>
                    <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                    Desplegar todo
                  </>
                ) : (
                  <>
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                    Plegar todo
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Los apartados se pliegan y se ordenan con las flechas; el documento se renumera
                solo.
              </span>
            </div>
          </Card>

          <RevisionGlobal
            id={id}
            guardarPrimero={guardar}
            onAplicar={escribirEn}
          />
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

          <IndiceDocumento grupos={indice} resumen={resumen} onDesplegar={desplegar} />

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
