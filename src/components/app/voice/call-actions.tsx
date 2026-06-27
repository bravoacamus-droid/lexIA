'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star, Trash2, MessageSquareText, Download, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  callId: string;
  currentRating: number | null;
  currentComment: string | null;
  canDelete: boolean;
  hasAudio: boolean;
}

export function CallActions({
  callId,
  currentRating,
  currentComment,
  canDelete,
  hasAudio,
}: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [comment, setComment] = useState<string>(currentComment || '');
  const [savingRating, setSavingRating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);

  async function downloadAudio() {
    setDownloadingAudio(true);
    try {
      const res = await fetch(`/api/voice/calls/${callId}/audio-url`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || 'No se pudo obtener el audio');
      const a = document.createElement('a');
      a.href = json.url;
      a.download = `lexia-llamada-${callId.slice(0, 8)}.webm`;
      a.click();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloadingAudio(false);
    }
  }

  async function saveRating() {
    if (rating < 1 || rating > 5) {
      toast.error('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    setSavingRating(true);
    try {
      const res = await fetch(`/api/voice/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_rating: rating,
          user_rating_comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      toast.success('Gracias por tu calificación');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingRating(false);
    }
  }

  async function deleteCall() {
    if (!confirm('¿Eliminar esta llamada y todos sus datos? Esta acción no se puede deshacer.')) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/voice/calls/${callId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      toast.success('Llamada eliminada');
      router.push('/llamadas');
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      {hasAudio && (
        <div className="pb-4 border-b border-border/40">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
            Grabación
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAudio}
            disabled={downloadingAudio}
          >
            {downloadingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar audio
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Solo se grabó tu voz. La voz del agente está en la transcripción.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" />
          ¿Cómo te respondió la Abogada Virtual?
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1 hover:scale-110 transition-transform"
              aria-label={`${n} estrellas`}
            >
              <Star
                className={`h-7 w-7 ${
                  n <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder="Comentario opcional (qué te gustó, qué mejoraríamos…)"
          rows={3}
          maxLength={500}
        />
        <div className="flex justify-end">
          <Button onClick={saveRating} loading={savingRating} size="sm">
            Guardar calificación
          </Button>
        </div>
      </div>

      {canDelete && (
        <div className="pt-4 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
            Derecho de eliminación (Ley 29733, Art. 18)
          </p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Puedes eliminar esta llamada con su transcripción y grabación. La
            eliminación es inmediata y no se puede deshacer.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteCall}
            loading={deleting}
            className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar esta llamada
          </Button>
        </div>
      )}
    </Card>
  );
}
