'use client';

/**
 * Controles del formulario, uno por clase de bloque de la plantilla.
 *
 * El formulario NO está escrito a mano: se genera recorriendo la
 * plantilla. Por eso estos componentes reciben la definición del bloque
 * y no props sueltas — cuando se codifiquen las catorce plantillas
 * restantes, la interfaz no hay que tocarla.
 */
import { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  BloqueCampo,
  BloqueOpcion,
  BloqueRedactado,
  BloqueTabla,
  BloqueParrafo,
} from '@/lib/generadores/plantilla-tipos';
import { OPCION_PROPIA } from '@/lib/generadores/ensamblador';

/**
 * Nota al pie de un control, con la instrucción literal de la plantilla.
 *
 * Con `advertencia` va en rojo y con icono, igual que las notas del
 * formato: hay instrucciones que no son un consejo sino una condición
 * —qué documentación puede exigirse y cuál no— y en gris pequeño se
 * leen como decoración.
 */
function Ayuda({
  children,
  advertencia,
}: {
  children: React.ReactNode;
  advertencia?: boolean;
}) {
  if (!advertencia) {
    return <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>;
  }
  return (
    <p className="mt-1.5 flex gap-2 rounded-md border-l-2 border-destructive/70 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive dark:bg-destructive/10">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// ── Campo ─────────────────────────────────────────────────────────────

export function ControlCampo({
  bloque,
  valor,
  onChange,
  onMejorar,
}: {
  bloque: BloqueCampo;
  valor: string;
  onChange: (v: string) => void;
  /**
   * Solo para los campos de texto largo. Son clausulas que el area
   * usuaria escribe entera a mano, asi que se les ofrece la misma ayuda
   * que a los apartados redactados en vez de dejarlas sin revisar.
   */
  onMejorar?: (aporte: string, textoActual: string) => Promise<string | null>;
}) {
  const largo = bloque.tipo === 'texto_largo';
  const [mejorando, setMejorando] = useState(false);
  const [propuesta, setPropuesta] = useState<string | null>(null);
  const puedeMejorar = largo && !!onMejorar && valor.trim().length > 0;

  async function pedirMejora() {
    if (!onMejorar) return;
    setMejorando(true);
    try {
      const texto = await onMejorar('', valor);
      if (texto) setPropuesta(texto);
    } finally {
      setMejorando(false);
    }
  }

  return (
    <div>
      <Label htmlFor={bloque.id} className="text-sm font-medium">
        {bloque.etiqueta}
        {bloque.obligatorio && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {largo ? (
        <Textarea
          id={bloque.id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1.5"
        />
      ) : (
        <Input
          id={bloque.id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          inputMode={bloque.tipo === 'numero' ? 'decimal' : undefined}
          className="mt-1.5"
        />
      )}
      <Ayuda advertencia={bloque.advertencia}>{bloque.ayuda}</Ayuda>

      {puedeMejorar && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={pedirMejora}
          disabled={mejorando}
        >
          {mejorando ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          Mejorar redacción
        </Button>
      )}

      {propuesta && (
        <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-medium text-primary">
            Versión mejorada por LexIA — revísala antes de usarla
          </p>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{propuesta}</pre>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(propuesta);
                setPropuesta(null);
              }}
            >
              Reemplazar con esta versión
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPropuesta(null)}>
              Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Párrafo con dato incrustado ───────────────────────────────────────

/**
 * El párrafo es texto obligatorio con un hueco en medio. Se muestra
 * entero, con el hueco como campo, para que quede claro que lo demás no
 * se toca.
 */
export function ControlParrafo({
  bloque,
  valores,
  onChange,
}: {
  bloque: BloqueParrafo;
  valores: Record<string, string>;
  onChange: (id: string, v: string) => void;
}) {
  const tramos = bloque.texto.split(/(\{\{[^}]+\}\})/);
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-3">
      <p className="text-sm leading-relaxed">
        {tramos.map((t, i) => {
          const m = t.match(/^\{\{([^}]+)\}\}$/);
          if (!m) return <span key={i}>{t}</span>;
          const campo = bloque.campos.find((c) => c.id === m[1]);
          if (!campo) return <span key={i}>{t}</span>;
          return (
            <Input
              key={i}
              value={valores[campo.id] ?? ''}
              onChange={(e) => onChange(campo.id, e.target.value)}
              placeholder={campo.etiqueta}
              className="mx-1 inline-block h-7 w-64 align-baseline text-sm"
            />
          );
        })}
      </p>
      {bloque.campos.map((c) => (
        <Ayuda key={c.id} advertencia={c.advertencia}>
          <span className="font-medium">{c.etiqueta}:</span> {c.ayuda}
        </Ayuda>
      ))}
    </div>
  );
}

// ── Opción ────────────────────────────────────────────────────────────

export function ControlOpcion({
  bloque,
  valor,
  onChange,
  textoPropio,
  onTextoPropio,
}: {
  bloque: BloqueOpcion;
  valor: string;
  onChange: (v: string) => void;
  /** Texto de la alternativa que redacta la entidad, si eligió esa vía. */
  textoPropio: string;
  onTextoPropio: (v: string) => void;
}) {
  const propia = valor === OPCION_PROPIA;
  const elegido = !!valor;

  return (
    <div>
      <Label className="text-sm font-medium">
        {bloque.etiqueta}
        {!elegido && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Ayuda>{bloque.instruccion}</Ayuda>

      <div className="mt-2 space-y-2">
        {bloque.opciones.map((o) => {
          const activa = valor === o.valor;
          return (
            <div
              key={o.valor}
              className={cn(
                'rounded-lg border p-3 transition',
                activa
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                  : 'border-border hover:border-primary/40',
                elegido && !activa && 'opacity-60',
              )}
            >
              <p className="text-sm leading-relaxed">{o.texto}</p>
              <div className="mt-2 flex items-center gap-2">
                {activa ? (
                  <>
                    {/* Que se vea que está DENTRO del documento, no
                        solo resaltada: seleccionar y no notar que se
                        eligió fue la queja. */}
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Check className="h-3.5 w-3.5" />
                      Agregada al documento
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => onChange('')}
                    >
                      Quitar
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onChange(o.valor)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Agregar al documento
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Ninguna de las tres tiene por qué encajar en toda entidad. */}
        <div
          className={cn(
            'rounded-lg border border-dashed p-3 transition',
            propia ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'border-border',
            elegido && !propia && 'opacity-60',
          )}
        >
          {propia ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Check className="h-3.5 w-3.5" />
                  Redacción propia, agregada al documento
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => onChange('')}
                >
                  Quitar
                </Button>
              </div>
              <Textarea
                value={textoPropio}
                onChange={(e) => onTextoPropio(e.target.value)}
                rows={3}
                className="mt-2"
                placeholder="Redacta aquí la alternativa que corresponde a esta contratación…"
              />
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => onChange(OPCION_PROPIA)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ninguna se ajusta: redactar la nuestra
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Redactado ─────────────────────────────────────────────────────────

export function ControlRedactado({
  bloque,
  valor,
  onChange,
  onRedactar,
}: {
  bloque: BloqueRedactado;
  valor: string;
  onChange: (v: string) => void;
  /**
   * Devuelve el texto redactado; el usuario decide si lo acepta.
   *
   * Recibe tambien lo ya escrito: con texto el modelo mejora, sin texto
   * redacta desde cero. Son dos operaciones distintas y el usuario tiene
   * que ver cual va a ocurrir antes de pulsar.
   */
  onRedactar: (aporte: string, textoActual: string) => Promise<string | null>;
}) {
  const [aporte, setAporte] = useState('');
  const [redactando, setRedactando] = useState(false);
  const [verEjemplo, setVerEjemplo] = useState(false);
  const [propuesta, setPropuesta] = useState<string | null>(null);

  // El apartado ya tiene contenido propio: el boton mejora, no reemplaza.
  const mejorar = valor.trim().length > 0;

  async function pedirRedaccion() {
    setRedactando(true);
    try {
      const texto = await onRedactar(aporte, mejorar ? valor : '');
      if (texto) setPropuesta(texto);
    } finally {
      setRedactando(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Label htmlFor={bloque.id} className="text-sm font-medium">
          {bloque.etiqueta}
        </Label>
        {bloque.ejemplo && (
          <button
            type="button"
            onClick={() => setVerEjemplo((v) => !v)}
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', verEjemplo && 'rotate-180')}
            />
            Ejemplo del formato
          </button>
        )}
      </div>
      <Ayuda advertencia={bloque.advertencia}>{bloque.instruccion}</Ayuda>

      {verEjemplo && bloque.ejemplo && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          {bloque.ejemplo}
        </pre>
      )}

      <Textarea
        id={bloque.id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={bloque.extension === 'parrafo' ? 4 : 7}
        className="mt-2"
        placeholder="Escríbelo, o descríbelo abajo y deja que LexIA lo redacte."
      />

      {mejorar && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ya hay texto: LexIA lo mejorará conservando tus datos y decisiones, no escribirá otro.
        </p>
      )}

      <div className="mt-2 flex items-end gap-2">
        <div className="flex-1">
          <Input
            value={aporte}
            onChange={(e) => setAporte(e.target.value)}
            placeholder={
              mejorar
                ? 'Qué quieres que corrija o añada (opcional)…'
                : 'Datos concretos para que LexIA redacte este apartado…'
            }
            className="h-9 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pedirRedaccion}
          disabled={redactando}
        >
          {redactando ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          {mejorar ? 'Mejorar redacción' : 'Redactar'}
        </Button>
      </div>

      {propuesta && (
        // La propuesta NO se guarda sola. Guardar automáticamente lo que
        // escribió el modelo convierte la revisión en un trámite que
        // nadie hace.
        <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-medium text-primary">
            {mejorar ? 'Versión mejorada por LexIA' : 'Propuesta de LexIA'} — revísala antes de usarla
          </p>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{propuesta}</pre>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(propuesta);
                setPropuesta(null);
              }}
            >
              {mejorar ? 'Reemplazar con esta versión' : 'Usar este texto'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPropuesta(null)}>
              Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabla ─────────────────────────────────────────────────────────────

export function ControlTabla({
  bloque,
  filas,
  onChange,
}: {
  bloque: BloqueTabla;
  filas: string[][];
  onChange: (filas: string[][]) => void;
}) {
  const nueva = () => onChange([...filas, Array(bloque.columnas.length).fill('')]);
  const borrar = (i: number) => onChange(filas.filter((_, k) => k !== i));
  const editar = (i: number, j: number, v: string) =>
    onChange(filas.map((f, k) => (k === i ? f.map((c, l) => (l === j ? v : c)) : f)));

  return (
    <div>
      <Label className="text-sm font-medium">
        {bloque.etiqueta}
        {(bloque.minimo ?? 0) > 0 && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {bloque.instruccion && (
        <Ayuda advertencia={bloque.advertencia}>{bloque.instruccion}</Ayuda>
      )}

      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              {bloque.columnas.map((c, j) => (
                <th key={j} className="px-2 py-1.5 text-left text-xs font-medium">
                  {c}
                  {bloque.ayudaColumnas?.[j] && (
                    <span className="block font-normal text-muted-foreground">
                      {bloque.ayudaColumnas[j]}
                    </span>
                  )}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-t">
                {bloque.columnas.map((_, j) => (
                  <td key={j} className="p-1">
                    <Input
                      value={f[j] ?? ''}
                      onChange={(e) => editar(i, j, e.target.value)}
                      className="h-8 border-0 bg-transparent text-sm shadow-none focus-visible:ring-1"
                    />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => borrar(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar fila ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td
                  colSpan={bloque.columnas.length + 1}
                  className="px-2 py-3 text-center text-xs text-muted-foreground"
                >
                  {(bloque.minimo ?? 0) > 0
                    ? `Falta completar al menos ${bloque.minimo} fila${bloque.minimo === 1 ? '' : 's'}.`
                    : 'Sin filas. Si no corresponde, déjala vacía.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={nueva} className="mt-1.5">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Agregar fila
      </Button>
    </div>
  );
}
