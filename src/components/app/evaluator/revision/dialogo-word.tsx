'use client';

/**
 * Descargar en Word solo las observaciones seleccionadas, con la carátula
 * del prototipo de César (entidad, dirigido a, elaborado por, referencia,
 * fecha). Sin encabezado: «cada encabezado ya lo personaliza cada
 * entidad» (César, 27/11/2026).
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CaratulaDelWord } from '@/lib/evaluacion/requerimiento/observaciones';
import { BLOQUES, type IdDeBloque } from './bloques';

export function DialogoWord({
  abierto,
  evaluacionId,
  ids,
  porBloque,
  onCerrar,
}: {
  abierto: boolean;
  evaluacionId: string;
  ids: string[];
  porBloque: Record<IdDeBloque, number>;
  onCerrar: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [c, setC] = useState<CaratulaDelWord>({ entidad: '', dirigidoA: '', elaboradoPor: '', referencia: '', fecha: hoy });
  const [bajando, setBajando] = useState(false);
  const poner = (k: keyof CaratulaDelWord, v: string) => setC((p) => ({ ...p, [k]: v }));

  async function descargar() {
    setBajando(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluacionId}/observaciones/word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, caratula: c }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(j.message || j.error || 'No se pudo generar el Word');
      }
      const blob = await res.blob();
      const nombre = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(res.headers.get('content-disposition') ?? '')?.[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre ? decodeURIComponent(nombre) : 'Observaciones_al_requerimiento.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onCerrar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBajando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Descargar en Word</DialogTitle>
          <DialogDescription>
            {ids.length} observación{ids.length === 1 ? '' : 'es'} seleccionada{ids.length === 1 ? '' : 's'}. Los datos de la carátula
            son opcionales.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['entidad', 'Entidad o cliente'],
              ['dirigidoA', 'Dirigido a'],
              ['elaboradoPor', 'Elaborado por'],
              ['referencia', 'Referencia'],
            ] as const
          ).map(([k, etiqueta]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`w-${k}`}>{etiqueta}</Label>
              <Input id={`w-${k}`} maxLength={200} value={c[k] ?? ''} onChange={(e) => poner(k, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="w-fecha">Fecha</Label>
            <Input id="w-fecha" type="date" value={c.fecha ?? ''} onChange={(e) => poner('fecha', e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Irá en el documento</p>
          <ul className="grid gap-1 text-[12.5px] sm:grid-cols-2">
            {BLOQUES.filter((b) => porBloque[b.id] > 0).map((b) => (
              <li key={b.id}>
                {b.nombre}: <span className="font-semibold">{porBloque[b.id]}</span>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={descargar} disabled={bajando || ids.length === 0} aria-busy={bajando}>
            {bajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar Word (.docx)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
