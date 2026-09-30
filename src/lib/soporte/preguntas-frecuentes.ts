import type { CategoriaDeTicket } from './tipos';

/**
 * Las preguntas frecuentes del botón «Ayuda».
 *
 * Cada respuesta describe la plataforma tal como está (verificado en el
 * código el 29/09/2026). Si cambia una pantalla, cambia aquí también:
 * una respuesta equivocada hace más daño que no tenerla.
 *
 * `categoria` decide en qué conversación se ofrece: al elegir «Reportar
 * un error» se muestran primero las de errores, por si la respuesta ya
 * está escrita.
 */
export interface PreguntaFrecuente {
  id: string;
  tema: 'Cuenta y plan' | 'Consultar' | 'Generar' | 'Evaluar' | 'Problemas comunes';
  categoria: CategoriaDeTicket;
  pregunta: string;
  /** Párrafos. Admite **negrita**. */
  respuesta: string[];
  /** Palabras con las que alguien buscaría esta pregunta. */
  claves: string;
  /** Un enlace para ir directo a la pantalla. */
  enlace?: { texto: string; href: string };
}

export const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  // ── Cuenta y plan ────────────────────────────────────────────────
  {
    id: 'ingresar',
    tema: 'Cuenta y plan',
    categoria: 'cuenta',
    pregunta: '¿Cómo ingreso? ¿Tengo una contraseña de A-LexIA?',
    respuesta: [
      'Se ingresa con tu cuenta de **Google** o de **Facebook**. A-LexIA no guarda una contraseña propia, así que no hay contraseña que recuperar aquí.',
      'Si no puedes entrar, revisa que estés usando la misma cuenta de Google o Facebook con la que te registraste. Si olvidaste esa contraseña, se recupera desde Google o Facebook.',
    ],
    claves: 'login ingresar entrar contraseña clave acceso google facebook sesión cuenta olvidé',
  },
  {
    id: 'perfil',
    tema: 'Cuenta y plan',
    categoria: 'cuenta',
    pregunta: '¿Cómo cambio mi perfil (Entidad, Proveedor o Consultor)?',
    respuesta: [
      'Abre el menú con tu nombre (arriba a la derecha) → **Mi perfil** → **Editar tu información**. Ahí eliges el perfil y actualizas tu nombre, organización, RUC y cargo.',
      'El menú y las herramientas se ajustan al perfil: por ejemplo, los trámites RNP son para proveedores.',
    ],
    claves: 'perfil rol entidad proveedor consultor cambiar datos nombre organización ruc cargo',
    enlace: { texto: 'Ir a Mi perfil', href: '/cuenta/perfil' },
  },
  {
    id: 'consumo',
    tema: 'Cuenta y plan',
    categoria: 'cuenta',
    pregunta: '¿Dónde veo cuánto me queda del plan?',
    respuesta: [
      'En la tarjeta del plan, al pie de la barra lateral, ves lo usado en **Consultar**, **Generar** y **Evaluar**. El detalle completo está en **Suscripción y consumo**, en el menú con tu nombre.',
      'El consumo se cuenta por **mes calendario**: el día 1 de cada mes empieza de cero.',
    ],
    claves: 'consumo cuota límite cupo plan cuánto queda mensajes documentos evaluaciones minutos renovación',
    enlace: { texto: 'Ver mi consumo', href: '/cuenta/suscripcion' },
  },
  {
    id: 'cupo-agotado',
    tema: 'Cuenta y plan',
    categoria: 'cuenta',
    pregunta: 'Se me acabó el cupo del mes, ¿qué hago?',
    respuesta: [
      'Puedes esperar al inicio del próximo mes, cuando el consumo vuelve a cero, o pasar a un plan con más capacidad.',
      'Para cambiar de plan o si necesitas más cupo por una urgencia, escríbenos por este chat o por WhatsApp y lo resolvemos contigo.',
    ],
    claves: 'agotado acabó límite alcanzado cupo sin cupo no me deja más plan mejorar',
    enlace: { texto: 'Ver los planes', href: '/pricing' },
  },
  {
    id: 'pagar',
    tema: 'Cuenta y plan',
    categoria: 'cuenta',
    pregunta: '¿Cómo contrato un plan o pago la suscripción?',
    respuesta: [
      'Revisa los planes en la página de precios. Para contratar, escríbenos por este chat o por WhatsApp: te confirmamos el plan que te conviene y te ayudamos con el pago.',
      'Para entidades con varios usuarios existe el plan **Enterprise**, que se coordina directamente con nosotros.',
    ],
    claves: 'pago pagar contratar suscripción plan precio factura tarjeta enterprise starter pro',
    enlace: { texto: 'Ver los planes', href: '/pricing' },
  },

  // ── Consultar ────────────────────────────────────────────────────
  {
    id: 'fuentes',
    tema: 'Consultar',
    categoria: 'consulta',
    pregunta: '¿De dónde saca A-LexIA sus respuestas?',
    respuesta: [
      'De su **biblioteca normativa**: la Ley N.° 32069 y su Reglamento, directivas, opiniones de la Dirección Técnico Normativa, pronunciamientos y resoluciones del Tribunal de Contrataciones, entre otros. La biblioteca se actualiza cada día.',
      'Cada respuesta **cita su fuente**: haz clic en la cita para abrir el documento en el pasaje exacto y comprobarlo.',
    ],
    claves: 'fuentes respuestas de dónde normativa ley 32069 reglamento opiniones tribunal citas biblioteca confiable',
    enlace: { texto: 'Abrir la biblioteca', href: '/biblioteca' },
  },
  {
    id: 'voz',
    tema: 'Consultar',
    categoria: 'consulta',
    pregunta: '¿Cómo consulto por voz?',
    respuesta: [
      'Entra a **Consultar → Habla con A-LexIA** y acepta el permiso del micrófono cuando el navegador lo pida. Conversas en tiempo real y al final queda el resumen de la llamada.',
      'Los minutos de voz dependen de tu plan; los ves en **Suscripción y consumo**.',
    ],
    claves: 'voz llamada hablar micrófono audio conversar minutos abogado virtual',
    enlace: { texto: 'Ir a Habla con A-LexIA', href: '/llamadas' },
  },
  {
    id: 'busqueda',
    tema: 'Consultar',
    categoria: 'consulta',
    pregunta: '¿Cómo encuentro documentos que contengan varias palabras a la vez?',
    respuesta: [
      'Usa **Consultar → Búsqueda avanzada**. Encuentra los documentos que contienen **todos** los términos que escribas y te muestra el pasaje exacto de cada uno.',
      'En la **Biblioteca normativa** puedes además filtrar por tipo, año y entidad, y guardar los documentos que uses seguido.',
    ],
    claves: 'buscar búsqueda palabras exacta frase encontrar documento filtrar tipo año',
    enlace: { texto: 'Ir a Búsqueda avanzada', href: '/buscador' },
  },

  // ── Generar ──────────────────────────────────────────────────────
  {
    id: 'word',
    tema: 'Generar',
    categoria: 'consulta',
    pregunta: '¿Cómo descargo el documento en Word?',
    respuesta: [
      'Cuando el documento está listo aparece el botón **Descargar Word**. El archivo sale con el formato de la unidad que lo emite, listo para revisarlo y firmarlo.',
    ],
    claves: 'descargar word docx archivo bajar documento exportar',
  },
  {
    id: 'bloqueado',
    tema: 'Generar',
    categoria: 'error',
    pregunta: 'Dice «Documento definitivo bloqueado», ¿por qué?',
    respuesta: [
      'Antes de entregar un documento, A-LexIA **audita** cada monto, fecha, contrato y artículo citado contra tus documentos y la biblioteca. Si encuentra un error, no lo entrega como versión definitiva.',
      'Revisa las observaciones de la auditoría, corrige el dato o sube el documento que falta y vuelve a generar. Mientras tanto puedes **descargarlo como borrador condicionado**.',
      'Si crees que la auditoría se equivoca, repórtalo aquí con una captura: lo revisamos.',
    ],
    claves: 'bloqueado definitivo auditoría no deja descargar error borrador condicionado',
  },
  {
    id: 'expediente',
    tema: 'Generar',
    categoria: 'consulta',
    pregunta: '¿Qué necesito para un documento de ejecución contractual?',
    respuesta: [
      'Crea un **expediente** en **Generar → Documentos de ejecución contractual** y sube el contrato y los documentos del caso (solicitudes, informes, adendas) en **PDF o Word (.docx)**; también se leen escaneos.',
      'A-LexIA los lee, arma la ficha del contrato, te hace solo las preguntas que faltan y calcula plazos, porcentajes y penalidades antes de redactar.',
    ],
    claves: 'ejecución contractual expediente adicional reducción ampliación plazo penalidad resolución informe memorándum acta subir contrato',
    enlace: { texto: 'Ir a ejecución contractual', href: '/generador' },
  },
  {
    id: 'requerimiento',
    tema: 'Generar',
    categoria: 'consulta',
    pregunta: '¿Puedo continuar un requerimiento que ya tenía redactado?',
    respuesta: [
      'Sí. En **Generar → Requerimientos** elige el formato y usa **Cargar proyecto**: sube tu borrador (PDF, Word, .txt o .md) y A-LexIA lo reparte en los apartados del formato para que sigas desde ahí.',
    ],
    claves: 'requerimiento términos de referencia especificaciones técnicas formato cargar proyecto borrador continuar',
    enlace: { texto: 'Ir a Requerimientos', href: '/generador/requerimiento-plantilla' },
  },

  // ── Evaluar ──────────────────────────────────────────────────────
  {
    id: 'evaluar',
    tema: 'Evaluar',
    categoria: 'consulta',
    pregunta: '¿Qué puedo evaluar con A-LexIA?',
    respuesta: [
      'Según tu perfil: el **requerimiento**, las **bases** del procedimiento, las **ofertas**, y las **consultas y observaciones**. Los proveedores tienen además la **revisión de su propia oferta** antes de presentarla.',
      'Todo está en **Evaluar**, en la barra lateral.',
    ],
    claves: 'evaluar evaluación ofertas bases requerimiento consultas observaciones revisar oferta',
    enlace: { texto: 'Ir a Evaluar', href: '/evaluar' },
  },

  // ── Problemas comunes ────────────────────────────────────────────
  {
    id: 'no-carga',
    tema: 'Problemas comunes',
    categoria: 'error',
    pregunta: 'La página no carga o se queda en blanco',
    respuesta: [
      'Recarga la página sin caché: **Ctrl + F5** en Windows o **Cmd + Shift + R** en Mac. Suele bastar después de una actualización de la plataforma.',
      'Si sigue igual, prueba en otra pestaña o en Chrome o Edge actualizados, y repórtalo aquí con una captura.',
    ],
    claves: 'no carga blanco lento colgado congelado error pantalla recargar actualizar',
  },
  {
    id: 'microfono',
    tema: 'Problemas comunes',
    categoria: 'error',
    pregunta: 'La llamada no me escucha o no se oye',
    respuesta: [
      'Haz clic en el **candado** junto a la dirección de la página → **Micrófono** → **Permitir**, y recarga. Revisa también que el micrófono correcto esté elegido en tu computadora.',
      'Funciona mejor en **Chrome** o **Edge** actualizados.',
    ],
    claves: 'micrófono no escucha no se oye audio sonido permiso llamada voz',
  },
  {
    id: 'escaneado',
    tema: 'Problemas comunes',
    categoria: 'error',
    pregunta: 'Subí un PDF escaneado y no lo lee bien',
    respuesta: [
      'Los escaneos se transcriben página por página, así que tardan más que un PDF con texto. Si la imagen está borrosa, torcida o con sellos encima del texto, algunos datos pueden salir mal.',
      'Cuando puedas, sube el PDF original (no una foto o un escaneo). Si un dato quedó mal, repórtalo aquí con el nombre del archivo.',
    ],
    claves: 'pdf escaneado escaneo imagen foto no lee ocr texto mal leído archivo',
  },
];

/** Minúsculas y sin tildes, para buscar «penalidad» con «penalídad». */
function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Palabras que aparecen en casi cualquier mensaje: con ellas, «el acta del
// contrato menor sale en blanco» sugería «¿Cómo contrato un plan?».
const COMUNES = new Set(
  'que los las del por para con una uno sin pero como esta este esto eso hay mas muy mis tus sus cuando donde porque tengo quiero puedo hola favor gracias ayuda lexia alexia contrato contratos documento documentos plataforma sale salio aparece pasa paso hace queda'.split(' '),
);

/** Las preguntas que mejor responden a lo que la persona escribió. */
export function buscarPreguntas(texto: string, limite = 4): PreguntaFrecuente[] {
  const palabras = normalizar(texto)
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length > 2 && !COMUNES.has(p));
  if (palabras.length === 0) return [];
  return PREGUNTAS_FRECUENTES.map((p) => {
    // Palabra por palabra, no trozos de texto: «acta» no está en
    // «exacta» ni «pro» en «proveedor». Con cinco letras o más vale la
    // raíz común, para que «documentos» encuentre «documento».
    const campo = normalizar(`${p.pregunta} ${p.claves}`).split(/[^a-z0-9ñ]+/);
    const coincide = (w: string) =>
      campo.some((c) => c === w || (w.length >= 5 && c.length >= 5 && (c.startsWith(w) || w.startsWith(c))));
    const puntos = palabras.reduce((s, w) => s + (coincide(w) ? (w.length > 5 ? 2 : 1) : 0), 0);
    return { p, puntos };
  })
    .filter((r) => r.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, limite)
    .map((r) => r.p);
}

export const TEMAS = ['Cuenta y plan', 'Consultar', 'Generar', 'Evaluar', 'Problemas comunes'] as const;
