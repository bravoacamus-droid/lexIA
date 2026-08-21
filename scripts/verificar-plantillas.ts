/**
 * Comprobaciones estructurales sobre las quince plantillas.
 *
 * El auditor (auditar-plantilla-requerimiento.ts) verifica que los
 * textos invariables coincidan con el .docx. Eso NO detecta los fallos
 * que rompen el generador en tiempo de uso, que son de otra naturaleza:
 *
 *  1. IDS REPETIDOS. Las respuestas se guardan en un diccionario por id.
 *     Dos campos con el mismo id en la misma plantilla comparten valor
 *     en silencio: el usuario escribe una cosa y aparece en dos sitios.
 *     Es el fallo más probable con quince plantillas escritas a mano y
 *     el más difícil de ver leyendo.
 *  2. VALIDACIONES HUÉRFANAS. Un campo que apunta a un tope no declarado
 *     nunca dispara aviso, y el aviso es justamente lo que protege del
 *     error normativo.
 *  3. CONDICIONES SIN INTERRUPTOR. Una sección condicionada por algo que
 *     la interfaz no ofrece nunca aparece en el documento.
 *  4. BLOQUES VACÍOS. Una sección sin bloques ni subsecciones sale como
 *     un título suelto en el Word.
 *
 * Además arma cada plantilla de punta a punta y la exporta a Word, para
 * comprobar que ninguna revienta el ensamblador ni el exportador.
 *
 * Uso: npx tsx scripts/verificar-plantillas.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { listarPlantillas, obtenerPlantilla } from '../src/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  respuestasVacias,
  montoDe,
  type RespuestasRequerimiento,
} from '../src/lib/generadores/ensamblador';
import { markdownToDocxBuffer } from '../src/lib/docx-from-markdown';
import {
  limpiarRedaccion,
  redaccionUtil,
  promptSistema,
  promptUsuario,
} from '../src/lib/generadores/redactor';
import type { Seccion, Bloque, PlantillaRequerimiento } from '../src/lib/generadores/plantilla-tipos';

let fallos = 0;
const problema = (msg: string) => {
  console.log(`   ❌ ${msg}`);
  fallos++;
};

/** Recorre secciones y subsecciones en orden. */
function recorrer(ss: Seccion[], fn: (s: Seccion, ruta: string) => void, padre = '') {
  for (const s of ss) {
    const ruta = padre ? `${padre} › ${s.titulo}` : s.titulo;
    fn(s, ruta);
    if (s.subsecciones) recorrer(s.subsecciones, fn, ruta);
  }
}

/** Rellena todo lo rellenable, para que el documento salga completo. */
function respuestasCompletas(p: PlantillaRequerimiento): RespuestasRequerimiento {
  const r = respuestasVacias();
  recorrer(p.secciones, (s) => {
    if (s.condicion) r.condiciones[s.condicion] = true;
    for (const b of s.bloques as Bloque[]) {
      switch (b.clase) {
        case 'campo':
          r.campos[b.id] = b.tipo === 'moneda' ? 'S/ 100 000,00' : b.tipo === 'numero' ? '10' : 'valor de prueba';
          break;
        case 'parrafo':
          for (const c of b.campos) {
            r.campos[c.id] =
              c.tipo === 'moneda' ? 'S/ 100 000,00' : c.tipo === 'numero' ? '10' : 'valor de prueba';
          }
          break;
        case 'redactado':
          r.redacciones[b.id] = 'Texto de prueba suficientemente largo para el apartado correspondiente.';
          break;
        case 'opcion':
          r.opciones[b.id] = b.opciones[0].valor;
          break;
        case 'tabla':
          r.tablas[b.id] = Array.from({ length: Math.max(b.minimo ?? 0, 1) }, () =>
            b.columnas.map((_, i) => `c${i + 1}`),
          );
          break;
      }
    }
  });
  return r;
}

async function main() {
  console.log(`Verificando ${listarPlantillas().length} plantillas.\n`);

  // Comprobación transversal: dos plantillas no pueden compartir id.
  const idsPlantilla = new Set<string>();
  for (const p of listarPlantillas()) {
    if (idsPlantilla.has(p.id)) problema(`id de plantilla repetido: ${p.id}`);
    idsPlantilla.add(p.id);
  }

  for (const p of listarPlantillas()) {
    console.log(`── ${p.subtitulo}`);

    // ── 1. Ids repetidos ──────────────────────────────────────────────
    // Se comprueba por espacio de nombres, porque el ensamblador guarda
    // cada clase en un diccionario distinto: un campo y una tabla pueden
    // llamarse igual sin colisionar.
    const vistos: Record<string, Map<string, string>> = {
      campo: new Map(),
      redactado: new Map(),
      opcion: new Map(),
      tabla: new Map(),
      seccion: new Map(),
    };
    const condicionesUsadas = new Set<string>();
    const validacionesUsadas = new Set<string>();

    const registrar = (espacio: string, id: string, donde: string) => {
      const previo = vistos[espacio].get(id);
      if (previo) {
        problema(`${espacio} "${id}" repetido — en «${previo}» y en «${donde}»`);
      } else {
        vistos[espacio].set(id, donde);
      }
    };

    recorrer(p.secciones, (s, ruta) => {
      registrar('seccion', s.id, ruta);
      if (s.condicion) condicionesUsadas.add(s.condicion);

      const tieneBloques = s.bloques.length > 0;
      const tieneHijas = (s.subsecciones?.length ?? 0) > 0;
      if (!tieneBloques && !tieneHijas) {
        problema(`sección sin contenido: «${ruta}» saldría como un título suelto`);
      }

      for (const b of s.bloques as Bloque[]) {
        switch (b.clase) {
          case 'campo':
            registrar('campo', b.id, ruta);
            if (b.validacion) validacionesUsadas.add(b.validacion);
            break;
          case 'parrafo': {
            // Todo marcador del texto debe tener su campo, y todo campo
            // su marcador: si no, o queda un {{hueco}} visible en el
            // Word, o el usuario rellena un dato que nadie usa.
            const marcadores = [...b.texto.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]);
            const declarados = b.campos.map((c) => c.id);
            for (const m of marcadores) {
              if (!declarados.includes(m)) {
                problema(`marcador {{${m}}} sin campo declarado en «${ruta}»`);
              }
            }
            for (const c of b.campos) {
              if (!marcadores.includes(c.id)) {
                problema(`campo "${c.id}" declarado pero sin marcador en el texto, en «${ruta}»`);
              }
              registrar('campo', c.id, ruta);
              if (c.validacion) validacionesUsadas.add(c.validacion);
            }
            break;
          }
          case 'redactado':
            registrar('redactado', b.id, ruta);
            break;
          case 'opcion':
            registrar('opcion', b.id, ruta);
            if (b.opciones.length < 2) {
              problema(`opción "${b.id}" con menos de dos alternativas en «${ruta}»`);
            }
            break;
          case 'tabla':
            registrar('tabla', b.id, ruta);
            if (b.columnas.length === 0) problema(`tabla "${b.id}" sin columnas en «${ruta}»`);
            break;
        }
      }
    });

    // ── 2. Validaciones huérfanas ─────────────────────────────────────
    const declaradas = new Set(p.validaciones.map((v) => v.id));
    for (const v of validacionesUsadas) {
      if (!declaradas.has(v)) {
        problema(`un campo apunta al tope "${v}", que la plantilla no declara`);
      }
    }
    for (const v of declaradas) {
      // Los topes que verifica el ensamblador por su cuenta (JPRD,
      // indemnización) no cuelgan de un campo; no son huérfanos.
      const sinCampo = !validacionesUsadas.has(v);
      const esAutomatico = ['jprd_umbral', 'jprd_obras', 'experiencia_mype', 'penalidades_max'].includes(v);
      if (sinCampo && !esAutomatico) {
        console.log(`   ℹ️  tope "${v}" declarado pero ningún campo lo invoca`);
      }
    }

    // ── 3. Ensamblado y exportación ───────────────────────────────────
    const r = respuestasCompletas(p);
    const doc = ensamblarRequerimiento(p, r, { cuantia: 1_000_000 });

    if (doc.faltantes.length > 0) {
      problema(
        `quedan ${doc.faltantes.length} pendientes con todo relleno: ${doc.faltantes
          .slice(0, 3)
          .map((f) => f.etiqueta)
          .join(', ')}`,
      );
    }
    if (doc.markdown.includes('{{')) problema('quedó un marcador {{…}} sin sustituir en el documento');
    if (doc.markdown.includes('PENDIENTE')) problema('quedó una marca PENDIENTE con todo relleno');

    let bytes = 0;
    try {
      const buf = await markdownToDocxBuffer(doc.markdown, { title: p.encabezado, subtitle: p.subtitulo });
      bytes = buf.length;
      if (bytes < 5000) problema(`el .docx salió sospechosamente pequeño: ${bytes} bytes`);
    } catch (e) {
      problema(`la exportación a Word falló: ${(e as Error).message}`);
    }

    console.log(
      `   ${doc.markdown.length.toLocaleString('es-PE')} caracteres · ${bytes.toLocaleString('es-PE')} bytes de Word · ` +
        `${condicionesUsadas.size} condiciones · ${vistos.campo.size} campos · ${vistos.redactado.size} redacciones`,
    );
  }

  // ── 4. El lector de importes ────────────────────────────────────────
  console.log('\n── Lectura de importes ──');
  const casos: Array<[string, number | null]> = [
    ['S/ 150 000,00 (ciento cincuenta mil con 00/100 soles)', 150000],
    ['S/ 1.234.567,89', 1234567.89],
    ['S/ 1,234,567.89', 1234567.89],
    ['40', 40],
    ['sin cifra', null],
  ];
  for (const [entrada, esperado] of casos) {
    const obtenido = montoDe(entrada);
    const ok = obtenido === esperado;
    if (!ok) problema(`montoDe("${entrada}") devolvió ${obtenido}, se esperaba ${esperado}`);
    console.log(`   ${ok ? '✅' : '❌'} "${entrada.slice(0, 45)}" → ${obtenido}`);
  }

  // ── 5. Limpieza de lo que devuelve el modelo ────────────────────────
  // Corre en producción con cada redacción. Si falla, el usuario ve
  // vallas de código o viñetas dobles dentro del Word.
  console.log('\n── Limpieza de la salida del modelo ──');
  const bloqueParrafo = {
    clase: 'redactado' as const,
    id: 'x',
    etiqueta: 'Finalidad pública',
    instruccion: '',
    extension: 'parrafo' as const,
  };
  const bloqueLista = { ...bloqueParrafo, extension: 'lista' as const };

  const limpiezas: Array<
    [string, string, string, typeof bloqueParrafo | typeof bloqueLista]
  > = [
    ['valla de código', '```\nTexto redactado.\n```', 'Texto redactado.', bloqueParrafo],
    ['valla con lenguaje', '```markdown\nTexto redactado.\n```', 'Texto redactado.', bloqueParrafo],
    ['título repetido', 'Finalidad pública\nTexto redactado.', 'Texto redactado.', bloqueParrafo],
    ['título con almohadilla', '## Finalidad pública\nTexto redactado.', 'Texto redactado.', bloqueParrafo],
    ['comillas envolventes', '"Texto redactado."', 'Texto redactado.', bloqueParrafo],
    ['viñetas dobles', '- Uno\n- Dos', 'Uno\nDos', bloqueLista],
    ['lista numerada', '1. Uno\n2. Dos', 'Uno\nDos', bloqueLista],
  ];
  for (const [caso, entrada, esperado, bloque] of limpiezas) {
    const obtenido = limpiarRedaccion(entrada, bloque);
    const ok = obtenido === esperado;
    if (!ok) problema(`limpiarRedaccion, ${caso}: devolvió ${JSON.stringify(obtenido)}`);
    console.log(`   ${ok ? '✅' : '❌'} ${caso}`);
  }

  const cortos: Array<[string, boolean]> = [
    ['Sí.', false],
    ['No aplica', false],
    ['Un texto de longitud razonable para un apartado.', true],
  ];
  for (const [texto, esperado] of cortos) {
    const ok = redaccionUtil(texto) === esperado;
    if (!ok) problema(`redaccionUtil("${texto}") no devolvió ${esperado}`);
    console.log(`   ${ok ? '✅' : '❌'} redacción ${esperado ? 'aceptada' : 'rechazada'}: "${texto.slice(0, 40)}"`);
  }

  // ── 6. El prompt lleva el ejemplo de César ──────────────────────────
  // Es lo que fija el nivel de detalle; sin él el modelo generaliza.
  const bienes = listarPlantillas().find((p) => p.id === 'ps-bienes-general')!;
  let conEjemplo = 0;
  let sinEjemplo = 0;
  recorrer(bienes.secciones, (s) => {
    for (const b of s.bloques as Bloque[]) {
      if (b.clase === 'redactado') (b.ejemplo ? conEjemplo++ : sinEjemplo++);
    }
  });
  const bloqueConEjemplo = (() => {
    let encontrado: Bloque | null = null;
    recorrer(bienes.secciones, (s) => {
      for (const b of s.bloques as Bloque[]) {
        if (!encontrado && b.clase === 'redactado' && b.ejemplo) encontrado = b;
      }
    });
    return encontrado as unknown as { ejemplo: string; etiqueta: string; instruccion: string };
  })();

  // ── Qué topes se comprueban de verdad ─────────────────────────────
  // Las plantillas declaran límites normativos; solo algunos tienen un
  // verificador en el ensamblador. Los demás son documentación: valen
  // como fundamento de un aviso, pero nadie contrasta la cifra. Se
  // listan aquí para que la diferencia esté a la vista y no se
  // descubra el día que alguien dé por comprobado algo que no lo está.
  console.log('\n── Topes declarados y topes verificados ──');
  {
    const CON_VERIFICADOR = ['adelanto_directo_max', 'experiencia_max', 'experiencia_mype'];
    const declaradas = new Map<string, number>();
    for (const p of listarPlantillas()) {
      for (const v of p.validaciones) {
        declaradas.set(v.id, (declaradas.get(v.id) ?? 0) + 1);
      }
    }
    for (const [id, cuantas] of [...declaradas].sort()) {
      const verificado = CON_VERIFICADOR.includes(id);
      console.log(
        `   ${verificado ? "✅" : "📄"} ${id} — ${cuantas} plantilla(s)` +
          (verificado ? "" : " · solo documental, sin comprobación automática"),
      );
    }
    const huerfanos = CON_VERIFICADOR.filter((id) => !declaradas.has(id));
    if (huerfanos.length > 0) {
      problema(`hay verificadores sin validación que los respalde: ${huerfanos.join(", ")}`);
    }
  }

  // ── Redacción de las alternativas ─────────────────────────────────
  // "El contrato se rige por el sistema de entrega de NO APLICA" no es
  // una frase: la opción de que no aplique ningún sistema arrastraba el
  // encabezado de las que sí aplican. Corregido el 19/08/2026 a
  // petición de César, en las seis plantillas que la traían.
  console.log('\n── Redacción de las alternativas ──');
  {
    const FRASE = 'sistema de entrega de NO APLICA';
    let sueltas = 0;
    for (const p of listarPlantillas()) {
      const rec = (ss: Seccion[]) => {
        for (const s of ss) {
          for (const b of s.bloques as Bloque[]) {
            if (b.clase !== 'opcion') continue;
            for (const o of b.opciones) {
              if (o.texto.includes(FRASE)) {
                problema(`${p.id}: la alternativa "${o.valor}" sigue diciendo "${FRASE}"`);
                sueltas++;
              }
            }
          }
          rec(s.subsecciones ?? []);
        }
      };
      rec(p.secciones);
    }
    console.log(`   ${sueltas === 0 ? '✅' : '❌'} ninguna alternativa arrastra el encabezado que no le corresponde`);
  }

  // ── Textos obligatorios que el .docx trae y la plantilla no ───────
  // El auditor comprueba que lo codificado EXISTA en el .docx, pero no
  // al revés: un párrafo obligatorio podía faltar sin que saltara
  // nada. Así se escaparon el tope conjunto del 10% de las penalidades
  // y las dos condiciones del adelanto directo, que César echó en
  // falta el 19/08/2026. Esto mira en la otra dirección.
  console.log('\n── Textos obligatorios presentes en el .docx ──');
  {
    // Se busca la forma CON HUECO, que es la del texto obligatorio. La
    // misma frase con una cifra dentro —"dentro de los siete (7) días"—
    // es un ejemplo del formato, y los ejemplos no van al documento.
    const IMPRESCINDIBLES: Array<[string, string]> = [
      ['no debe exceder el 10%', 'no debe exceder el 10%'],
      [
        'solicitar los adelantos dentro de los [consignar plazo]',
        'solicitar los adelantos dentro de los',
      ],
      [
        'otorgará el adelanto dentro de los [consignar plazo]',
        'otorgará el adelanto dentro de los',
      ],
    ];
    let huecos = 0;
    for (const p of listarPlantillas()) {
      const ruta = join('docs', 'estructura-requerimiento', p.origen.replace(/\.docx$/i, '.md'));
      if (!existsSync(ruta)) continue;
      const fuente = readFileSync(ruta, 'utf8');
      const codificado: string[] = [];
      const rec = (ss: Seccion[]) => {
        for (const s of ss) {
          for (const b of s.bloques as Bloque[]) {
            if (b.clase === 'fijo' || b.clase === 'nota' || b.clase === 'parrafo') {
              codificado.push(b.texto);
            }
          }
          rec(s.subsecciones ?? []);
        }
      };
      rec(p.secciones);
      const todo = codificado.join(String.fromCharCode(10));
      for (const [enElDocx, enLaPlantilla] of IMPRESCINDIBLES) {
        if (fuente.includes(enElDocx) && !todo.includes(enLaPlantilla)) {
          problema(`${p.id}: su .docx dice "${enElDocx}…" y la plantilla no lo recoge`);
          huecos++;
        }
      }
    }
    console.log(`   ${huecos === 0 ? '✅' : '❌'} ninguna plantilla se deja un texto obligatorio de su formato`);
  }

  // ── Apartados que el .docx trae y la plantilla debe tener ─────────
  // La comprobación anterior mira frases sueltas; esta mira apartados
  // enteros. Por aquí se colaron los entregables, los anexos técnicos,
  // la conformidad de las accesorias y las verificaciones técnicas: el
  // formato los trae y la plantilla no los tenía.
  console.log('\n── Apartados que el formato exige ──');
  {
    const APARTADOS: Array<[string, string, string]> = [
      ['conformidad de las prestaciones accesorias', 'conformidad_accesorias', 'la conformidad de las accesorias'],
      ['^Verificaciones técnicas', 'verificaciones', 'las verificaciones técnicas'],
      ['^Anexos técnicos', 'anexos_tecnicos', 'los anexos técnicos'],
    ];
    let huecos = 0;
    for (const p of listarPlantillas()) {
      const ruta = join('docs', 'estructura-requerimiento', p.origen.replace(/\.docx$/i, '.md'));
      if (!existsSync(ruta)) continue;
      const fuente = readFileSync(ruta, 'utf8');
      const ids: string[] = [];
      const rec = (ss: Seccion[]) => {
        for (const s of ss) {
          for (const b of s.bloques as Bloque[]) if ('id' in b) ids.push(String(b.id));
          rec(s.subsecciones ?? []);
        }
      };
      rec(p.secciones);
      for (const [enElDocx, id, nombre] of APARTADOS) {
        const estaEnLaFuente = enElDocx.startsWith('^')
          ? new RegExp(enElDocx, 'm').test(fuente)
          : fuente.includes(enElDocx);
        if (estaEnLaFuente && !ids.includes(id)) {
          problema(`${p.id}: su formato trae ${nombre} y la plantilla no lo tiene`);
          huecos++;
        }
      }
    }
    console.log(`   ${huecos === 0 ? '✅' : '❌'} ningún apartado del formato se queda fuera`);
  }

  // ── Todo lo accesorio cuelga del mismo interruptor ────────────────
  // "Si NO hay prestaciones accesorias, no hay plazo, ni lugar, ni
  // requisitos de pago de la prestación accesoria" —César, 19/08/2026—.
  // Estaba así salvo en un anexo de 8 UIT, donde la tabla de plazos se
  // pedía siempre. Se comprueba en las quince para que no vuelva.
  console.log('\n── Lo accesorio depende de que haya accesorias ──');
  {
    let sueltos = 0;
    for (const p of listarPlantillas()) {
      const rec = (ss: Seccion[], heredada?: string) => {
        for (const s of ss) {
          const cond = s.condicion ?? heredada;
          for (const b of s.bloques as Bloque[]) {
            if (!('id' in b) || !/_accesorias$/.test(String(b.id))) continue;
            const propia =
              'visibleSi' in b && b.visibleSi?.condicion === 'tiene_prestaciones_accesorias';
            if (cond !== 'tiene_prestaciones_accesorias' && !propia) {
              problema(`${p.id}: "${b.id}" se pide aunque no haya prestaciones accesorias`);
              sueltos++;
            }
            if (b.clase === 'tabla' && (b.minimo ?? 0) > 0) {
              problema(`${p.id}: "${b.id}" exige fila; debe poder quedar en no aplica`);
              sueltos++;
            }
          }
          rec(s.subsecciones ?? [], cond);
        }
      };
      rec(p.secciones);
    }
    console.log(`   ${sueltos === 0 ? '✅' : '❌'} plazo, lugar y pago de accesorias van con su interruptor`);
  }

  // ── Forma y requisitos de pago ────────────────────────────────────
  // El apartado de pago de las prestaciones accesorias faltaba en las
  // cuatro plantillas cuyo formato lo trae; se añadió el 19/08/2026 a
  // petición de César. Buscándolo apareció algo mayor: tres plantillas
  // no tienen NINGÚN apartado de forma y requisitos de pago, y sus
  // .docx sí lo traen. Se listan para que el hueco esté a la vista.
  console.log('\n── Forma y requisitos de pago ──');
  {
    const CON_ACCESORIAS = [
      'ps-servicios-general',
      'ps-servicios-consultoria',
      'uit-tdr',
      'uit-eett',
    ];
    for (const p of listarPlantillas()) {
      let pago = false;
      let accesorias = false;
      const rec = (ss: Seccion[]) => {
        for (const s of ss) {
          if (/forma y requisitos de pago/i.test(s.titulo)) pago = true;
          if (s.bloques.some((b) => b.clase === 'tabla' && b.id === 'pago_accesorias')) {
            accesorias = true;
          }
          rec(s.subsecciones ?? []);
        }
      };
      rec(p.secciones);
      if (CON_ACCESORIAS.includes(p.id) && !accesorias) {
        problema(`${p.id}: falta el pago de las prestaciones accesorias, que su formato trae`);
      }
      if (!pago) {
        console.log(`   📄 ${p.id} — sin apartado de forma y requisitos de pago (pendiente)`);
      }
    }
    console.log('   ✅ las cuatro plantillas que lo llevan tienen el pago de accesorias');
  }

  // ── El apartado de entregables ────────────────────────────────────
  // Faltaba en dos plantillas y en una tercera estaba colgado de otro
  // apartado, con columnas que no eran las del formato. El auditor no
  // lo veía: solo coteja textos invariables, y una cabecera de tabla no
  // lo es. En obras el propio formato lo parte en dos —diseño y
  // ejecución—, así que se acepta una tabla o varias mientras vivan en
  // un apartado de entregables.
  console.log('\n── El apartado de entregables ──');
  {
    let faltan = 0;
    for (const p of listarPlantillas()) {
      const tablas: Array<{ seccion: string; columnas: string[] }> = [];
      const rec = (ss: Seccion[], dentroDeEntregables: boolean) => {
        for (const s of ss) {
          const propio = dentroDeEntregables || /entregable/i.test(s.titulo);
          for (const b of s.bloques as Bloque[]) {
            if (b.clase === 'tabla' && b.id.startsWith('entregables') && propio) {
              tablas.push({ seccion: s.titulo, columnas: b.columnas });
            }
            if (b.clase === 'tabla' && b.id.startsWith('entregables') && !propio) {
              problema(`${p.id}: los entregables cuelgan de "${s.titulo}", no de su propio apartado`);
              faltan++;
            }
          }
          rec(s.subsecciones ?? [], propio);
        }
      };
      rec(p.secciones, false);

      if (tablas.length === 0) {
        problema(`${p.id}: no tiene tabla de entregables en su apartado`);
        faltan++;
        continue;
      }
      for (const t of tablas) {
        if (t.columnas[0] !== 'N°' && t.columnas[0] !== 'N.°') {
          problema(`${p.id}: la primera columna de entregables es "${t.columnas[0]}"`);
          faltan++;
        }
      }
    }
    console.log(`   ${faltan === 0 ? '✅' : '❌'} las quince tienen su apartado de entregables, con su tabla`);
  }

  // ── Un dato de varias líneas dentro de un párrafo ─────────────────
  // El lugar de prestación puede ser una dirección larga o varias
  // sedes, una por línea. Lo que no puede pasar es que el salto de
  // línea se coma el texto invariable que rodea al hueco.
  console.log('\n── Un hueco de párrafo con varias líneas ──');
  {
    const p = obtenerPlantilla('ps-servicios-general');
    if (p) {
      const LUGAR = 'la Oficina Registral de Ayacucho, distrito y provincia de Huamanga\nla Oficina Receptora de Huanta, provincia de Huanta';
      const doc = ensamblarRequerimiento(
        p,
        { ...respuestasVacias(), campos: { denominacion: 'X', lugar_servicio: LUGAR } },
        {},
      );
      const comprobaciones: Array<[string, boolean]> = [
        ['conserva el texto invariable del párrafo', doc.markdown.includes('El servicio se presta en')],
        ['conserva la primera línea', doc.markdown.includes('Oficina Registral de Ayacucho')],
        ['y la segunda', doc.markdown.includes('Oficina Receptora de Huanta')],
      ];
      for (const [que, ok] of comprobaciones) {
        if (!ok) problema(`un hueco con varias líneas no ${que}`);
        console.log(`   ${ok ? '✅' : '❌'} ${que}`);
      }
      try {
        const buffer = await markdownToDocxBuffer(doc.markdown, { title: 'Requerimiento' });
        const ok = buffer.length > 5000;
        if (!ok) problema('el Word con un hueco de varias líneas salió vacío');
        console.log(`   ${ok ? '✅' : '❌'} el Word se genera igual`);
      } catch (e) {
        problema(`el Word falló con un hueco de varias líneas: ${(e as Error).message}`);
      }
    }
  }


  console.log('\n── Construcción del prompt ──');
  console.log(`   Bienes en General: ${conEjemplo} bloques con ejemplo, ${sinEjemplo} sin ejemplo`);
  if (bloqueConEjemplo) {
    const prompt = promptUsuario(bloqueConEjemplo as never, {
      denominacion: 'Adquisición de muebles de melamina',
      organo: 'Oficina de Abastecimiento',
      aporteUsuario: 'Escritorios de 1.20 m',
    });
    const comprobaciones: Array<[string, boolean]> = [
      ['incluye la instrucción de César', prompt.includes(bloqueConEjemplo.instruccion.slice(0, 40))],
      ['incluye su redacción de ejemplo', prompt.includes(bloqueConEjemplo.ejemplo.slice(0, 40))],
      ['advierte que no se copie el ejemplo', prompt.includes('NO copies su contenido')],
      ['incluye la denominación', prompt.includes('Adquisición de muebles de melamina')],
      ['incluye el aporte del usuario', prompt.includes('Escritorios de 1.20 m')],
    ];
    for (const [que, ok] of comprobaciones) {
      if (!ok) problema(`el prompt no ${que}`);
      console.log(`   ${ok ? '✅' : '❌'} ${que}`);
    }
    // Modo mejorar: con texto previo la tarea cambia y lo escrito por el
    // area usuaria tiene que viajar entero. Antes no se enviaba nunca y
    // el boton generaba otro texto en su lugar.
    const escrito =
      'Los bienes deben ser entregados en 30 dias calendario en el almacen central de la entidad.';
    const mejorar = promptUsuario(bloqueConEjemplo as never, {
      denominacion: 'Adquisición de muebles de melamina',
      aporteUsuario: 'Añade la garantía',
      textoActual: escrito,
    });
    const comprobacionesMejora: Array<[string, boolean]> = [
      ['envía el texto ya escrito', mejorar.includes(escrito)],
      ['ordena mejorar y no reescribir', mejorar.includes('MEJORAR ESE TEXTO, NO ESCRIBIR OTRO')],
      ['prohíbe cambiar los datos del usuario', mejorar.includes('Conserva integras todas las decisiones')],
      ['cierra pidiendo el apartado mejorado', mejorar.includes('mejorado, y solo eso')],
      ['ya no pide redactar desde cero', !mejorar.includes('Redacta ahora el apartado')],
      ['sigue admitiendo la indicación adicional', mejorar.includes('Añade la garantía')],
      ['sin texto previo sigue redactando', prompt.includes('Redacta ahora el apartado')],
    ];
    for (const [que, ok] of comprobacionesMejora) {
      if (!ok) problema(`el modo mejorar no ${que}`);
      console.log(`   ${ok ? '✅' : '❌'} modo mejorar: ${que}`);
    }

    const sistema = promptSistema(bienes);
    const prohibiciones = ['No inventes cifras', 'No exijas marcas comerciales', 'sin comillas envolventes'];
    for (const frase of prohibiciones) {
      const ok = sistema.includes(frase);
      if (!ok) problema(`el prompt de sistema no contiene "${frase}"`);
      console.log(`   ${ok ? '✅' : '❌'} el prompt de sistema prohíbe: ${frase}`);
    }
  }

  console.log(
    fallos === 0
      ? '\n✅ Sin problemas estructurales en las quince plantillas.'
      : `\n❌ ${fallos} problema(s) encontrados.`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
