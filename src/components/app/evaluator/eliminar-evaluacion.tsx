'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Borrar una evaluación, con confirmación.
 *
 * César no tenía cómo quitar de la lista las evaluaciones que se quedaron
 * en «Procesando» (30/09/2026). Si la evaluación está corriendo, la vuelta
 * en curso se encuentra la fila borrada y se detiene sola.
 */
export function EliminarEvaluacion({
  id,
  titulo,
  alEliminar,
  variante = 'icono',
}: {
  id: string;
  titulo: string;
  /** A dónde ir después; si no se da, se refresca la página. */
  alEliminar?: string;
  variante?: 'icono' | 'boton';
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    setBorrando(true);
    try {
      const r = await fetch(`/api/evaluations/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}`);
      toast.success('Evaluación eliminada');
      setAbierto(false);
      if (alEliminar) router.replace(alEliminar);
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo eliminar: ${(e as Error).message}`);
    } finally {
      setBorrando(false);
    }
  }

  return (
    <>
      {variante === 'icono' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Eliminar «${titulo}»`}
          title="Eliminar evaluación"
          className="text-muted-foreground hover:text-red-600"
          onClick={(e) => {
            // Va dentro de la tarjeta, que es un enlace.
            e.preventDefault();
            e.stopPropagation();
            setAbierto(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setAbierto(true)}>
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta evaluación?</DialogTitle>
            <DialogDescription>
              «{titulo}» se borrará con su resultado y su acta. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAbierto(false)} disabled={borrando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={borrar} loading={borrando}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
