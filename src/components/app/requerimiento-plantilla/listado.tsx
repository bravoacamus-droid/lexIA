'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Loader2,
  Package,
  Briefcase,
  DraftingCompass,
  HardHat,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Fila {
  id: string;
  plantilla_id: string;
  denominacion: string;
  status: string;
  updated_at: string;
}

interface Plantilla {
  id: string;
  familia: 'menor_8_uit' | 'procedimiento_seleccion';
  objeto: 'bienes' | 'servicios' | 'consultoria_general' | 'consultoria_obras' | 'obras';
  titulo: string;
}

/**
 * Cómo se agrupa el catálogo en la portada.
 *
 * Los quince formatos en una lista corrida no dicen nada: no se ve que
 * los tres primeros son de menos de 8 UIT ni que hay cuatro familias de
 * procedimiento. Se ordenan como los ordena el propio OECE —bienes,
 * servicios, consultoría de obras y ejecución de obras— y se numeran
 * 1.1, 1.2… para poder nombrarlos en una conversación. Petición de
 * César del 19/08/2026, con la advertencia de no llenarlo de colores:
 * el único acento es el de lo elegido.
 */
const GRUPOS: Array<{
  clave: string;
  titulo: string;
  icono: typeof Package;
  objetos: Array<Plantilla['objeto']>;
}> = [
  { clave: 'bienes', titulo: 'Bienes', icono: Package, objetos: ['bienes'] },
  {
    clave: 'servicios',
    titulo: 'Servicios',
    icono: Briefcase,
    objetos: ['servicios', 'consultoria_general'],
  },
  {
    clave: 'consultoria_obras',
    titulo: 'Consultoría de obras',
    icono: DraftingCompass,
    objetos: ['consultoria_obras'],
  },
  { clave: 'obras', titulo: 'Ejecución de obras', icono: HardHat, objetos: ['obras'] },
];

/**
 * Una opción del catálogo.
 *
 * Sin color propio: el acento se reserva para la elegida. Con quince
 * formatos, pintar cada familia de un color convierte la portada en un
 * semáforo y deja de distinguirse lo que importa, que es cuál está
 * seleccionado.
 */
function Tarjeta({
  numero,
  plantilla,
  elegida,
  onElegir,
  icono: Icono,
}: {
  numero: string;
  plantilla: Plantilla;
  elegida: boolean;
  onElegir: () => void;
  icono?: typeof Package;
}) {
  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegida}
      className={cn(
        'flex w-full gap-2 rounded-lg border bg-background p-2.5 text-left transition',
        elegida
          ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
          : 'border-border hover:border-primary/40 hover:bg-muted/50',
      )}
    >
      {Icono && <Icono className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0">
        <span className="block text-xs font-medium leading-snug">
          <span className="text-muted-foreground">{numero}.</span> {plantilla.titulo}
        </span>
      </span>
    </button>
  );
}

export function ListadoRequerimientos({
  requerimientos,
  plantillas,
}: {
  requerimientos: Fila[];
  plantillas: Plantilla[];
}) {
  const router = useRouter();
  const [elegida, setElegida] = useState<string | null>(plantillas[0]?.id ?? null);
  const [denominacion, setDenominacion] = useState('');
  const [creando, setCreando] = useState(false);

  const porId = new Map(plantillas.map((p) => [p.id, p]));

  async function crear() {
    if (!elegida || denominacion.trim().length < 2) return;
    setCreando(true);
    try {
      const res = await fetch('/api/generadores/requerimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantilla_id: elegida, denominacion: denominacion.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('No se pudo crear', { description: j?.detail ?? j?.error });
        return;
      }
      router.push(`/generador/requerimiento-plantilla/${j.id}`);
    } catch (e) {
      toast.error('Fallo al crear', { description: (e as Error).message });
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Generador de requerimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige el tipo de contratación. El documento sigue el formato oficial: el texto
          obligatorio se reproduce tal cual y LexIA solo redacta los apartados que dependen de tu
          contratación.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Nuevo requerimiento</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quince formatos oficiales, agrupados como los agrupa el OECE.
        </p>
        <div className="mt-4">
          <Label className="text-sm font-medium">Selecciona el tipo de contratación</Label>

          {/* I. Menores a 8 UIT. Tres formatos, en su propia fila: no
              comparten estructura con los procedimientos de selección y
              mezclarlos hacía que pareciera una lista de quince cosas
              equivalentes. */}
          {(() => {
            const menores = plantillas.filter((p) => p.familia === 'menor_8_uit');
            if (menores.length === 0) return null;
            return (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  I. Contrataciones menores a 8 UIT
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {menores.map((p, i) => (
                    <Tarjeta
                      key={p.id}
                      numero={`${i + 1}`}
                      plantilla={p}
                      elegida={elegida === p.id}
                      onElegir={() => setElegida(p.id)}
                      icono={i === 0 ? Package : i === 1 ? Briefcase : User}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* II. Procedimientos de selección, por familia. */}
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              II. Procedimientos de selección
            </h3>
            <div className="mt-2 grid gap-4 lg:grid-cols-4">
              {GRUPOS.map((g, gi) => {
                const dentro = plantillas.filter(
                  (p) => p.familia === 'procedimiento_seleccion' && g.objetos.includes(p.objeto),
                );
                if (dentro.length === 0) return null;
                const Icono = g.icono;
                return (
                  <div key={g.clave} className="rounded-lg border bg-muted/30 p-2.5">
                    <h4 className="flex items-center gap-1.5 px-1 text-xs font-semibold">
                      <Icono className="h-3.5 w-3.5 text-muted-foreground" />
                      {gi + 1}. {g.titulo}
                    </h4>
                    <div className="mt-2 space-y-2">
                      {dentro.map((p, i) => (
                        <Tarjeta
                          key={p.id}
                          numero={`${gi + 1}.${i + 1}`}
                          plantilla={p}
                          elegida={elegida === p.id}
                          onElegir={() => setElegida(p.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {plantillas.length < 15 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Se están incorporando el resto de formatos oficiales.
            </p>
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor="denominacion" className="text-sm font-medium">
            Denominación de la contratación
          </Label>
          <Input
            id="denominacion"
            value={denominacion}
            onChange={(e) => setDenominacion(e.target.value)}
            placeholder="Adquisición de muebles de melamina para oficinas administrativas"
            className="mt-1.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void crear();
            }}
          />
        </div>

        <Button
          className="mt-4"
          onClick={crear}
          disabled={creando || !elegida || denominacion.trim().length < 2}
        >
          {creando ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          Crear
        </Button>
      </Card>

      {/* El módulo anterior queda accesible desde aquí. No va en el menú
          para no ofrecer dos entradas que se llaman igual, pero quien
          tenga documentos allí debe poder abrirlos. */}
      <p className="mt-3 text-xs text-muted-foreground">
        ¿Buscas los requerimientos que hiciste con el formato anterior de Anexo (EETT/TDR)?{' '}
        <Link href="/generador/requerimiento" className="underline underline-offset-2 hover:text-foreground">
          Están aquí
        </Link>
        .
      </p>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">
          Mis requerimientos{' '}
          <span className="font-normal text-muted-foreground">({requerimientos.length})</span>
        </h2>
        {requerimientos.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Todavía no has creado ninguno.
          </Card>
        ) : (
          <div className="space-y-2">
            {requerimientos.map((f) => (
              <Link key={f.id} href={`/generador/requerimiento-plantilla/${f.id}`}>
                <Card className="flex items-center gap-3 p-4 transition hover:border-primary/40">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.denominacion}</p>
                    <p className="text-xs text-muted-foreground">
                      {porId.get(f.plantilla_id)?.titulo ?? f.plantilla_id}
                    </p>
                  </div>
                  <Badge variant="secondary">{f.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
