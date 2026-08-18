'use client';

/**
 * Frontera de error de la aplicación.
 *
 * Hasta el 17/08/2026 no había ninguna: cualquier excepción de cliente
 * dejaba la pantalla en blanco con "Application error: a client-side
 * exception has occurred" y nada más. Eso deja al usuario sin salida y a
 * nosotros sin diagnóstico — César reportó exactamente esa pantalla y no
 * había forma de saber qué la produjo.
 *
 * Aquí el fallo se convierte en algo accionable: se dice qué pasó, se
 * ofrece reintentar sin perder la sesión, y se muestra el identificador
 * que Next asigna al error para poder cruzarlo con los registros del
 * servidor.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ErrorAplicacion({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en la consola del navegador y en los registros del servidor,
    // que es de donde se saca el diagnóstico.
    console.error('[LexIA] error no controlado:', error);
  }, [error]);

  return (
    <div className="container max-w-lg py-16">
      <Card className="p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold">Algo falló en esta pantalla</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          El resto de la plataforma sigue funcionando y tu trabajo guardado está
          intacto. Puedes reintentar; si vuelve a ocurrir, avísanos con el
          detalle de abajo.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>
            <RotateCw className="mr-1.5 h-4 w-4" />
            Reintentar
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app">
              <Home className="mr-1.5 h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>

        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Detalle técnico
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed">
            {error.message || 'Sin mensaje'}
            {error.digest ? `\n\nIdentificador: ${error.digest}` : ''}
          </pre>
        </details>
      </Card>
    </div>
  );
}
