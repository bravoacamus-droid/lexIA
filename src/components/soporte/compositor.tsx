'use client';

import { useRef, useState } from 'react';
import { Loader2, Paperclip, SendHorizonal, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LIMITE_DE_ADJUNTO, LIMITE_DE_MENSAJE, TIPOS_DE_ADJUNTO } from '@/lib/soporte/tipos';

/**
 * La caja para escribir un mensaje de soporte: texto, un adjunto (imagen
 * o PDF) y pegar una captura con Ctrl+V. Enter envía; Mayús+Enter salta
 * de línea. `alEnviar` recibe el formulario ya armado y devuelve si salió.
 */
export function Compositor({
  alEnviar,
  placeholder = 'Escribe tu mensaje…',
  valorInicial = '',
  alCambiar,
  respuestasRapidas,
  autoFocus = false,
  deshabilitado = false,
  pie,
}: {
  alEnviar: (form: FormData) => Promise<boolean>;
  placeholder?: string;
  valorInicial?: string;
  alCambiar?: (texto: string) => void;
  respuestasRapidas?: string[];
  autoFocus?: boolean;
  deshabilitado?: boolean;
  pie?: React.ReactNode;
}) {
  const [texto, setTexto] = useState(valorInicial);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  function cambiarTexto(t: string) {
    setTexto(t);
    alCambiar?.(t);
  }

  function elegir(f: File | null) {
    if (!f) return;
    if (!(TIPOS_DE_ADJUNTO as readonly string[]).includes(f.type)) {
      toast.error('Solo se pueden adjuntar imágenes PNG o JPG, o un PDF.');
      return;
    }
    if (f.size > LIMITE_DE_ADJUNTO) {
      toast.error('El archivo supera los 8 MB.');
      return;
    }
    if (vista) URL.revokeObjectURL(vista);
    setArchivo(f);
    setVista(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  function quitarArchivo() {
    if (vista) URL.revokeObjectURL(vista);
    setArchivo(null);
    setVista(null);
    if (entrada.current) entrada.current.value = '';
  }

  async function enviar() {
    if (enviando || deshabilitado) return;
    const limpio = texto.trim();
    if (!limpio && !archivo) return;
    setEnviando(true);
    const form = new FormData();
    form.set('cuerpo', limpio);
    if (archivo) form.set('adjunto', archivo);
    const ok = await alEnviar(form);
    setEnviando(false);
    if (ok) {
      cambiarTexto('');
      quitarArchivo();
      area.current?.focus();
    }
  }

  const listo = (texto.trim().length > 0 || !!archivo) && !enviando && !deshabilitado;

  return (
    <div className="border-t border-border bg-background p-3">
      {respuestasRapidas && respuestasRapidas.length > 0 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {respuestasRapidas.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                cambiarTexto(texto ? `${texto.trimEnd()}\n\n${r}` : r);
                area.current?.focus();
              }}
              className="shrink-0 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-brand-300 hover:text-foreground"
              title={r}
            >
              {r.length > 42 ? `${r.slice(0, 40)}…` : r}
            </button>
          ))}
        </div>
      )}

      {archivo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2">
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vista} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded bg-background">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[12px]">{archivo.name || 'Captura pegada'}</span>
          <button type="button" onClick={quitarArchivo} aria-label="Quitar el archivo" className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-2 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/15">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={deshabilitado}
          aria-label="Adjuntar una captura o un PDF"
          title="Adjuntar una captura (PNG o JPG) o un PDF. También puedes pegar una captura con Ctrl+V."
          className="mb-0.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) => elegir(e.target.files?.[0] ?? null)}
        />
        <textarea
          ref={area}
          value={texto}
          autoFocus={autoFocus}
          disabled={deshabilitado}
          onChange={(e) => cambiarTexto(e.target.value.slice(0, LIMITE_DE_MENSAJE))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void enviar();
            }
          }}
          onPaste={(e) => {
            const imagen = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
            if (imagen) {
              e.preventDefault();
              elegir(new File([imagen], `captura-${Date.now()}.png`, { type: imagen.type }));
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed outline-none placeholder:text-muted-foreground/70 [field-sizing:content]"
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={!listo}
          aria-label="Enviar"
          className={cn(
            'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            listo ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-secondary text-muted-foreground',
          )}
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </div>
      {pie && <div className="mt-1.5 px-1 text-[10.5px] leading-snug text-muted-foreground">{pie}</div>}
    </div>
  );
}
