'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CONFIRM_PHRASE = 'ELIMINAR';

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { detail?: string; error?: string })?.detail
            || (data as { error?: string })?.error
            || `HTTP ${res.status}`,
        );
      }
      toast.success('Cuenta eliminada. Hasta pronto.');
      router.push('/');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          Eliminar mi cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            ¿Eliminar tu cuenta?
          </DialogTitle>
          <DialogDescription>
            Esta acción borra permanentemente tu perfil, suscripción,
            conversaciones, documentos generados, evaluaciones y carpetas.
            No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Para confirmar, escribe «{CONFIRM_PHRASE}»
          </Label>
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={phrase !== CONFIRM_PHRASE || deleting}
            loading={deleting}
            onClick={deleteAccount}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
