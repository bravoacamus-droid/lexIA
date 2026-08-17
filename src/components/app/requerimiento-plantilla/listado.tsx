'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, Plus, Loader2 } from 'lucide-react';
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
  objeto: string;
  titulo: string;
}

const FAMILIA: Record<Plantilla['familia'], string> = {
  menor_8_uit: 'Menor a 8 UIT',
  procedimiento_seleccion: 'Procedimiento de selección',
};

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
        <h1 className="text-xl font-semibold">Requerimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sigue el formato oficial: el texto obligatorio se reproduce tal cual y LexIA solo
          redacta los apartados que dependen de tu contratación.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Nuevo requerimiento</h2>
        <div className="mt-4">
          <Label className="text-sm font-medium">Tipo de contratación</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {plantillas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setElegida(p.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition',
                  elegida === p.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50',
                )}
              >
                <span className="block text-sm font-medium">{p.titulo}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {FAMILIA[p.familia]}
                </span>
              </button>
            ))}
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
