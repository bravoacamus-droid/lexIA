import { redirect } from 'next/navigation';

/**
 * La antigua pantalla intermedia de la llamada (elegir voz y ley).
 *
 * César pidió quitarla (27/09/2026): la llamada se inicia desde la
 * portada de «Habla con A-LexIA». Se conserva la ruta para los enlaces
 * viejos.
 */
export default function NuevaLlamadaPage() {
  redirect('/llamadas');
}
