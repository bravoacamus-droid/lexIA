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
import type { ReactNode } from 'react';
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
  MarcadorLista,
} from '@/lib/generadores/ensamblador';
import {
  apartadosOrdenados,
  hijasOrdenadas,
  // Se renombra: aquí `bloqueVisible` ya es la función que PINTA un
  // bloque, y esta decide si el bloque existe.
  bloqueVisible as bloqueAplica,
  campoOpcionPropia,
  nuevoIdExtra,
} from '@/lib/generadores/ensamblador';
import {
  anclaApartado,
  anclaBloque,
  construirIndice,
  resumenIndice,
} from '@/lib/generadores/indice';
import type { RevisionTabla } from '@/lib/generadores/revisor-tabla';
import {
  ControlCampo,
  ControlOpcion,
  ControlParrafo,
  ControlRedactado,
  ControlTabla,
  ControlTablaRepetible,
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

export function FormularioRequerimiento({ id, plantilla, inicial, estadoInicial }: Props) {
  const [denominacion, setDenominacion] = useState(inicial.denominacion);
  const [cuantia, setCuantia] = useState(inicial.cuantia?.toString() ?? '');
  const [r, setR] = useState<RespuestasRequerimiento>(inicial.respuestas);
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(true);


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

  /**
   * Crea un apartado propio.
   *
   * Sin `dentroDe` es de primer nivel y se coloca al final del orden,
   * desde donde el usuario lo sube. Con `dentroDe` cuelga de esa
   * sección y no entra en el orden de primer nivel: su sitio es el de
   * su madre.
   */
  const anadirExtra = (dentroDe?: string) => {
    setR((p) => {
      const extra: ApartadoExtra = {
        id: nuevoIdExtra(p.extras),
        titulo: '',
        texto: '',
        ...(dentroDe ? { dentroDe } : {}),
      };
      if (dentroDe) return { ...p, extras: [...p.extras, extra] };
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
  /**
   * Sube o baja una subsección dentro de su apartado.
   *
   * Observación de César (agosto de 2026): "la funcionalidad de subir y
   * bajar debe añadirse para todos los numerales y no solo para los
   * principales". Se salta lo que está apagado, igual que arriba: mover
   * por encima de un apartado que no va a salir en el documento
   * confunde, porque el número no cambia.
   */
  const moverHija = (madre: Seccion, idHija: string, direccion: -1 | 1) => {
    setR((p) => {
      const hijas = hijasOrdenadas(madre, p);
      const visible = (h: Seccion) => !h.condicion || p.condiciones[h.condicion];
      const i = hijas.findIndex((h) => h.id === idHija);
      if (i < 0) return p;
      let j = i + direccion;
      while (j >= 0 && j < hijas.length && !visible(hijas[j])) j += direccion;
      if (j < 0 || j >= hijas.length) return p;
      const ids = hijas.map((h) => h.id);
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return { ...p, ordenHijas: { ...p.ordenHijas, [madre.id]: ids } };
    });
    marcarSucio();
  };

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
    cambios: Array<{
      destino: DestinoRespuesta;
      bloqueId: string;
      texto: string;
      /** Cuando el apartado es un cuadro. */
      filas?: string[][];
    }>,
    condicionesEncendidas: string[],
  ) => {
    setR((p) => {
      const campos = { ...p.campos };
      const redacciones = { ...p.redacciones };
      const tablas = { ...p.tablas };
      let extras = p.extras;
      for (const c of cambios) {
        if (c.destino === 'campos') campos[c.bloqueId] = c.texto;
        else if (c.destino === 'redacciones') redacciones[c.bloqueId] = c.texto;
        else if (c.destino === 'tablas') {
          // El cuadro del proyecto se añade a lo que ya haya escrito la
          // entidad, detrás y sin pisarlo: si alguien ya puso dos
          // penalidades a mano, no se las borra el reparto.
          const previas = (p.tablas[c.bloqueId] ?? []).filter((f) => f.some((x) => x.trim()));
          tablas[c.bloqueId] = [...previas, ...(c.filas ?? [])];
        } else extras = extras.map((e) => (e.id === c.bloqueId ? { ...e, texto: c.texto } : e));
      }
      const condiciones = { ...p.condiciones };
      for (const k of condicionesEncendidas) condiciones[k] = true;
      return { ...p, campos, redacciones, tablas, extras, condiciones };
    });
    marcarSucio();
  };

  /** El título propio de un numeral que admite renombrarse. */
  const setTitulo = (id: string, v: string) => {
    setR((p) => ({ ...p, titulos: { ...p.titulos, [id]: v } }));
    marcarSucio();
  };

  /** Los cuadros que la entidad añadió a un bloque repetible. */
  const setGruposTabla = (
    k: string,
    v: Array<{ titulo: string; filas: string[][] }>,
  ) => {
    setR((p) => ({ ...p, gruposTabla: { ...p.gruposTabla, [k]: v } }));
    marcarSucio();
  };

  /** Con qué se marca una lista. Es del documento, así que se guarda. */
  const setMarcador = (k: string, v: MarcadorLista) => {
    setR((p) => ({ ...p, marcadores: { ...p.marcadores, [k]: v } }));
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

  /**
   * Pide a LexIA que revise una tabla.
   *
   * Se manda lo que hay en pantalla, no lo guardado: si no, revisaría la
   * versión de hace unos segundos y las observaciones no cuadrarían con
   * lo que el usuario está viendo.
   */
  async function revisarTabla(bloqueId: string, filas: string[][]) {
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}/revisar-tabla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloque_id: bloqueId, filas }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('LexIA no pudo revisar la tabla', {
          description: j?.detail ?? j?.error ?? `HTTP ${res.status}`,
        });
        return null;
      }
      if (!j.con_sustento && !j.vacio) {
        toast.warning('Revisada sin sustento normativo', {
          description: 'No se encontró norma aplicable en la biblioteca.',
        });
      }
      return j as { observaciones: RevisionTabla['observaciones']; filas: string[][] | null };
    } catch (e) {
      toast.error('Fallo al revisar la tabla', { description: (e as Error).message });
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
          <ControlParrafo
            key={clave}
            bloque={b}
            valores={r.campos}
            onChange={setCampo}
            onRedactar={(campoId, aporte, actual) => redactar(campoId, aporte, actual)}
          />
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
            marcador={r.marcadores[b.id] ?? 'vineta'}
            onMarcador={(m) => setMarcador(b.id, m)}
            onRedactar={(aporte, textoActual) => redactar(b.id, aporte, textoActual)}
          />
        );
      case 'tabla':
        // Un cuadro que se puede repetir —las características por bien—
        // se pinta con su envoltura; el resto, como siempre.
        return b.repetible ? (
          <ControlTablaRepetible
            key={clave}
            bloque={b}
            filas={r.tablas[b.id] ?? b.filasIniciales ?? []}
            grupos={r.gruposTabla[b.id] ?? []}
            onChangeFilas={(f) => setTabla(b.id, f)}
            onChangeGrupos={(g) => setGruposTabla(b.id, g)}
            onRevisar={(f) => revisarTabla(b.id, f)}
          />
        ) : (
          <ControlTabla
            key={clave}
            bloque={b}
            filas={r.tablas[b.id] ?? b.filasIniciales ?? []}
            onChange={(f) => setTabla(b.id, f)}
            onRevisar={(f) => revisarTabla(b.id, f)}
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

  const pintarSeccion = (s: Seccion, numero: string, nivel: number, controles?: ReactNode) => {
    // Un apartado "de corresponder" ya no desaparece de la pantalla: se
    // muestra con su interruptor al lado del título, encendido o
    // apagado. Es la observación de César de agosto: "el botón de
    // activación y desactivación, lo mejor sería ponerlo al costado de
    // cada condición del requerimiento. Esto facilita a la medida que
    // uno va avanzando con el llenado".
    //
    // Antes vivían todos juntos en un panel al principio, lejos del
    // apartado que encendían: había que recordar cuál era cuál.
    const apagado = !!s.condicion && !r.condiciones[s.condicion];
    // Fuera los títulos, que ya los pinta la sección, y fuera lo que
    // depende de una opción que no se ha elegido.
    //
    // Un bloque atado a un interruptor —el pago anticipado, la
    // conformidad de las accesorias— se muestra igual, con el suyo al
    // lado. Lo que sí se sigue ocultando es lo que depende de una OPCIÓN
    // que el usuario aún no ha elegido: ahí no hay nada que encender.
    const conInterruptor = (b: Bloque) =>
      'visibleSi' in b && b.visibleSi?.condicion ? b.visibleSi.condicion : null;
    const utiles = apagado
      ? []
      : s.bloques.filter(
          (b) => b.clase !== 'titulo' && (conInterruptor(b) !== null || bloqueAplica(b, r)),
        );
    return (
      <div
        key={s.id}
        // El ancla de primer nivel la pone la envoltura que además
        // lleva los controles de colocación; aquí solo las hijas, para
        // no repetir un id en el documento.
        id={nivel > 1 ? anclaApartado(s.id) : undefined}
        className={cn('scroll-mt-24 transition', nivel > 1 && 'border-l pl-4')}
      >
        <div className="flex items-start justify-between gap-3">
          {s.renombrable ? (
            // El formato propone tres prestaciones accesorias, pero hay
            // más —monitoreo, asistencia técnica— y cada entidad tiene
            // las suyas. Observación de César de agosto de 2026.
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'font-semibold',
                  nivel === 1 ? 'text-base' : 'text-sm text-muted-foreground',
                )}
              >
                {numero}.
              </span>
              <Input
                value={r.titulos[s.id] ?? s.titulo}
                onChange={(e) => setTitulo(s.id, e.target.value)}
                placeholder={s.titulo}
                aria-label={`Título del numeral ${numero}`}
                className="h-8 max-w-md border-transparent bg-transparent px-1 font-semibold hover:border-input focus:border-input"
              />
            </div>
          ) : (
            <h3
              className={cn(
                'font-semibold',
                nivel === 1 ? 'text-base' : 'text-sm text-muted-foreground',
                apagado && 'text-muted-foreground/70',
              )}
            >
              {apagado ? s.titulo : `${numero}. ${s.titulo}`}
            </h3>
          )}
          <div className="flex shrink-0 items-center gap-1">
            {controles}
            {s.condicion && (
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span>{apagado ? 'No corresponde' : 'Corresponde'}</span>
                <Switch
                  checked={!apagado}
                  onCheckedChange={(v) => setCondicion(s.condicion!, v)}
                  aria-label={`${s.titulo}: incluir en el documento`}
                />
              </label>
            )}
          </div>
        </div>

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
              const condicion = conInterruptor(b);
              const bloqueApagado = !!condicion && !r.condiciones[condicion];
              const etiqueta =
                'etiqueta' in b && typeof b.etiqueta === 'string' ? b.etiqueta : s.titulo;

              return (
                <div
                  key={`${s.id}-${i}`}
                  id={idBloque ? anclaBloque(idBloque) : undefined}
                  className="scroll-mt-24 transition"
                >
                  {condicion && (
                    <label className="mb-2 flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm">
                      <span className={cn(bloqueApagado && 'text-muted-foreground')}>
                        {etiqueta}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {bloqueApagado ? 'No corresponde' : 'Corresponde'}
                        <Switch
                          checked={!bloqueApagado}
                          onCheckedChange={(v) => setCondicion(condicion, v)}
                          aria-label={`${etiqueta}: incluir en el documento`}
                        />
                      </span>
                    </label>
                  )}
                  {!bloqueApagado && bloqueVisible(b, `${s.id}-${i}`)}
                </div>
              );
            })}
          </div>
        )}
        {(() => {
          // Tampoco se esconden las hijas apagadas: cada una lleva su
          // interruptor. Lo que sí hacen es no consumir numeración.
          const hijas = hijasOrdenadas(s, r);
          const propias = r.extras.filter((e) => e.dentroDe === s.id);
          // Solo se ofrece añadir donde el formato ya agrupa apartados:
          // las prestaciones accesorias del formato son tres, pero hay
          // más —monitoreo, asistencia técnica— y cada entidad tiene las
          // suyas.
          const admiteAnadir = (s.subsecciones?.length ?? 0) > 0;
          if (hijas.length === 0 && propias.length === 0 && !admiteAnadir) return null;
          return (
            <div className="mt-4 space-y-5">
              {(() => {
                // La numeración de las hijas sigue la del documento: una
                // subsección apagada no gasta número, igual que arriba.
                let sub = 0;
                return hijas.map((h, iHija) => {
                  const entra = !h.condicion || r.condiciones[h.condicion];
                  const suNumero = entra ? `${numero}.${++sub}` : '—';
                  return (
                    <div key={h.id} className="group/hija">
                      {pintarSeccion(
                        h,
                        suNumero,
                        nivel + 1,
                        // Van en la fila del título, no flotando sobre
                        // ella: encima del interruptor le tapaban la
                        // palabra «Corresponde».
                        <span className="flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover/hija:opacity-100">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={iHija === 0}
                            title="Subir este numeral"
                            aria-label={`Subir ${suNumero}`}
                            onClick={() => moverHija(s, h.id, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={iHija === hijas.length - 1}
                            title="Bajar este numeral"
                            aria-label={`Bajar ${suNumero}`}
                            onClick={() => moverHija(s, h.id, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </span>,
                      )}
                    </div>
                  );
                });
              })()}
              {propias.map((e, i) => (
                <div key={e.id} id={anclaApartado(e.id)} className="scroll-mt-24 border-l pl-4">
                  <ApartadoPropio
                    extra={e}
                    numero={`${numero}.${hijas.length + i + 1}`}
                    onChange={(cambio) => cambiarExtra(e.id, cambio)}
                    onBorrar={() => borrarExtra(e.id)}
                  />
                </div>
              ))}
              {admiteAnadir && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => anadirExtra(s.id)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Añadir un apartado dentro de &ldquo;{s.titulo.toLowerCase()}&rdquo;
                </Button>
              )}
            </div>
          );
        })()}
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
    // Ya no se filtran los apagados: se muestran con su interruptor al
    // lado del título, y solo desaparecen del documento final.
    //
    // La numeración, en cambio, sí los salta: si el apartado no va a
    // salir en el Word, no puede gastar un número, porque el que ve el
    // usuario tiene que ser el que va a leer en el documento.
    let n = 0;
    return apartadosOrdenados(plantilla, r).map((a) => {
      const entra =
        a.tipo === 'extra' || !a.seccion.condicion || r.condiciones[a.seccion.condicion];
      return { apartado: a, numero: entra ? String(++n) : '—' };
    });
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
                  {(() => {
                    const colocacion = (
                      <span className="flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover/apartado:opacity-100">
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
                      </span>
                    );

                    // Plegado o apartado propio no tienen fila de título
                    // donde encajarlas, así que ahí flotan como antes; en
                    // una sección normal van dentro de la fila para no
                    // taparle el título.
                    if (plegado)
                      return (
                        <>
                          <div className="absolute -top-1 right-0 z-10 flex gap-1">{colocacion}</div>
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
                        </>
                      );

                    return (
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
                          <>
                            <div className="absolute -top-1 right-0 z-10 flex gap-1">
                              {colocacion}
                            </div>
                            <ApartadoPropio
                              extra={apartado.extra}
                              numero={numero}
                              onChange={(cambio) => cambiarExtra(apartado.id, cambio)}
                              onBorrar={() => borrarExtra(apartado.id)}
                            />
                          </>
                        ) : (
                          pintarSeccion(apartado.seccion, numero, 1, colocacion)
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => anadirExtra()}>
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
