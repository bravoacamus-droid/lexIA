/**
 * Verificación ítem por ítem de los requisitos de calificación que más
 * se discuten: equipamiento, experiencia del personal clave e
 * infraestructura.
 *
 * POR QUÉ
 *
 * En la evaluación del CP SER-SM-6-2026 (documento 13 de César,
 * 10/10/2026), «Equipamiento estratégico» —dieciocho tipos de equipo—
 * se resolvía en una sola ficha, y el modelo devolvía un «cumple»
 * general sin mirar cada máquina. Así pasaron:
 *   · una motoniveladora exigida «con ripper» cuyo ripper solo aparecía
 *     como opcional en la ficha de catálogo del modelo;
 *   · un compromiso de alquiler de Ferreyros «sujeto a la aprobación de
 *     crédito» y a «las disponibilidades vigentes», que no garantiza la
 *     disponibilidad (Resolución N° 3362-2021-TCE-S3);
 *   · potencias que no coinciden entre compromiso, factura y ficha;
 *   · certificados del personal clave sin la obra de la que sale la
 *     experiencia (Resolución N° 08305-2026-TCP-S2).
 * Obligar a recorrer cada equipo, cada profesional y cada local, con su
 * documento y su folio, es lo que hace que esas observaciones aparezcan.
 */
import { generateText } from 'ai';
import { chatModel, fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { FichaRequisito, Resultado } from './etapas';
import { TOPE_OFERTA } from './motor';
import { contarUnidades, plano, revisarLocales, revisarUnidades, tablaDeEquipos, tipoDeEquipo } from './equipos';
import { cargosDeBases, comprobarPersonal, observacionDeCargo } from './personal';
import { verificarExperiencia } from './experiencia';

type Clase = 'equipamiento' | 'personal' | 'infraestructura' | 'experiencia';

export function claseDeVerificacion(requisito: string, regla: string): Clase | null {
  const t = `${requisito} ${regla}`;
  if (/equipamiento|maquinaria|equipo estrat/i.test(t)) return 'equipamiento';
  if (/infraestructura|local(es)? de|almac[ée]n|taller/i.test(t)) return 'infraestructura';
  // Los nombres de las fichas varían: «El postor debe acreditar un monto
  // facturado…» es la experiencia del postor; «Un (01) Ingeniero… con
  // experiencia de 02 años» con regla «Responsable de la ejecución del
  // servicio» es personal clave (servicio de estructura metálica de Socos).
  if (/monto facturado|experiencia del postor|postor en la especialidad/i.test(t)) return 'experiencia';
  if (
    /experiencia/i.test(t) &&
    /personal|residente|especialista|jefe|profesional|responsable|ingenier|t[ée]cnico|soldad|operari|supervisor|coordinador/i.test(t) &&
    !/formaci[óo]n acad[ée]mica/i.test(requisito)
  )
    return 'personal';
  return null;
}

const COMUN = `Devuelve SOLO este JSON, sin markdown:
{"items": [{"item": "", "exigido": "lo que piden las Bases para este ítem, con cifras", "documentos": [{"documento": "", "folio": "", "cita": "texto literal breve"}], "acreditado": "lo que efectivamente acreditan los documentos", "observaciones": ["cada problema concreto, con folio"], "resultado": "cumple"|"no_cumple"|"revision_humana"}], "resultado": "cumple"|"no_cumple"|"revision_humana", "hallazgo": "conclusión de la ficha en 3 a 6 oraciones, nombrando cada ítem que no cumple o que queda para el comité y por qué"}

Reglas comunes:
· Un ítem por cada elemento que exigen las Bases. Ninguno se omite.
· Cada afirmación, con el documento y el folio o página («=== Página N ===») donde consta. Lo que no encuentres, dilo: no lo des por acreditado.
· "no_cumple" cuando lo exigido no está acreditado; "revision_humana" cuando hay una incongruencia cuya consecuencia no es clara (el comité decide); "cumple" solo si todo lo exigido consta.
· En "observaciones" van TODOS los problemas de cada ítem, no solo el primero que encuentres: un compromiso puede ser condicionado Y no acreditar un accesorio, y el comité necesita saber las dos cosas.
· El resultado de la ficha es el peor de sus ítems.
· Lo que no se pueda comprobar con la oferta (el estado del RUC del emisor ante la SUNAT, por ejemplo) se anota como verificación para el comité, sin darlo por cierto.`;

const INSTRUCCIONES: Record<Exclude<Clase, 'experiencia'>, string> = {
  equipamiento: `Verificas el EQUIPAMIENTO ESTRATÉGICO de una oferta, ÍTEM POR ÍTEM: un ítem por cada equipo exigido (y por cada unidad si las Bases piden varias).

QUÉ SE EXIGE PARA CALIFICAR: las características del equipo que fija el requisito de calificación (cantidad, tipo, potencia, capacidad, antigüedad, accesorios) y su "Acreditación" (por lo general, documentos que sustenten la propiedad, la posesión, el compromiso de compraventa o alquiler). Los documentos de vigencia que el requerimiento técnico pide para la EJECUCIÓN —SOAT, certificado de inspección técnica vehicular, tarjeta única de circulación, licencia de conducir, certificado de operatividad o de operador— NO se exigen en la oferta, salvo que la "Acreditación" del requisito de calificación los pida expresamente: exigir lo que la acreditación no pide es exigir un requisito no previsto. Si faltan, puedes anotarlo como dato para la ejecución, sin que el ítem deje de cumplir por eso.

Para cada equipo:
1. Lo exigido: cantidad, tipo, potencia, capacidad, año, y CADA accesorio o componente («con ripper», «con escarificador», «con martillo»…).
2. Los documentos que lo acreditan: compromiso de alquiler o de compraventa, factura, tarjeta de propiedad o identificación vehicular, ficha técnica.
3. Cada componente exigido debe constar para la UNIDAD ofertada. Una ficha de catálogo que lista el accesorio como «opcional» o como equipo disponible para la serie NO acredita que esta máquina lo tenga: si nada más lo acredita, el ítem no cumple.
4. Las características del mismo equipo deben coincidir entre sus documentos. Si el compromiso dice 171-195 HP, la factura otro rango y la ficha del modelo 170-190 HP, anótalo con folios y di si impide saber si cumple el rango exigido.
5. El compromiso: quién lo emite —razón social, representante, membrete y firma deben ser de la misma empresa; si el texto nombra a una empresa y el membrete y la firma son de otra, anótalo—, a favor de quién (el postor o sus integrantes), su fecha, y si es FIRME. Uno sujeto a «disponibilidad de stock», «disponibilidades vigentes», «aprobación de crédito» u otra condición futura e incierta no garantiza la disponibilidad del equipo (Resolución N° 3362-2021-TCE-S3): ese ítem no cumple.`,
  personal: `Verificas la EXPERIENCIA DEL PERSONAL CLAVE de una oferta, PROFESIONAL POR PROFESIONAL: un ítem por cada cargo exigido.

Para cada profesional:
1. Lo exigido: cargo, tiempo (meses o años) y TIPO de experiencia (en qué obras o servicios, en qué cargos).
2. Cada certificado o constancia: empleador, OBRA O SERVICIO de la que proviene la experiencia, cargo, fechas de inicio y fin, meses que computa.
3. Si un certificado no dice de qué obra o servicio proviene la experiencia —solo el cargo y el tiempo—, anótalo: la Resolución N° 08305-2026-TCP-S2 exige que la experiencia del personal clave se acredite objetivamente detallando de qué obras o servicios proviene, sin que baste consignar el plazo.
4. Suma los meses computables sin traslapes y compáralos con lo exigido. Muestra la cuenta.`,
  infraestructura: `Verificas la INFRAESTRUCTURA ESTRATÉGICA de una oferta, LOCAL POR LOCAL: un ítem por cada local o instalación exigida.

Para cada local:
1. Lo exigido: tipo, cantidad, ubicación (en el lugar de ejecución o zonas colindantes) y distancias (por ejemplo, separados al menos 30 km).
2. El documento (compromiso de alquiler, título, contrato): quién lo otorga, a favor de quién, fecha, si es firme.
3. La ubicación debe permitir verificar lo exigido: distrito, provincia y departamento, o una dirección precisa. Un nombre de localidad suelto («Ocaña», «Laramate») no permite comprobar la ubicación ni la distancia: anótalo.`,
};

/**
 * Las frases que condicionan un compromiso, buscadas en la oferta antes
 * de dársela al modelo. Leyendo seiscientos mil caracteres, el modelo
 * encontró que al tractor de Ferreyros le faltaba el ripper pero no vio
 * que el compromiso estaba «sujeto a la aprobación de crédito», dos
 * líneas más arriba. Se le señalan con su página para que las resuelva.
 */
const CONDICIONES =
  /(?:sujet[oa]s?\s+a\s+(?:la\s+)?(?:aprobaci[óo]n\s+(?:de(?:l)?\s+)?cr[ée]dito|disponibilidad|stock|confirmaci[óo]n)|disponibilidad(?:es)?\s+(?:de\s+stock|vigentes)|previa\s+confirmaci[óo]n\s+de\s+stock|seg[úu]n\s+disponibilidad|salvo\s+venta|hasta\s+agotar\s+stock)/gi;

/**
 * Los accesorios que el requisito exige («con ripper», «con escarificador»,
 * «con 03 portavástagos»…) y las páginas de la oferta donde ese accesorio
 * figura como OPCIONAL.
 *
 * La motoniveladora del Consorcio Ayacucho se exigía «con ripper
 * (desgarrador y escarificador)», y la ficha de catálogo de la página 354
 * dice «Escarificador de 09 puntas (Opcional)» bajo «EQUIPO OPCIONAL».
 * Una corrida lo vio y la siguiente no: se le señala al modelo.
 */
const ACCESORIO =
  /\b(ripper|desgarrador|escarificador|martillo(?:\s+hidr[áa]ulico)?|portav[áa]stagos|cuchar[óo]n|balde|lampa|radio\s+transmisor|winche|grúa|pluma|tolva)\b/gi;

export function avisosDeAccesorio(texto: string, exigencia: string): string[] {
  const exigidos = new Set([...exigencia.matchAll(ACCESORIO)].map((m) => m[1].toLowerCase().slice(0, 7)));
  if (exigidos.size === 0) return [];
  const avisos: string[] = [];
  for (const m of texto.matchAll(ACCESORIO)) {
    if (!exigidos.has(m[1].toLowerCase().slice(0, 7))) continue;
    const cerca = texto.slice(Math.max(0, m.index! - 160), m.index! + 160);
    if (!/opcional|optativ|no\s+incluid|a\s+pedido/i.test(cerca)) continue;
    const antes = texto.slice(0, m.index);
    const pagina = [...antes.matchAll(/=== P[áa]gina (\d+) ===/g)].pop()?.[1];
    const tomo = [...antes.matchAll(/^=== TOMO (\d+)/gm)].pop()?.[1];
    const aviso = `${tomo ? `Tomo ${tomo}, ` : ''}${pagina ? `página ${pagina}` : 'sin página'}: «…${cerca.replace(/\s+/g, ' ')}…»`;
    if (!avisos.some((a) => a.startsWith(aviso.slice(0, 20)))) avisos.push(aviso);
    if (avisos.length >= 10) break;
  }
  return avisos;
}

function avisosDeCondicion(texto: string): string[] {
  const avisos: string[] = [];
  for (const m of texto.matchAll(CONDICIONES)) {
    const antes = texto.slice(0, m.index);
    const pagina = [...antes.matchAll(/=== P[áa]gina (\d+) ===/g)].pop()?.[1];
    const tomo = [...antes.matchAll(/^=== TOMO (\d+)/gm)].pop()?.[1];
    const contexto = texto.slice(Math.max(0, m.index! - 220), m.index! + 120).replace(/\s+/g, ' ');
    avisos.push(`${tomo ? `Tomo ${tomo}, ` : ''}${pagina ? `página ${pagina}` : 'sin página'}: «…${contexto}…»`);
    if (avisos.length >= 12) break;
  }
  return avisos;
}

/**
 * Quién otorga cada compromiso, según su texto, su membrete y su firma.
 *
 * En la oferta del Consorcio Mantenimiento Vial Ayacucho (CP
 * SER-SM-6-2026), el compromiso de la página 156 dice «en representación
 * de la empresa MARVI CONSTRUCTORA», pero el membrete, la firma y el RUC
 * son de SOILTEST PERU S.R.L. César pidió que se advierta (documento 13).
 * El verificador, leyendo la oferta entera, no lo vio: aquí se leen solo
 * las páginas de compromisos, una por una, y la comparación de nombres es
 * de código.
 */
interface EmisorDePagina {
  pagina: string;
  otorganteEnTexto: string;
  rucEnTexto: string;
  membrete: string;
  empresaDelFirmante: string;
}

const PAGINA_DE_COMPROMISO = /compromiso|promesa de (?:alquiler|arrendamiento|venta)|carta de disponibilidad|cesi[óo]n en uso/i;
const DE_ALQUILER = /alquil|arrend|disponibilidad|cesi[óo]n/i;

function paginasDeCompromisos(texto: string): Array<{ etiqueta: string; texto: string }> {
  const salida: Array<{ etiqueta: string; texto: string }> = [];
  let tomo = '';
  for (const trozo of texto.split(/(?==== P[áa]gina \d+ ===|^=== TOMO \d+)/m)) {
    const t = trozo.match(/^=== TOMO (\d+)/);
    if (t) {
      tomo = t[1];
      continue;
    }
    const n = trozo.match(/^=== P[áa]gina (\d+) ===/)?.[1];
    if (!n || !PAGINA_DE_COMPROMISO.test(trozo) || !DE_ALQUILER.test(trozo)) continue;
    salida.push({ etiqueta: `${tomo ? `tomo ${tomo}, ` : ''}página ${n}`, texto: trozo.slice(0, 4000) });
  }
  return salida.slice(0, 60);
}

const SOCIETARIO = /\b(s\.?\s?a\.?\s?c\.?|s\.?\s?r\.?\s?l\.?|e\.?\s?i\.?\s?r\.?\s?l\.?|s\.?\s?a\.?|sociedad|an[óo]nima|cerrada|empresa|contratistas?|generales?|constructora|corporaci[óo]n|inversiones|servicios|ingenier[íi]a|consultores|per[úu]|y|de|del|la|el|&)\b/gi;
function nucleo(nombre: string): Set<string> {
  return new Set(
    nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(SOCIETARIO, ' ')
      .match(/[a-z0-9]{3,}/g) ?? [],
  );
}
function mismaEmpresa(a: string, b: string): boolean {
  const x = nucleo(a);
  const y = nucleo(b);
  if (x.size === 0 || y.size === 0) return true; // sin datos no se acusa
  return [...x].some((w) => y.has(w));
}

interface Emisores {
  avisos: string[];
  /** Quién otorga cada compromiso, con su RUC, para consultarlo en la SUNAT. */
  otorgantes: string[];
}

const EMISORES = new Map<string, Promise<Emisores>>();

/**
 * `propios`: el postor y sus integrantes. Su nombre en el membrete no es
 * una incongruencia: es el encabezado que el postor imprime en todas las
 * páginas de su oferta (el Consorcio Mega lo tiene en cada folio).
 */
export async function avisosDeEmisor(texto: string, propios: string[] = []): Promise<string[]> {
  return (await leerEmisoresUnaVez(texto, propios)).avisos;
}

/**
 * Los otorgantes de los compromisos con su RUC. El estado del RUC en la
 * SUNAT no se puede comprobar con la oferta: el compromiso de Inversiones
 * Amdet E.I.R.L. del Consorcio Mega se habría firmado con la empresa en
 * suspensión temporal de actividades (César, documento 13). Se le da al
 * comité la lista para que lo consulte.
 */
export async function otorgantesDeCompromisos(texto: string, propios: string[] = []): Promise<string[]> {
  return (await leerEmisoresUnaVez(texto, propios)).otorgantes;
}

function leerEmisoresUnaVez(texto: string, propios: string[]): Promise<Emisores> {
  const clave = `${texto.length}:${texto.slice(0, 300)}:${texto.slice(-300)}`;
  let p = EMISORES.get(clave);
  if (!p) {
    p = leerEmisores(texto, propios).catch((e) => {
      console.warn('[evaluacion] lectura de emisores omitida:', (e as Error).message.slice(0, 160));
      return { avisos: [], otorgantes: [] };
    });
    EMISORES.set(clave, p);
    if (EMISORES.size > 20) EMISORES.delete(EMISORES.keys().next().value!);
  }
  return p;
}

const PERSONA_JURIDICA = /\b(s\.?\s?a\.?\s?c|s\.?\s?r\.?\s?l|e\.?\s?i\.?\s?r\.?\s?l|s\.?\s?a\.?a?|sociedad|empresa|corporaci|consorcio|inversiones|contratistas?|constructora)\b/i;

async function leerEmisores(texto: string, propios: string[]): Promise<Emisores> {
  const paginas = paginasDeCompromisos(texto);
  const lotes: Array<typeof paginas> = [];
  for (let i = 0; i < paginas.length; i += 15) lotes.push(paginas.slice(i, i + 15));
  const leidas = (
    await Promise.all(
      lotes.map(async (lote) => {
        const { text } = await generateText({
          model: fastModel,
          system: `Lees páginas de una oferta en una contratación pública. Para cada página que sea un compromiso, carta o promesa de alquiler, arrendamiento o disponibilidad de equipos o locales, extrae quién lo otorga según cada fuente, COPIANDO los nombres tal como aparecen:
· "otorganteEnTexto": la empresa o persona que el CUERPO del texto dice que otorga el compromiso («en representación de la empresa X», «X, con RUC…, se compromete»).
· "rucEnTexto": el RUC que el texto atribuye al otorgante.
· "membrete": la empresa del encabezado o del pie de página (logo, razón social, dirección).
· "empresaDelFirmante": la empresa que consta en la firma o el sello («Gerente General de X», sello de X).
Deja vacío lo que no conste. Omite las páginas que no son compromisos.
Devuelve SOLO JSON: {"paginas": [{"pagina": "la etiqueta tal como viene", "otorganteEnTexto": "", "rucEnTexto": "", "membrete": "", "empresaDelFirmante": ""}]}`,
          prompt: lote.map((x) => `##### ${x.etiqueta}\n${x.texto}`).join('\n\n'),
          temperature: 0,
          maxTokens: 6000,
          abortSignal: AbortSignal.timeout(90_000),
        });
        const o = parseJsonLoose(text) as { paginas?: Array<Record<string, unknown>> } | null;
        return (o?.paginas ?? []).map(
          (x): EmisorDePagina => ({
            pagina: String(x.pagina ?? ''),
            otorganteEnTexto: String(x.otorganteEnTexto ?? '').trim(),
            rucEnTexto: String(x.rucEnTexto ?? '').trim(),
            membrete: String(x.membrete ?? '').trim(),
            empresaDelFirmante: String(x.empresaDelFirmante ?? '').trim(),
          }),
        );
      }),
    )
  ).flat();

  const avisos: string[] = [];
  for (const e of leidas) {
    // Una persona natural que firma con el nombre de su negocio no es
    // una incongruencia que el texto permita juzgar.
    if (!e.otorganteEnTexto || !PERSONA_JURIDICA.test(e.otorganteEnTexto)) continue;
    const delPostor = (n: string) => propios.some((x) => mismaEmpresa(x, n));
    const otras = [
      e.membrete && !mismaEmpresa(e.otorganteEnTexto, e.membrete) && !delPostor(e.membrete)
        ? `el membrete es de ${e.membrete}`
        : '',
      e.empresaDelFirmante && !mismaEmpresa(e.otorganteEnTexto, e.empresaDelFirmante)
        ? `la firma o el sello son de ${e.empresaDelFirmante}`
        : '',
    ].filter(Boolean);
    if (otras.length === 0) continue;
    avisos.push(
      `${e.pagina}: el texto dice que otorga el compromiso ${e.otorganteEnTexto}${e.rucEnTexto ? ` (RUC ${e.rucEnTexto})` : ''}, pero ${otras.join(' y ')}.`,
    );
  }
  const otorgantes = new Map<string, string>();
  for (const e of leidas) {
    const ruc = e.rucEnTexto.replace(/\D/g, '');
    if (ruc.length !== 11 || propios.some((x) => mismaEmpresa(x, e.otorganteEnTexto))) continue;
    otorgantes.set(ruc, `${e.otorganteEnTexto} (RUC ${ruc}, ${e.pagina})`);
  }
  return { avisos, otorgantes: [...otorgantes.values()] };
}

/**
 * El texto de las Bases para el requisito: la tabla con cantidades y
 * características, y su «Acreditación».
 *
 * La ficha solo trae un rótulo («Capítulo III, numeral 3.5.1 B.2»), y sin
 * la tabla el verificador adivinaba: al Consorcio Mantenimiento Vial
 * Ayacucho le exigió tres rodillos y tres cisternas donde las Bases piden
 * dos. Se toma el pasaje del requisito de calificación (el que trae
 * «Acreditación»), no el del requerimiento técnico.
 */
// En mayúsculas: el encabezado del requisito, no la frase «tiempo de
// experiencia del personal clave propuesto» de un párrafo.
const ENCABEZADO: Record<Clase, RegExp> = {
  equipamiento: /EQUIPAMIENTO\s+ESTRAT[ÉE]GICO/g,
  infraestructura: /INFRAESTRUCTURA\s+ESTRAT[ÉE]GICA/g,
  personal: /EXPERIENCIA\s+DEL\s+PERSONAL\s+CLAVE/g,
  experiencia: /EXPERIENCIA\s+DEL\s+POSTOR\s+EN\s+LA\s+ESPECIALIDAD/g,
};
const ACREDITACION = /Acreditaci[óo]n\s*:/i;

export function extractoDeBases(textoBases: string, clase: Clase): string {
  // El último encabezado con su «Acreditación» cerca: el índice está al
  // principio, y la tabla de los requisitos de calificación, después.
  const candidatos = [...textoBases.matchAll(ENCABEZADO[clase])]
    .map((m) => textoBases.slice(m.index!, m.index! + 9000))
    .filter((c) => {
      const i = c.search(ACREDITACION);
      return i >= 150 && i <= 7000;
    });
  const elegido = candidatos.at(-1);
  if (!elegido) return '';
  const fin = elegido.search(ACREDITACION);
  // Hasta el final del párrafo de la acreditación, sin entrar en el
  // requisito siguiente («B.3 INFRAESTRUCTURA…», «C. PARTICIPACIÓN…»).
  const resto = elegido.slice(fin, fin + 900);
  const corte = resto.search(/\s(?:[A-D]\.\d(?:\.\d)?\.?\s+[A-ZÁÉÍÓÚÑ]{4}|[A-D]\.\s+[A-ZÁÉÍÓÚÑ]{4})/);
  return elegido.slice(0, fin + (corte > 20 ? corte : resto.length)).trim();
}

/**
 * Documentos de vigencia que el requerimiento técnico pide para ejecutar
 * el contrato. Si la «Acreditación» del requisito no los pide, su falta no
 * descalifica: el Consorcio Mega quedó «no cumple» por no traer
 * certificados de operador que solo se exigen para la ejecución.
 */
const VIGENCIA =
  /SOAT|inspecci[óo]n\s+(?:t[ée]cnica\s+)?vehicular|CITV|tarjeta\s+[úu]nica\s+de\s+circulaci|habilitaci[óo]n\s+vehicular|licencia\s+de\s+conducir|certificado\s+de\s+operatividad|certificado\s+de\s+operador|certificado\s+de\s+(?:verificaci[óo]n|calibraci[óo]n)|operador(?:es)?\s+(?:en\s+la\s+especialidad|calificad)/i;

function separarVigencia(
  item: { item: string; resultado: Resultado; observaciones: string[] },
  acreditacion: string,
): string[] {
  if (!item || VIGENCIA.test(acreditacion)) return [];
  const deVigencia = item.observaciones.filter((o) => VIGENCIA.test(o));
  if (deVigencia.length === 0) return [];
  item.observaciones = item.observaciones.filter((o) => !VIGENCIA.test(o));
  // Si solo faltaban documentos de vigencia, el ítem cumple.
  if (item.observaciones.length === 0 && item.resultado !== 'cumple') item.resultado = 'cumple';
  return deVigencia;
}

/** Observaciones que dicen que faltan unidades. */
const DE_CANTIDAD = /falta(?:n)?\s+(?:acreditar\s+)?\d|se\s+acredita(?:n)?\s+(?:solo\s+|únicamente\s+)?\d+\s+de\s+\d+|cantidad\s+(?:exigida|insuficiente)|unidades?\s+(?:exigidas|faltantes)|frente\s+a\s+las?\s+\d+\s+(?:solicitad|requerid|exigid)|solo\s+se\s+acredita/i;

/**
 * Si la ficha es de un solo cargo («Especialista en Estructuras»), solo
 * ese cargo; si no se reconoce ninguno, todos.
 */
function cargosDeLaFicha<T extends { cargo: string }>(cargos: T[], ficha: FichaRequisito): T[] {
  const t = plano(`${ficha.requisito} ${ficha.reglaBases}`);
  const suyos = cargos.filter((c) =>
    plano(c.cargo)
      .split(' ')
      .filter((w) => w.length >= 6)
      .some((w) => t.includes(w)),
  );
  return suyos.length ? suyos : cargos;
}

export async function verificarFicha(args: {
  clase: Clase;
  ficha: FichaRequisito;
  textoOferta: string;
  nombrePostor: string;
  identificacion?: string;
  /** Los integrantes del consorcio, si lo es. */
  propios?: string[];
  /** El texto completo de las Bases, para leer el requisito tal como está. */
  textoBases?: string;
}): Promise<FichaRequisito> {
  const extracto = args.textoBases ? extractoDeBases(args.textoBases, args.clase) : '';
  // La experiencia del postor tiene su propia revisión (experiencia.ts).
  if (args.clase === 'experiencia') {
    return verificarExperiencia({
      ficha: args.ficha,
      textoOferta: args.textoOferta,
      extracto,
      textoBases: args.textoBases ?? '',
      nombrePostor: args.nombrePostor,
    });
  }
  const { ficha } = args;
  const clase = args.clase;
  const avisos = clase === 'personal' ? [] : avisosDeCondicion(args.textoOferta);
  const opcionales =
    clase === 'equipamiento'
      ? avisosDeAccesorio(args.textoOferta, `${ficha.requisito} ${ficha.reglaBases} ${extracto}`)
      : [];
  const emisores =
    clase === 'personal' ? [] : await avisosDeEmisor(args.textoOferta, [args.nombrePostor, ...(args.propios ?? [])]);
  // Unidades y accesorios, en consultas propias (equipos.ts), mientras
  // corre la lectura general.
  const tabla = clase === 'equipamiento' ? tablaDeEquipos(extracto) : [];
  const comprobaciones = Promise.all([
    contarUnidades(args.textoOferta, tabla).catch(() => []),
    revisarUnidades(args.textoOferta, tabla).catch(() => []),
  ]);
  const otorgantes =
    clase !== 'equipamiento'
      ? Promise.resolve([] as string[])
      : otorgantesDeCompromisos(args.textoOferta, [args.nombrePostor, ...(args.propios ?? [])]).catch(() => []);
  const deLocales = clase === 'infraestructura' ? revisarLocales(args.textoOferta).catch(() => []) : Promise.resolve([]);
  const delPersonal =
    clase === 'personal' && extracto
      ? comprobarPersonal(args.textoOferta, cargosDeLaFicha(cargosDeBases(extracto), ficha)).catch(() => [])
      : Promise.resolve([]);
  const peticion = {
    model: chatModel,
    system: `${INSTRUCCIONES[clase]}\n\n${COMUN}`,
    prompt: `POSTOR: ${args.nombrePostor}
${args.identificacion ?? ''}

REQUISITO DE LAS BASES: ${ficha.requisito}
EXIGENCIA: ${ficha.reglaBases}
${
  extracto
    ? `
TEXTO DE LAS BASES PARA ESTE REQUISITO (manda sobre cualquier resumen: cantidades, características y «Acreditación» son las de aquí):
${extracto}
`
    : ''
}

CONCLUSIÓN PROVISIONAL (de una lectura general, puede estar equivocada): ${ficha.resultado} — ${ficha.hallazgo}
${
  opcionales.length
    ? `
ACCESORIOS EXIGIDOS QUE LA OFERTA MUESTRA COMO «OPCIONALES», encontrados en la oferta. Para cada uno, di a qué equipo y unidad corresponde y si otro documento de la oferta (compromiso, factura, tarjeta) acredita que ESA unidad tiene el accesorio; si nada más lo acredita, el ítem no cumple:
${opcionales.map((a) => `· ${a}`).join('\n')}
`
    : ''
}
${
  avisos.length
    ? `
FRASES QUE CONDICIONAN UN COMPROMISO, encontradas en la oferta. Para cada una, di a qué documento y a qué ítem corresponde y si ese compromiso deja de ser firme:
${avisos.map((a) => `· ${a}`).join('\n')}
`
    : ''
}
${
  emisores.length
    ? `
COMPROMISOS CUYO OTORGANTE NO COINCIDE entre el texto, el membrete y la firma (leídos página por página). Para cada uno que corresponda a este requisito: anótalo en su ítem con la página; di si una lectura integral del documento —membrete, firma, sello, RUC— permite identificar quién lo emite; y deja ese ítem en "revision_humana" para que el comité decida si el documento es válido —salvo que la diferencia sea a todas luces un error de lectura de letras parecidas, o que otro documento firme acredite el mismo equipo o local—:
${emisores.map((a) => `· ${a}`).join('\n')}
`
    : ''
}
OFERTA DEL POSTOR:
${args.textoOferta.slice(0, TOPE_OFERTA)}

Verifica ítem por ítem y devuelve el JSON.`,
    temperature: 0.1,
    maxTokens: 24_000,
  };
  type Respuesta = { items?: Array<Record<string, unknown>>; resultado?: unknown; hallazgo?: unknown };
  // Un JSON roto no puede llevarse la verificación entera, y con ella los
  // controles de código (pasó con el personal clave del CP SER-SM-6-2026):
  // se pide otra vez y, si vuelve a fallar, siguen solo los controles.
  let o: Respuesta = {};
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const { text } = await generateText({ ...peticion, abortSignal: AbortSignal.timeout(240_000) });
      o = parseJsonLoose(text) as Respuesta;
      break;
    } catch (e) {
      console.warn(`[evaluacion] verificación de «${ficha.requisito.slice(0, 60)}», intento ${intento}:`, (e as Error).message.slice(0, 120));
    }
  }
  const items = (o.items ?? []).map((x) => ({
    item: String(x.item ?? '').trim(),
    resultado: (['cumple', 'no_cumple', 'revision_humana'].includes(String(x.resultado))
      ? String(x.resultado)
      : 'revision_humana') as Resultado,
    observaciones: Array.isArray(x.observaciones) ? x.observaciones.map(String).filter(Boolean) : [],
    documentos: Array.isArray(x.documentos) ? (x.documentos as Array<Record<string, unknown>>) : [],
  }));
  // Lo que el código cambió respecto de lo que el modelo escribió: si algo
  // cambió, el texto se arma solo con lo verificado (la narración del
  // modelo seguía diciendo «siete volquetes» después de corregirse).
  let corregido = false;
  if (clase === 'personal') {
    for (const r of await delPersonal) {
      const obs = observacionDeCargo(r);
      if (!obs) continue;
      const clave = plano(r.cargo).split(' ').find((w) => w.length >= 5) ?? '';
      const it =
        items.find((x) => clave && plano(x.item).includes(clave)) ??
        items.find((x) => /suelo|paviment/.test(clave) && /suelo|paviment/.test(plano(x.item))) ??
        items.find((x) => /ambient|ssoma/.test(clave) && /ambient|ssoma/.test(plano(x.item)));
      if (it) {
        if (obs.noCumple && it.resultado !== 'no_cumple') {
          it.resultado = 'no_cumple';
          corregido = true;
        }
        if (!it.observaciones.some((x) => /08305/.test(x) && /meses/.test(x))) it.observaciones.push(obs.observacion);
      } else {
        items.push({ item: r.cargo, resultado: obs.noCumple ? 'no_cumple' : 'cumple', observaciones: [obs.observacion], documentos: [] });
        corregido = corregido || obs.noCumple;
      }
    }
  }
  if (clase === 'infraestructura') {
    const avisos = await deLocales;
    if (avisos.length > 0) {
      corregido = true;
      const it = items[0];
      if (it && items.length === 1) {
        if (it.resultado === 'cumple') it.resultado = 'revision_humana';
        it.observaciones.push(...avisos);
      } else {
        items.push({ item: 'Ubicación de los locales', resultado: 'revision_humana', observaciones: avisos, documentos: [] });
      }
    }
  }
  const paraLaEjecucion: string[] = [];
  if (clase === 'equipamiento') {
    const acreditacion = extracto.slice(Math.max(0, extracto.search(/Acreditaci[óo]n\s*:/i)));
    const [conteos, accesorios] = await comprobaciones;
    for (const it of items) {
      for (const v of separarVigencia(it, extracto ? acreditacion : `${ficha.requisito} ${ficha.reglaBases}`)) {
        paraLaEjecucion.push(`${it.item}: ${v}`);
      }
      const tipo = tipoDeEquipo(it.item);
      // Un «faltan unidades» que los compromisos desmienten, fuera.
      const c = conteos.find((x) => x.tipo === tipo);
      if (c && c.ofrecidas >= c.exigidas) {
        const antes = it.observaciones.length;
        it.observaciones = it.observaciones.filter((x) => !DE_CANTIDAD.test(x));
        if (it.observaciones.length < antes) corregido = true;
        if (it.observaciones.length < antes && it.observaciones.length === 0) it.resultado = 'cumple';
      }
    }
    // Potencias: fuera del rango en todos sus documentos, no cumple; que
    // no coincidan entre documentos de la misma máquina, al comité.
    for (const a of accesorios) {
      if (a.fueraDeRango.length === 0 && a.incongruencias.length === 0) continue;
      const delTipo = items.filter((x) => tipoDeEquipo(x.item) === a.tipo);
      const it = delTipo[0];
      const obs = [
        ...a.fueraDeRango.map((x) => `Potencia fuera de rango — ${x}.`),
        ...a.incongruencias.map((x) => `${x}. El comité debe determinar si la diferencia impide saber si la unidad cumple el rango exigido.`),
      ];
      corregido = true;
      const peorDeEste: Resultado = a.fueraDeRango.length > 0 ? 'no_cumple' : 'revision_humana';
      if (it) {
        if (peorDeEste === 'no_cumple' || it.resultado === 'cumple') it.resultado = peorDeEste;
        it.observaciones.push(...obs);
      } else {
        items.push({ item: a.descripcion, resultado: peorDeEste, observaciones: obs, documentos: [] });
      }
    }
    // El accesorio que ninguna unidad suficiente acredita: no cumple.
    for (const a of accesorios) {
      if (a.accesorios.length === 0 || a.acreditadas >= a.exigidas) continue;
      const obs = `Se exigen ${a.exigidas} unidad(es) «${a.descripcion}» y solo ${a.acreditadas} acreditan ${a.accesorios.join(' y ')} con un documento de la propia unidad${a.detalle.length ? `: ${a.detalle.join('; ')}` : ''}. Una ficha de catálogo que lo lista como opcional no acredita que la unidad ofertada lo tenga.`;
      // La camioneta «con radio transmisor», no la otra camioneta.
      const delTipo = items.filter((x) => tipoDeEquipo(x.item) === a.tipo);
      const it =
        delTipo.find((x) => a.accesorios.some((ac) => plano(x.item).includes(ac.split(' ')[0]))) ??
        (delTipo.length === 1 ? delTipo[0] : undefined);
      corregido = true;
      if (it) {
        it.resultado = 'no_cumple';
        it.observaciones.push(obs);
      } else {
        items.push({ item: a.descripcion, resultado: 'no_cumple', observaciones: [obs], documentos: [] });
      }
    }
  }
  if (items.length === 0) return ficha;

  const peor: Resultado = items.some((i) => i.resultado === 'no_cumple')
    ? 'no_cumple'
    : items.some((i) => i.resultado === 'revision_humana')
      ? 'revision_humana'
      : 'cumple';
  const detalle = items
    .filter((i) => i.resultado !== 'cumple' || i.observaciones.length > 0)
    .map((i) => `${i.item}: ${i.resultado === 'cumple' ? 'cumple' : i.resultado === 'no_cumple' ? 'NO CUMPLE' : 'para el comité'}${i.observaciones.length ? ` — ${i.observaciones.join('; ')}` : ''}`);
  // Si el resultado que sale de los ítems no es el que el modelo escribió
  // en su conclusión (porque el código aplicó un criterio), la conclusión
  // va primero y dice el resultado real: el acta no puede decir «queda
  // para el comité» de una ficha que no cumple.
  const rucs = await otorgantes;
  const conclusion =
    String(o.resultado ?? '') !== peor || paraLaEjecucion.length > 0 || corregido
      ? peor === 'cumple'
        ? 'Conclusión: cumple.'
        : `Conclusión: ${peor === 'no_cumple' ? 'NO CUMPLE' : 'queda para el comité'} — ${items
            .filter((i) => i.resultado === peor)
            .map((i) => i.item)
            .join(', ')}.`
      : '';
  const hallazgo = [
    conclusion,
    // Si la acreditación no pide documentos de vigencia, tampoco la
    // conclusión del modelo puede decir que su falta descalifica.
    corregido
      ? ''
      : paraLaEjecucion.length
      ? String(o.hallazgo ?? '')
          .split(/(?<=[a-záéíóúñ0-9)\]]{2}[.;])\s+(?=[A-ZÁÉÍÓÚÑ])/)
          .filter((x) => !VIGENCIA.test(x))
          .join(' ')
          .trim()
      : String(o.hallazgo ?? '').trim(),
    detalle.length ? `Detalle: ${detalle.join(' | ')}` : '',
    paraLaEjecucion.length
      ? `Para la ejecución (la acreditación de este requisito no lo exige en la oferta): ${paraLaEjecucion.join(' | ')}`
      : '',
    rucs.length
      ? `Para el comité: verificar en la SUNAT el estado y la condición del RUC de los otorgantes a la fecha de sus compromisos (una empresa con baja o suspensión de actividades puede no poder cumplirlos): ${rucs.join('; ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ...ficha,
    resultado: peor,
    subsanable: peor === 'no_cumple' ? false : ficha.subsanable,
    naturalezaDefecto: peor === 'cumple' ? 'ninguno' : ficha.naturalezaDefecto ?? 'sustancial',
    hallazgo: hallazgo || ficha.hallazgo,
    evidencia: [
      ...ficha.evidencia,
      ...items.flatMap((i) =>
        i.documentos.slice(0, 2).map((d) => ({
          documento: `${i.item} — ${String(d.documento ?? '')}`.slice(0, 200),
          ubicacion: d.folio ? String(d.folio) : undefined,
          cita: String(d.cita ?? '').slice(0, 300),
        })),
      ),
    ].slice(0, 40),
    confianza: peor === 'cumple' ? ficha.confianza : 'media',
    verificada: true,
  };
}
