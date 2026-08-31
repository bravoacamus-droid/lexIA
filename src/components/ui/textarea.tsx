import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:border-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Se agranda desde la esquina, no solo a lo alto.
          //
          // Observación de César (agosto de 2026), repetida en cinco
          // apartados del documento: "el cuadro debe ser redimensionable
          // desde una esquina o borde, al igual que otros numerales" y
          // "los campos donde se requiere ingresar información de más de
          // dos líneas deben ser redimensionables por el usuario desde
          // las esquinas o bordes". Un requerimiento se escribe con el
          // formato delante, y un cuadro de tres renglones para una
          // cláusula de veinte no deja leer lo que uno está escribiendo.
          //
          // El ancho máximo evita que al estirarlo se salga de la
          // columna y descoloque el formulario.
          'resize max-w-full',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
