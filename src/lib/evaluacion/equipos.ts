/**
 * Dos comprobaciones del equipamiento estratégico que no se le pueden
 * dejar a la lectura general de la oferta: cuántas unidades se ofrecen de
 * cada equipo y si cada unidad tiene el accesorio que exigen las Bases.
 *
 * POR QUÉ
 *
 * Con dieciocho equipos en una sola respuesta, el modelo:
 *   · contó siete volquetes donde los compromisos del Consorcio
 *     Mantenimiento Vial Ayacucho suman ocho (folios 150 a 154);
 *   · dio por acreditado el ripper de las motoniveladoras del Consorcio
 *     Ayacucho, que solo figura como opcional en una ficha de catálogo
 *     (César, documento 13: «debió ser descalificado»);
 *   · y, cuando se le pidieron estos datos como campos extra, los llenó en
 *     un ítem de cada cuatro.
 * Aquí cada comprobación es una consulta corta sobre las páginas que
 * importan, y la cuenta y la validación de las citas las hace el código.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';

/** El tipo de equipo, por la palabra que lo nombra. */
const TIPOS: Array<[string, RegExp]> = [
  ['volquete', /volquete/],
  ['rodillo', /rodillo/],
  ['cargador', /cargador/],
  ['excavadora', /excavadora/],
  ['cisterna', /cisterna/],
  ['motoniveladora', /motoniveladora/],
  ['camioneta', /camioneta|pick ?up/],
  ['minibus', /minibus|combi|coaster/],
  ['tractor', /tractor oruga|tractor sobre oruga|tractor de oruga|\btractor\b(?! ?cami)/],
  ['cama baja', /cama baja|semirremolque/],
  ['prensa', /prensa/],
  ['zaranda', /zaranda/],
  ['gps', /\bgps\b/],
  ['vibrador', /vibrador/],
  ['mezcladora', /mezcladora/],
  ['estacion total', /estacion total/],
  ['motobomba', /motobomba/],
  ['martillo', /martillo/],
  ['compresora', /compresora/],
  ['grupo electrogeno', /grupo electrogeno/],
];

export const plano = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function tipoDeEquipo(descripcion: string): string | null {
  const p = plano(descripcion);
  // «Tractor» dentro de «tracto camión» de la cama baja no es el tractor oruga.
  for (const [tipo, rx] of TIPOS) if (rx.test(p)) return tipo;
  return null;
}

const ACCESORIO = /\b(ripper|desgarrador|escarificador|portavastagos|martillo hidraulico|radio transmisor)\b/g;

export interface FilaDeBases {
  descripcion: string;
  tipo: string;
  cantidad: number;
  accesorios: string[];
}

/** La tabla de equipos del requisito de calificación: descripción | Und. | cantidad. */
export function tablaDeEquipos(extracto: string): FilaDeBases[] {
  const filas: FilaDeBases[] = [];
  for (const m of extracto.matchAll(/([A-ZÁÉÍÓÚÑ0-9][^|\n]{3,220}?)\s*\|\s*Und\.?\s*\|\s*(\d+(?:[.,]\d+)?)/gi)) {
    const descripcion = m[1].replace(/^.*?(?:CANTIDAD|DESCRIPCI[ÓO]N)\s*/i, '').trim();
    const tipo = tipoDeEquipo(descripcion);
    if (!tipo) continue;
    const accesorios = [...new Set([...plano(descripcion).matchAll(ACCESORIO)].map((x) => x[1]))];
    filas.push({ descripcion, tipo, cantidad: Number(m[2].replace(',', '.')), accesorios });
  }
  return filas;
}

/** Páginas del texto, con su etiqueta («tomo 2, página 96»). */
function paginas(texto: string): Array<{ etiqueta: string; texto: string }> {
  const salida: Array<{ etiqueta: string; texto: string }> = [];
  let tomo = '';
  for (const trozo of texto.split(/(?==== P[áa]gina \d+ ===|^=== TOMO \d+)/m)) {
    const t = trozo.match(/^=== TOMO (\d+)/);
    if (t) {
      tomo = t[1];
      continue;
    }
    const n = trozo.match(/^=== P[áa]gina (\d+) ===/)?.[1];
    if (n) salida.push({ etiqueta: `${tomo ? `tomo ${tomo}, ` : ''}página ${n}`, texto: trozo });
  }
  return salida;
}

export interface Conteo {
  tipo: string;
  exigidas: number;
  ofrecidas: number;
  folios: string[];
}

/**
 * Cuántas unidades de cada tipo ofrecen los compromisos, facturas y
 * tarjetas. Es una cota inferior (puede faltar alguna fila), así que solo
 * sirve para desmentir un «faltan unidades», no para afirmarlo.
 */
export async function contarUnidades(texto: string, tabla: FilaDeBases[]): Promise<Conteo[]> {
  if (tabla.length === 0) return [];
  const relevantes = paginas(texto).filter((p) => {
    const t = plano(p.texto);
    return /compromiso|alquiler|arrend|factura|tarjeta de (?:propiedad|identificacion)/.test(t) && tabla.some((f) => TIPOS.find(([k]) => k === f.tipo)![1].test(t));
  });
  const lotes: Array<typeof relevantes> = [];
  for (let i = 0; i < relevantes.length && i < 120; i += 20) lotes.push(relevantes.slice(i, i + 20));
  const filas = (
    await Promise.all(
      lotes.map(async (lote) => {
        const { text } = await generateText({
          model: chatModel,
          system: `Lees páginas de una oferta. Lista cada fila de un COMPROMISO DE ALQUILER o de COMPRAVENTA que ofrece equipos o maquinaria: una entrada por fila, con la cantidad que dice esa fila. No cuentes fichas técnicas, catálogos, facturas ni tarjetas: solo compromisos. Devuelve SOLO JSON: {"filas": [{"pagina": "la etiqueta tal como viene", "equipo": "descripción de la fila", "cantidad": número}]}`,
          prompt: lote.map((p) => `##### ${p.etiqueta}\n${p.texto.slice(0, 5000)}`).join('\n\n'),
          temperature: 0,
          maxTokens: 8000,
          abortSignal: AbortSignal.timeout(120_000),
        });
        const o = parseJsonLoose(text) as { filas?: Array<Record<string, unknown>> } | null;
        return o?.filas ?? [];
      }),
    )
  ).flat();
  const porTipo = new Map<string, Conteo>();
  for (const f of tabla) {
    const c = porTipo.get(f.tipo) ?? { tipo: f.tipo, exigidas: 0, ofrecidas: 0, folios: [] };
    c.exigidas += f.cantidad;
    porTipo.set(f.tipo, c);
  }
  // Cada página se lee una sola vez, así que no se descartan filas
  // iguales: dos volquetes de 15 m³ de distinto año en el mismo compromiso
  // son dos filas, y quitarlas como «repetidas» daba seis donde hay ocho.
  for (const f of filas) {
    const tipo = tipoDeEquipo(String(f.equipo ?? ''));
    const c = tipo ? porTipo.get(tipo) : undefined;
    if (!c) continue;
    c.ofrecidas += Number(f.cantidad) > 0 ? Number(f.cantidad) : 1;
    c.folios.push(String(f.pagina ?? ''));
  }
  return [...porTipo.values()];
}

export interface RevisionDeUnidades {
  tipo: string;
  descripcion: string;
  exigidas: number;
  accesorios: string[];
  /** Unidades con todos los accesorios acreditados con cita válida. */
  acreditadas: number;
  unidades: number;
  /** Por qué cada unidad no acredita el accesorio. */
  detalle: string[];
  /** Potencias que no coinciden entre documentos de la misma unidad. */
  incongruencias: string[];
  /** Unidades cuya potencia queda fuera del rango en TODOS sus documentos. */
  fueraDeRango: string[];
}

/** «171-195HP» → [171, 195]; «191 HP» → [191, 191]. */
function rango(valor: string): [number, number] | null {
  const t = valor.replace(/,/g, '.');
  const r = t.match(/(\d{2,4}(?:\.\d+)?)\s*(?:-|–|a|al|y)\s*(\d{2,4}(?:\.\d+)?)/i);
  if (r) return [Number(r[1]), Number(r[2])];
  const n = t.match(/(\d{2,4}(?:\.\d+)?)/);
  return n ? [Number(n[1]), Number(n[1])] : null;
}

/**
 * Cada unidad de los equipos que exigen un accesorio o un rango de
 * potencia: si su accesorio consta con una cita que esté en la oferta
 * (y no en una lista de equipo opcional), y si la potencia que dicen sus
 * documentos coincide y cae dentro del rango.
 *
 * Las potencias son la observación de César sobre la motoniveladora del
 * Consorcio Mega (documento 13): compromiso y factura dicen 171-195 HP, la
 * ficha del modelo 170 HP; otra, 191 HP contra un máximo de 190 en su
 * ficha. Que los documentos de la misma máquina no coincidan es algo que
 * el comité tiene que ver.
 */
export async function revisarUnidades(texto: string, tabla: FilaDeBases[]): Promise<RevisionDeUnidades[]> {
  const aRevisar = tabla.filter((f) => f.accesorios.length > 0 || /\d\s*hp/i.test(f.descripcion));
  if (aRevisar.length === 0) return [];
  const textoPlano = plano(texto);
  const todas = paginas(texto);
  return Promise.all(
    aRevisar.map(async (f): Promise<RevisionDeUnidades> => {
      const rx = TIPOS.find(([k]) => k === f.tipo)![1];
      const suyas = todas.filter((p) => rx.test(plano(p.texto))).slice(0, 30);
      const exigido = f.descripcion.match(/(\d{2,4})\s*(?:-|–|a)\s*(\d{2,4})\s*HP/i);
      const { text } = await generateText({
        model: chatModel,
        system: `Revisas, UNIDAD POR UNIDAD, un equipo que una oferta propone para un procedimiento de selección.
Para cada unidad que la oferta ofrece (identificada por marca, modelo, serie o placa):
1. "potencias": la potencia que dice CADA documento de esa unidad (compromiso de alquiler o de compraventa, factura, tarjeta de propiedad, ficha técnica del modelo), copiada tal cual («171-195 HP», «170 HP»), con el documento y la página.${
          f.accesorios.length
            ? `
2. "citas": para cada accesorio exigido, la frase LITERAL de un documento DE ESA UNIDAD donde conste que la tiene. Una ficha de catálogo que lista el accesorio como opcional, o bajo «equipo opcional», NO lo acredita: deja la cita vacía y dilo en "nota". Si nada lo menciona, cita vacía.`
            : ''
        }
No deduzcas ni completes: solo lo que esté en las páginas.
Devuelve SOLO JSON: {"unidades": [{"unidad": "", "pagina": "", "potencias": [{"documento": "", "pagina": "", "valor": ""}], "citas": [{"accesorio": "", "cita": "", "pagina": ""}], "nota": ""}]}`,
        prompt: `LAS BASES EXIGEN: ${f.cantidad} unidad(es) de «${f.descripcion}».${
          f.accesorios.length ? `\nACCESORIOS EXIGIDOS: ${f.accesorios.join(', ')}` : ''
        }

PÁGINAS DE LA OFERTA DONDE APARECE EL EQUIPO:
${suyas.map((p) => `##### ${p.etiqueta}\n${p.texto.slice(0, 6000)}`).join('\n\n')}`,
        temperature: 0,
        maxTokens: 8000,
        abortSignal: AbortSignal.timeout(120_000),
      });
      const o = parseJsonLoose(text) as { unidades?: Array<Record<string, unknown>> } | null;
      const unidades = o?.unidades ?? [];
      const raices = (a: string) => (a === 'ripper' || a === 'desgarrador' ? ['ripper', 'desgarrador'] : [a.split(' ')[0]]);
      const valida = (cita: string, accesorio: string) => {
        const c = plano(cita);
        if (!raices(accesorio).some((r) => c.includes(r)) || /opcional|optativ/.test(c)) return false;
        const trozo = c.slice(0, 30);
        const donde = trozo.length >= 12 ? textoPlano.indexOf(trozo) : -1;
        return donde >= 0 && !/opcional|optativ/.test(textoPlano.slice(Math.max(0, donde - 250), donde + c.length + 250));
      };
      const detalle: string[] = [];
      const incongruencias: string[] = [];
      const fueraDeRango: string[] = [];
      let acreditadas = 0;
      for (const u of unidades) {
        const nombre = `${String(u.unidad ?? 'unidad')}${u.pagina ? ` (${String(u.pagina)})` : ''}`;
        if (f.accesorios.length) {
          const citas = Array.isArray(u.citas) ? (u.citas as Array<Record<string, unknown>>) : [];
          const faltan = f.accesorios.filter((a) => !citas.some((c) => valida(String(c.cita ?? ''), a)));
          if (faltan.length === 0) acreditadas++;
          else detalle.push(`${nombre}: no se acredita ${faltan.join(' ni ')}${u.nota ? ` — ${String(u.nota)}` : ''}`);
        }
        // Las potencias: solo las que de verdad están en la oferta.
        const potencias = (Array.isArray(u.potencias) ? (u.potencias as Array<Record<string, unknown>>) : [])
          .map((x) => ({ documento: String(x.documento ?? ''), pagina: String(x.pagina ?? ''), valor: String(x.valor ?? ''), r: rango(String(x.valor ?? '')) }))
          .filter((x) => x.r && /hp|kw|potencia|\d/.test(plano(x.valor)) && textoPlano.includes(plano(x.valor).slice(0, 12)));
        // Los documentos de la unidad (compromiso, factura, tarjeta) tienen
        // que decir lo mismo entre sí, con tolerancia y aceptando kW por HP
        // (la tarjeta del volquete dice 368 kW = 493,5 HP); y caer dentro de
        // lo que da la ficha del modelo, que suele listar variantes. Así se
        // ve lo de César —compromiso 171-195 HP contra una ficha de 170-190—
        // sin observar cada catálogo que trae 260, 261 y 265 HP.
        const esCatalogo = (d: string) => /ficha|catalog|especificaci|brochure/.test(plano(d));
        const propios = potencias.filter((x) => !esCatalogo(x.documento));
        const catalogo = potencias.filter((x) => esCatalogo(x.documento));
        const parecidos = (a: number, b: number) =>
          [1, 1.341, 1 / 1.341].some((k) => Math.abs(a * k - b) <= Math.max(a * k, b) * 0.03);
        const iguales = (a: [number, number], b: [number, number]) => parecidos(a[0], b[0]) && parecidos(a[1], b[1]);
        const entreSi = propios.some((x) => propios.some((y) => !iguales(x.r!, y.r!)));
        const techo = catalogo.length ? Math.max(...catalogo.map((x) => x.r![1])) : null;
        const piso = catalogo.length ? Math.min(...catalogo.map((x) => x.r![0])) : null;
        const fueraDeFicha =
          techo !== null &&
          piso !== null &&
          propios.some((x) => x.r![1] > techo * 1.02 && x.r![1] / 1.341 > techo * 1.02 || x.r![0] < piso * 0.98 && x.r![0] * 1.341 < piso * 0.98);
        if (entreSi || fueraDeFicha) {
          incongruencias.push(
            `${nombre}: la potencia no coincide entre sus documentos — ${potencias.map((x) => `${x.documento} (${x.pagina}): ${x.valor}`).join('; ')}`,
          );
        }
        if (exigido && potencias.length > 0) {
          const [min, max] = [Number(exigido[1]), Number(exigido[2])];
          if (potencias.every((x) => x.r![1] < min || x.r![0] > max)) {
            fueraDeRango.push(`${nombre}: ${potencias.map((x) => x.valor).join(' / ')}, fuera del rango exigido de ${min} a ${max} HP`);
          }
        }
      }
      return {
        tipo: f.tipo,
        descripcion: f.descripcion,
        exigidas: f.cantidad,
        accesorios: f.accesorios,
        acreditadas,
        unidades: unidades.length,
        detalle,
        incongruencias,
        fueraDeRango,
      };
    }),
  );
}

/**
 * Dónde está cada local que se ofrece como infraestructura estratégica.
 *
 * César, documento 13: los compromisos de los locales solo dicen «Ocaña»
 * y «Laramate» (o «Barrio Ocaña Mz 11 Lote 11»), sin distrito, provincia
 * ni departamento, y así no se puede verificar que estén en el lugar de
 * ejecución ni que disten los treinta kilómetros que piden las Bases. El
 * modelo lo daba por bueno deduciendo la provincia; aquí se mira si el
 * documento lo dice.
 */
export async function revisarLocales(texto: string): Promise<string[]> {
  const textoPlano = plano(texto);
  const suyas = paginas(texto)
    .filter((p) => {
      const t = plano(p.texto);
      return /\blocal(es)?\b|inmueble|oficina|almacen|campamento/.test(t) && /compromiso|alquiler|arrend|cesion|posesion|propiedad/.test(t);
    })
    .slice(0, 25);
  if (suyas.length === 0) return [];
  const { text } = await generateText({
    model: chatModel,
    system: `Lees páginas de una oferta. Para cada LOCAL o inmueble que se ofrece mediante un compromiso de alquiler, contrato o título (infraestructura), copia tal cual lo que el DOCUMENTO dice de su ubicación. No completes con lo que sepas de geografía: si el documento no dice el distrito, la provincia o el departamento, déjalos vacíos.
Devuelve SOLO JSON: {"locales": [{"pagina": "la etiqueta tal como viene", "direccion": "copiada literal", "distrito": "", "provincia": "", "departamento": ""}]}`,
    prompt: suyas.map((p) => `##### ${p.etiqueta}\n${p.texto.slice(0, 5000)}`).join('\n\n'),
    temperature: 0,
    maxTokens: 4000,
    abortSignal: AbortSignal.timeout(90_000),
  });
  const o = parseJsonLoose(text) as { locales?: Array<Record<string, unknown>> } | null;
  const avisos: string[] = [];
  for (const l of o?.locales ?? []) {
    const direccion = String(l.direccion ?? '').trim();
    if (!direccion) continue;
    // Lo que el modelo dice que leyó tiene que estar en la oferta.
    const d = plano(direccion);
    if (d.length >= 8 && !textoPlano.includes(d.slice(0, 20))) continue;
    const dice = (campo: unknown) => {
      const v = plano(String(campo ?? ''));
      return v.length > 0 && textoPlano.includes(v);
    };
    const enLaDireccion = /distrito|provincia|departamento|dpto|\bprov\b|\bdist\b/.test(d);
    const precisos = [dice(l.distrito), dice(l.provincia), dice(l.departamento)].filter(Boolean).length;
    if (enLaDireccion || precisos >= 2) continue;
    avisos.push(
      `${String(l.pagina ?? '')}: el local se ubica en «${direccion}», sin precisar distrito, provincia y departamento; con ese dato no se puede verificar que esté en el lugar de ejecución o en una zona colindante, ni la distancia mínima que exigen las Bases`,
    );
  }
  return avisos;
}
