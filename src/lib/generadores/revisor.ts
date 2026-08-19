/**
 * Revisión global del requerimiento, una vez terminado.
 *
 * POR QUÉ EXISTE
 *
 * La ayuda de LexIA hasta ahora era apartado por apartado: se redacta
 * uno, se mejora otro. César lo resumió bien —"estamos haciendo parche
 * por parche uno por uno"— y el documento no queda coherente como
 * conjunto: el plazo del apartado 4 puede contradecir el cronograma del
 * 7, y la penalidad que alguien escribió a mano puede vulnerar la norma
 * sin que nadie lo mire. Los campos libres son justamente los que la
 * plantilla no puede adivinar y los que nadie revisa.
 *
 * La revisión hace tres cosas, las tres que pidió:
 *
 *   1. Coherencia entre secciones.
 *   2. Validación normativa de lo que el usuario escribió a mano.
 *   3. Redacción del conjunto.
 *
 * QUÉ NO HACE
 *
 * No corrige nada por su cuenta. Devuelve hallazgos y, cuando puede,
 * un texto propuesto que el usuario aplica si quiere. Un documento que
 * se reescribe solo al pulsar un botón deja de ser del área usuaria, y
 * las decisiones —plazos, cantidades, penalidades— son suyas.
 *
 * Y lo que se puede comprobar con aritmética se comprueba con
 * aritmética: los topes de experiencia y adelanto los verifica el
 * ensamblador y llegan aquí ya resueltos. El modelo solo juzga lo que
 * no se puede calcular.
 */
import type {
  Bloque,
  BloqueCampo,
  PlantillaRequerimiento,
  Seccion,
} from './plantilla-tipos';
import type {
  Aviso,
  DestinoRespuesta,
  Falta,
  RespuestasRequerimiento,
} from './ensamblador';
import { OPCION_PROPIA, campoOpcionPropia } from './ensamblador';

/** Un apartado con contenido escrito por el usuario, revisable. */
export interface ApartadoRevisable {
  /** Id del bloque; es la referencia que devuelve el modelo. */
  id: string;
  etiqueta: string;
  /** Título de la sección en la que vive, para situarlo. */
  seccion: string;
  /** Lo que el formato oficial pide en ese apartado. */
  instruccion: string;
  /** Lo que hay escrito. */
  texto: string;
  /** Dónde se guarda si el usuario acepta un texto propuesto. */
  destino: DestinoRespuesta;
  /**
   * Si admite reemplazo directo. Un plazo en días o un importe son
   * decisiones del área usuaria: se señalan, no se sustituyen.
   */
  editable: boolean;
}

export interface Hallazgo {
  /** Apartado al que se refiere, o `null` si es del documento entero. */
  apartado_id: string | null;
  tipo: 'norma' | 'coherencia' | 'redaccion';
  gravedad: 'alta' | 'media' | 'baja';
  /** Qué ocurre, en una o dos frases. */
  detalle: string;
  /** Norma que lo sustenta. Solo si venía en el sustento aportado. */
  fundamento?: string;
  /** Texto de reemplazo, cuando el apartado lo admite. */
  texto_propuesto?: string;
}

const TIPOS: Hallazgo['tipo'][] = ['norma', 'coherencia', 'redaccion'];
const GRAVEDADES: Hallazgo['gravedad'][] = ['alta', 'media', 'baja'];

/** Solo el texto libre admite que otro lo reescriba. */
function campoEditable(c: BloqueCampo): boolean {
  return c.tipo === 'texto' || c.tipo === 'texto_largo';
}

/**
 * Reúne lo que el usuario escribió, apartado por apartado.
 *
 * Recorre únicamente lo que va a salir en el documento: una sección
 * apagada por su condición no se revisa, porque no forma parte del
 * requerimiento.
 */
export function inventarioRevisable(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
): ApartadoRevisable[] {
  const out: ApartadoRevisable[] = [];

  const campo = (c: BloqueCampo, seccion: string) => {
    const texto = (respuestas.campos[c.id] ?? '').trim();
    if (!texto) return;
    out.push({
      id: c.id,
      etiqueta: c.etiqueta,
      seccion,
      instruccion: c.ayuda,
      texto,
      destino: 'campos',
      editable: campoEditable(c),
    });
  };

  const bloques = (bs: Bloque[], seccion: string) => {
    for (const b of bs) {
      switch (b.clase) {
        case 'campo':
          campo(b, seccion);
          break;
        case 'parrafo':
          // El párrafo es texto invariable con huecos: lo revisable son
          // los huecos, no el párrafo.
          for (const c of b.campos) campo(c, seccion);
          break;
        case 'redactado': {
          const texto = (respuestas.redacciones[b.id] ?? '').trim();
          if (!texto) break;
          out.push({
            id: b.id,
            etiqueta: b.etiqueta,
            seccion,
            instruccion: b.instruccion,
            texto,
            destino: 'redacciones',
            editable: true,
          });
          break;
        }
        case 'opcion': {
          // Las alternativas del formato son invariables y no se
          // revisan. La que redacta la entidad cuando ninguna encaja,
          // sí: es texto libre suyo dentro de una cláusula del formato.
          if (respuestas.opciones[b.id] !== OPCION_PROPIA) break;
          const texto = (respuestas.campos[campoOpcionPropia(b.id)] ?? '').trim();
          if (!texto) break;
          out.push({
            id: campoOpcionPropia(b.id),
            etiqueta: `${b.etiqueta} (redacción propia)`,
            seccion,
            instruccion: b.instruccion,
            texto,
            destino: 'campos',
            editable: true,
          });
          break;
        }
        default:
          // Fijos, notas, títulos y tablas no son texto libre: o son
          // invariables, o exigen una estructura que el reemplazo de
          // texto no puede garantizar. Van al documento que se manda
          // como contexto, y ahí se juzgan.
          break;
      }
    }
  };

  const seccion = (s: Seccion) => {
    if (s.condicion && !respuestas.condiciones[s.condicion]) return;
    bloques(s.bloques, s.titulo);
    for (const h of s.subsecciones ?? []) seccion(h);
  };

  for (const s of plantilla.secciones) seccion(s);

  // Los apartados que añadió la entidad son texto libre entero, sin
  // instrucción del formato que los guíe: son los que más falta hace
  // revisar, no los que menos.
  for (const e of respuestas.extras) {
    const texto = e.texto.trim();
    if (!texto) continue;
    out.push({
      id: e.id,
      etiqueta: e.titulo.trim() || 'Apartado adicional',
      seccion: 'Apartado añadido por la entidad',
      instruccion:
        'Apartado propio de la entidad: el formato oficial no lo contempla, así que revísalo contra la norma y contra el resto del documento.',
      texto,
      destino: 'extras',
      editable: true,
    });
  }
  return out;
}

/**
 * Consultas con las que se busca sustento normativo para la revisión.
 *
 * Salen de las validaciones que la propia plantilla declara —que son
 * afirmaciones normativas escritas por César— más los apartados con más
 * texto libre, que son donde más margen hay para incumplir algo. Sin
 * sustento el modelo no puede citar norma: el prompt se lo prohíbe.
 */
export function consultasRevision(
  plantilla: PlantillaRequerimiento,
  inventario: ApartadoRevisable[],
  tope = 6,
): string[] {
  const consultas = plantilla.validaciones.map((v) => v.descripcion.slice(0, 200));

  const porTexto = [...inventario]
    .filter((a) => a.texto.length > 120)
    .sort((a, b) => b.texto.length - a.texto.length)
    .slice(0, 4)
    .map((a) => `${a.etiqueta} ${plantilla.subtitulo}`.slice(0, 200));

  const vistas = new Set<string>();
  const out: string[] = [];
  for (const c of [...consultas, ...porTexto]) {
    const k = c.toLowerCase();
    if (vistas.has(k)) continue;
    vistas.add(k);
    out.push(c);
    if (out.length === tope) break;
  }
  return out;
}

export function promptRevisionSistema(plantilla: PlantillaRequerimiento): string {
  return `Eres LexIA, revisor jurídico en Contrataciones del Estado peruano (Ley N° 32069 y su Reglamento, DS N° 009-2025-EF).

Revisas un requerimiento ya redactado que sigue el formato oficial "${plantilla.encabezado} — ${plantilla.subtitulo}". El documento va completo; los apartados que el área usuaria escribió a mano van además listados aparte con su identificador.

TU REVISIÓN CUBRE TRES COSAS Y SOLO TRES:
1. COHERENCIA entre secciones: plazos, cantidades, entregables, penalidades y condiciones que se contradigan entre un apartado y otro, o que contradigan la denominación de la contratación.
2. NORMA: si algo de lo que escribió el área usuaria vulnera la norma o el propio formato. Es lo más importante: los apartados libres son los que nadie revisa.
3. REDACCIÓN del conjunto: registro desigual, apartados que repiten lo mismo, frases que no dicen nada, ambigüedades que en ejecución se discuten.

REGLAS QUE NO PUEDES ROMPER:
- Devuelve SOLO un objeto JSON, sin texto alrededor y sin vallas de código.
- No inventes norma. Cita artículo o numeral únicamente si aparece en el SUSTENTO NORMATIVO que se te entrega; si no lo tienes, describe el problema sin citar y deja "fundamento" vacío.
- No cambies las decisiones del área usuaria —plazos, importes, cantidades, penalidades, requisitos—. Si una decisión te parece contraria a la norma, eso ES el hallazgo: se reporta, no se corrige.
- "texto_propuesto" solo para los apartados marcados como editables, y solo cuando de verdad mejore: mismo contenido, mismos datos, mejor forma. Si no hay nada que proponer, omítelo.
- Un hallazgo por problema real. No rellenes. Un documento correcto devuelve pocos hallazgos o ninguno, y eso es una respuesta válida.
- No señales como falta un dato que aparece marcado [PENDIENTE: …]: ya está contado aparte.

FORMA DEL JSON:
{
  "resumen": "dos o tres frases sobre el estado del documento en conjunto",
  "hallazgos": [
    {
      "apartado_id": "id del apartado, o null si afecta al documento entero",
      "tipo": "norma" | "coherencia" | "redaccion",
      "gravedad": "alta" | "media" | "baja",
      "detalle": "qué ocurre y por qué importa, en una o dos frases",
      "fundamento": "norma que lo respalda, o cadena vacía",
      "texto_propuesto": "reemplazo completo del apartado, o se omite"
    }
  ]
}`;
}

export function promptRevisionUsuario(opts: {
  denominacion: string;
  documento: string;
  inventario: ApartadoRevisable[];
  avisos: Aviso[];
  faltantes: Falta[];
  sustento: string;
}): string {
  const partes: string[] = [];

  partes.push(`CONTRATACIÓN: ${opts.denominacion}`);

  partes.push(
    `\nAPARTADOS ESCRITOS POR EL ÁREA USUARIA (usa estos identificadores en "apartado_id"):\n` +
      opts.inventario
        .map(
          (a) =>
            `— id: ${a.id}${a.editable ? '' : '  [NO editable: solo se puede señalar]'}\n  sección: ${a.seccion}\n  apartado: ${a.etiqueta}\n  el formato pide: ${a.instruccion}\n  escrito: """${a.texto}"""`,
        )
        .join('\n\n'),
  );

  if (opts.avisos.length > 0) {
    // Los topes ya están calculados: se dan hechos para que el modelo no
    // los repita como hallazgo suyo ni los contradiga.
    partes.push(
      `\nTOPES YA VERIFICADOS POR EL SISTEMA (no los repitas como hallazgo):\n` +
        opts.avisos.map((a) => `— ${a.mensaje} (${a.fundamento})`).join('\n'),
    );
  }

  if (opts.faltantes.length > 0) {
    partes.push(
      `\nDATOS QUE FALTAN, YA DETECTADOS (no los repitas como hallazgo):\n` +
        opts.faltantes.map((f) => `— ${f.etiqueta} (${f.seccion})`).join('\n'),
    );
  }

  if (opts.sustento.trim()) {
    partes.push(`\nSUSTENTO NORMATIVO DISPONIBLE:\n${opts.sustento.trim()}`);
  }

  partes.push(`\nDOCUMENTO COMPLETO:\n"""\n${opts.documento}\n"""`);

  partes.push('\nDevuelve ahora el JSON de la revisión.');
  return partes.join('\n');
}

/**
 * Filtra lo que devuelve el modelo.
 *
 * Un hallazgo que apunta a un apartado inexistente no es accionable, y
 * un texto propuesto para un apartado no editable es justo lo que no
 * queremos: que se reescriba una decisión del área usuaria. Los dos se
 * descartan aquí y no llegan a la pantalla.
 */
export function depurarHallazgos(
  crudos: unknown,
  inventario: ApartadoRevisable[],
  tope = 40,
): Hallazgo[] {
  if (!Array.isArray(crudos)) return [];
  const porId = new Map(inventario.map((a) => [a.id, a]));
  const vistos = new Set<string>();
  const out: Hallazgo[] = [];

  for (const c of crudos) {
    if (!c || typeof c !== 'object') continue;
    const h = c as Record<string, unknown>;

    const detalle = typeof h.detalle === 'string' ? h.detalle.trim() : '';
    if (detalle.length < 15) continue;

    const idBruto = typeof h.apartado_id === 'string' ? h.apartado_id.trim() : '';
    const apartado = idBruto ? porId.get(idBruto) : undefined;
    // Un id que no existe se descarta: sin apartado al que llevar al
    // usuario, el hallazgo no se puede atender.
    if (idBruto && !apartado) continue;

    const tipo = TIPOS.includes(h.tipo as Hallazgo['tipo'])
      ? (h.tipo as Hallazgo['tipo'])
      : 'redaccion';
    const gravedad = GRAVEDADES.includes(h.gravedad as Hallazgo['gravedad'])
      ? (h.gravedad as Hallazgo['gravedad'])
      : 'media';

    const propuesto =
      typeof h.texto_propuesto === 'string' ? h.texto_propuesto.trim() : '';
    const admitePropuesta =
      !!apartado && apartado.editable && propuesto.length >= 20 && propuesto !== apartado.texto;

    const clave = `${idBruto}|${detalle.slice(0, 80).toLowerCase()}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const fundamento = typeof h.fundamento === 'string' ? h.fundamento.trim() : '';

    out.push({
      apartado_id: apartado ? apartado.id : null,
      tipo,
      gravedad,
      detalle,
      ...(fundamento ? { fundamento } : {}),
      ...(admitePropuesta ? { texto_propuesto: propuesto } : {}),
    });
    if (out.length === tope) break;
  }

  const orden: Record<Hallazgo['gravedad'], number> = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => orden[a.gravedad] - orden[b.gravedad]);
}
