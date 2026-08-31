/**
 * Leer la respuesta de la API sin romperse cuando no es JSON.
 *
 * POR QUÉ EXISTE
 *
 * La pantalla hacía `await res.json()` antes de mirar si la petición
 * había ido bien. Mientras el servidor responde, eso funciona. Cuando
 * quien contesta es la plataforma —un envío demasiado grande, una
 * pasarela caída, un tiempo agotado— lo que llega es una página HTML, y
 * `res.json()` lanza. El usuario ve entonces esto:
 *
 *   Fallo al leer el proyecto
 *   JSON.parse: unexpected character at line 1 column 1 of the JSON data
 *
 * Que no dice nada de lo que ocurrió ni de qué puede hacer. Le pasó a
 * César el 22/08/2026 subiendo un Word de 5,6 MB.
 *
 * Aquí se lee una sola vez, como texto, y se decide después. El mensaje
 * sale del cuerpo cuando el servidor explicó algo, y del código de
 * estado cuando no.
 */

export interface Leida<T> {
  ok: boolean;
  datos?: T;
  /** Qué decirle al usuario. Siempre en su idioma y sin códigos. */
  mensaje: string;
}

/** Lo que significa cada código cuando nadie explica nada mejor. */
function porEstado(estado: number): string {
  if (estado === 413) {
    return 'El archivo pesa demasiado para enviarlo. Prueba a quitarle las imágenes, o pega el texto en el recuadro de abajo.';
  }
  if (estado === 401) return 'La sesión ha caducado. Vuelve a entrar y repite la operación.';
  if (estado === 403) return 'No tienes permiso sobre este documento.';
  if (estado === 404) return 'No se encontró el documento.';
  if (estado === 429) return 'Demasiadas peticiones seguidas. Espera un momento y repite.';
  if (estado === 504 || estado === 408) {
    return 'El servidor tardó demasiado en responder. Si el documento es largo, prueba con la parte que te interese.';
  }
  if (estado >= 500) return 'El servidor no pudo completar la operación. Vuelve a intentarlo en un minuto.';
  return `La petición no se pudo completar (código ${estado}).`;
}

export async function leerRespuesta<T>(res: Response): Promise<Leida<T>> {
  // Una sola lectura: el cuerpo no se puede leer dos veces.
  const crudo = await res.text().catch(() => '');

  let cuerpo: unknown = null;
  try {
    cuerpo = crudo ? JSON.parse(crudo) : null;
  } catch {
    // No era JSON. No es un error a estas alturas: es información.
    cuerpo = null;
  }

  if (res.ok && cuerpo !== null) {
    return { ok: true, datos: cuerpo as T, mensaje: '' };
  }

  if (res.ok) {
    // Respondió 200 con algo que no es JSON. Pasa cuando una pasarela
    // devuelve su propia página de espera.
    return {
      ok: false,
      mensaje: 'La respuesta del servidor no se pudo interpretar. Vuelve a intentarlo.',
    };
  }

  const dicho = cuerpo as { sugerencia?: string; detail?: string; error?: string } | null;
  return {
    ok: false,
    mensaje: dicho?.sugerencia ?? dicho?.detail ?? dicho?.error ?? porEstado(res.status),
  };
}
