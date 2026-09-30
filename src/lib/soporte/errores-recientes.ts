/**
 * Los últimos errores de la página, para adjuntarlos a un reporte.
 *
 * Quien reporta un error rara vez sabe qué falló por dentro; el
 * navegador sí. El botón «Ayuda» empieza a escuchar al montarse y guarda
 * los cinco más recientes (solo el mensaje, recortado): viajan en el
 * contexto del ticket cuando la persona elige «Reportar un error».
 */
const errores: string[] = [];
let escuchando = false;

function anotar(texto: string) {
  const limpio = texto.replace(/\s+/g, ' ').trim().slice(0, 280);
  if (!limpio || errores[errores.length - 1] === limpio) return;
  errores.push(`${new Date().toLocaleTimeString('es-PE')} · ${limpio}`);
  if (errores.length > 5) errores.shift();
}

export function escucharErrores() {
  if (escuchando || typeof window === 'undefined') return;
  escuchando = true;
  window.addEventListener('error', (e) => anotar(e.message || String(e.error ?? 'Error')));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | string | undefined;
    anotar(typeof r === 'string' ? r : r?.message || 'Promesa rechazada');
  });
}

export function erroresRecientes(): string[] {
  return [...errores];
}
