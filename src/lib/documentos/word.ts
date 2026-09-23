/**
 * El Word de cualquier documento de A-LexIA, compuesto desde sus piezas.
 *
 * POR QUÉ UNO SOLO
 *
 * El requerimiento, el acta de evaluación y la carta de subsanación salen
 * de modelos de César que comparten la misma casa: Arial 10, cuadros con
 * la cabecera sobre gris azulado (D5DCE4), títulos numerados con sangría
 * francesa, el cuerpo justificado y alineado bajo su título, y los huecos
 * que la Entidad completa a mano en rojo sobre gris. Lo que cambia de uno
 * a otro son medidas —la página, los márgenes, cuánto se sangra cada
 * nivel, el tamaño de la letra dentro de los cuadros—, y eso es lo que
 * declara cada `Formato`. Si cada documento tuviera su propio compositor,
 * el día que César corrija una medida habría que corregirla tres veces.
 *
 * CÓMO SE MIDIÓ
 *
 * Abriendo por dentro los .docx de César: los quince formatos de
 * requerimiento, el «Acta de Evaluación - OK.docx» y sus cartas. Cada
 * `FORMATO_*` dice de dónde sale.
 *
 * Los numerales vienen ya escritos en las piezas: aquí no se numera nada,
 * solo se compone.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  HighlightColor,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { CeldaCuadro, MarcaDePieza, Pieza, PiezaCuadro, PiezaTabla } from './piezas';

// ── Los formatos ─────────────────────────────────────────────────────

export interface Formato {
  /** En veinteavos de punto. */
  pagina: { ancho: number; alto: number };
  margenes: { arriba: number; abajo: number; izquierda: number; derecha: number };
  /** Letra del cuerpo, en medios puntos: 20 es Arial 10. */
  tamano: number;
  /** Letra dentro de los cuadros. El acta de César los escribe en 9. */
  tamanoTabla: number;
  /**
   * Dónde empieza el texto de cada nivel: `[0]` es el margen, `[1]` el
   * texto de un título «1.» y de su cuerpo, `[2]` el de un «1.1»… Pasado
   * el último, se sigue con el mismo paso.
   */
  sangrias: number[];
  /**
   * `ficha`: el cuerpo entero en una tabla de una columna, una fila gris
   * por apartado. Es la de los anexos de menores a 8 UIT.
   */
  maqueta: 'normal' | 'ficha';
  /**
   * Los huecos entre corchetes —«[●]», «[Comité / OEC / DEC]»— en rojo
   * sobre gris, como en el acta y las cartas de César. En el
   * requerimiento no: allí los huecos son `[PENDIENTE: …]`.
   */
  huecosEnRojo: boolean;
  /**
   * Si un subtítulo se pega al párrafo que le sigue. Dentro de la ficha,
   * NO: en una celda Word no pega el párrafo sino la FILA entera, y una
   * fila de cuatro páginas pegada a otra no cabe en ninguna.
   */
  pegarTitulos: boolean;
}

const A4 = { ancho: 11906, alto: 16838 };
/** Carta: el tamaño del «Acta de Evaluación - OK.docx». */
const CARTA = { ancho: 12240, alto: 15840 };

/** Los quince formatos de requerimiento: A4, 3 cm, Arial 10. */
export const FORMATO_REQUERIMIENTO: Formato = {
  pagina: A4,
  margenes: { arriba: 1701, abajo: 1701, izquierda: 1701, derecha: 1701 },
  tamano: 20,
  tamanoTabla: 20,
  sangrias: [0, 567, 1134, 1701],
  maqueta: 'normal',
  huecosEnRojo: false,
  pegarTitulos: true,
};

/** Los anexos de menores a 8 UIT: lo mismo, en ficha. */
export const FORMATO_REQUERIMIENTO_FICHA: Formato = {
  ...FORMATO_REQUERIMIENTO,
  sangrias: [0, 440, 880, 1320],
  maqueta: 'ficha',
  pegarTitulos: false,
};

/**
 * El acta de evaluación: tamaño carta, 3 cm, los cuadros en Arial 9, y
 * las hijas «5.1.» a 1,75 cm como en el modelo.
 *
 * Los títulos «I.» el modelo los cuelga a 0,75 cm, y ahí no caben los
 * romanos largos: «XVII.» empujaba el título a la siguiente tabulación y
 * quedaba descolgado de los demás. El acta llega a veinte apartados, así
 * que se cuelgan a 1,25 cm y todos alinean.
 */
export const FORMATO_ACTA: Formato = {
  pagina: CARTA,
  margenes: { arriba: 1701, abajo: 1701, izquierda: 1701, derecha: 1701 },
  tamano: 20,
  tamanoTabla: 18,
  sangrias: [0, 709, 1276, 1560],
  maqueta: 'normal',
  huecosEnRojo: true,
  pegarTitulos: true,
};

/**
 * Las cartas: A4, 2,5 cm arriba y abajo, 3 cm a los lados —su «CARTA DE
 * MODIFICACIÓN DE CONTRATO»—; los apartados «1.» a 1 cm.
 */
export const FORMATO_CARTA: Formato = {
  pagina: A4,
  margenes: { arriba: 1417, abajo: 1417, izquierda: 1701, derecha: 1701 },
  tamano: 20,
  tamanoTabla: 18,
  sangrias: [0, 567, 1134],
  maqueta: 'normal',
  huecosEnRojo: true,
  pegarTitulos: true,
};

// ── Constantes de la casa ────────────────────────────────────────────

const FUENTE = 'Arial';
/** El gris azulado de las cabeceras y de las etiquetas. */
const GRIS = 'D5DCE4';
/** El crema con que el acta marca el dato de una ficha. */
const CREMA = 'EEECE1';
/** El rojo de las advertencias y los huecos. */
const ROJO = 'EE0000';

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: '000000' } as const;
const BORDES_TABLA = {
  top: BORDE,
  bottom: BORDE,
  left: BORDE,
  right: BORDE,
  insideHorizontal: BORDE,
  insideVertical: BORDE,
};

/** Margen interior de las celdas: el de Word por defecto. */
const MARGEN_CELDA = { top: 40, bottom: 40, left: 108, right: 108 };

// ── El compositor ────────────────────────────────────────────────────

interface Estilo {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  highlight?: (typeof HighlightColor)[keyof typeof HighlightColor];
}

type Bloque = Paragraph | Table;

/**
 * Todo lo que necesita saber quien compone: el formato y el ancho que
 * queda para escribir. Se pasa en vez de leer constantes porque el mismo
 * código compone un requerimiento en A4 y un acta en carta.
 */
class Compositor {
  readonly anchoTexto: number;

  constructor(readonly f: Formato) {
    this.anchoTexto = f.pagina.ancho - f.margenes.izquierda - f.margenes.derecha;
  }

  sangria(nivel: number): number {
    const s = this.f.sangrias;
    if (nivel <= 0) return 0;
    if (nivel < s.length) return s[nivel];
    const paso = s[s.length - 1] - (s[s.length - 2] ?? 0);
    return s[s.length - 1] + paso * (nivel - s.length + 1);
  }

  /** Lo que cuelga el numeral de un título de este nivel. */
  colgante(nivel: number): number {
    return Math.max(360, this.sangria(nivel) - this.sangria(nivel - 1));
  }

  /**
   * Los runs de un texto con **negritas**, *cursivas* y huecos.
   *
   * `[PENDIENTE: …]` sale en amarillo y en negrita: un hueco del
   * requerimiento tiene que verse de un vistazo antes de firmar. Los
   * demás corchetes, en los formatos que lo piden, en rojo sobre gris,
   * que es como los escribe César en sus modelos.
   */
  runs(texto: string, base: Estilo = {}): TextRun[] {
    const salida: TextRun[] = [];
    const nuevo = (t: string, e: Estilo) =>
      new TextRun({ text: t, font: FUENTE, size: this.f.tamano, ...base, ...e });
    // Primero las negritas y las cursivas, y dentro de cada trozo los
    // huecos. Al revés —como estaba— una negrita que contiene un hueco,
    // «**CARTA N.° [●]-[AÑO]**», quedaba partida y los asteriscos salían
    // impresos en la carta.
    const trozos: Array<{ texto: string; estilo: Estilo }> = [];
    const marcas = /(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
    let desde = 0;
    let m: RegExpExecArray | null;
    while ((m = marcas.exec(texto))) {
      if (m.index > desde) trozos.push({ texto: texto.slice(desde, m.index), estilo: {} });
      if (m[1]) trozos.push({ texto: m[1].slice(2, -2), estilo: { bold: true } });
      else trozos.push({ texto: m[2].slice(1, -1), estilo: { italics: true } });
      desde = m.index + m[0].length;
    }
    if (desde < texto.length) trozos.push({ texto: texto.slice(desde), estilo: {} });

    const hueco = this.f.huecosEnRojo ? /(\[[^\]\n]{1,200}\])/ : /(\[PENDIENTE:[^\]]*\])/;
    for (const { texto: t, estilo } of trozos) {
      for (const parte of t.split(hueco)) {
        if (!parte) continue;
        if (/^\[PENDIENTE:[^\]]*\]$/.test(parte)) {
          salida.push(nuevo(parte, { ...estilo, bold: true, highlight: HighlightColor.YELLOW }));
        } else if (this.f.huecosEnRojo && /^\[[^\]\n]{1,200}\]$/.test(parte)) {
          salida.push(nuevo(parte, { ...estilo, color: ROJO, highlight: HighlightColor.LIGHT_GRAY }));
        } else {
          salida.push(nuevo(parte, estilo));
        }
      }
    }
    if (salida.length === 0) salida.push(nuevo(' ', {}));
    return salida;
  }

  parrafo(
    texto: string,
    sangria: number,
    estilo: Estilo = {},
    alineacion: 'derecha' | 'centro' | 'izquierda' | 'justificado' = 'justificado',
    pegado = false,
  ): Paragraph {
    return new Paragraph({
      alignment: {
        derecha: AlignmentType.RIGHT,
        centro: AlignmentType.CENTER,
        izquierda: AlignmentType.LEFT,
        justificado: AlignmentType.JUSTIFIED,
      }[alineacion],
      indent: { left: alineacion === 'justificado' || alineacion === 'izquierda' ? sangria : 0 },
      spacing: { after: pegado ? 0 : 120, line: 240 },
      children: this.runs(texto, estilo),
    });
  }

  titulo(numero: string | undefined, texto: string, nivel: number): Paragraph {
    const izquierda = this.sangria(nivel);
    const colgante = this.colgante(nivel);
    return new Paragraph({
      keepNext: this.f.pegarTitulos,
      alignment: AlignmentType.LEFT,
      indent: numero ? { left: izquierda, hanging: colgante } : { left: izquierda },
      tabStops: [{ type: TabStopType.LEFT, position: izquierda }],
      spacing: { before: nivel <= 1 ? 240 : 160, after: 120, line: 240 },
      children: this.runs(numero ? `${numero}\t${texto}` : texto, { bold: true }),
    });
  }

  lista(elementos: string[], marca: MarcaDePieza, sangria: number): Paragraph[] {
    const colgante = marca === 'vineta' ? 284 : 425;
    return elementos.map((el, i) => {
      const m = marcaDe(marca, i);
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: sangria + colgante, hanging: m ? colgante : 0 },
        tabStops: [{ type: TabStopType.LEFT, position: sangria + colgante }],
        spacing: { after: 60, line: 240 },
        children: m
          ? [new TextRun({ text: `${m}\t`, font: FUENTE, size: this.f.tamano }), ...this.runs(el)]
          : this.runs(el),
      });
    });
  }

  celda(hijos: Bloque[], ancho: number, o: { gris?: boolean; crema?: boolean; columnas?: number } = {}) {
    const fondo = o.gris ? GRIS : o.crema ? CREMA : undefined;
    return new TableCell({
      width: { size: ancho, type: WidthType.DXA },
      columnSpan: o.columnas && o.columnas > 1 ? o.columnas : undefined,
      margins: MARGEN_CELDA,
      verticalAlign: VerticalAlign.CENTER,
      shading: fondo ? { type: ShadingType.CLEAR, color: 'auto', fill: fondo } : undefined,
      children: hijos,
    });
  }

  /** El texto de una celda: cada salto de línea, un párrafo. */
  textoDeCelda(
    texto: string,
    o: { negrita?: boolean; centrado?: boolean; tamano?: number } = {},
  ): Paragraph[] {
    return texto.split('\n').map(
      (l) =>
        new Paragraph({
          alignment: o.centrado ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 0, line: 240 },
          children: this.runs(l, {
            size: o.tamano ?? this.f.tamanoTabla,
            ...(o.negrita ? { bold: true } : {}),
          }),
        }),
    );
  }

  tabla(t: PiezaTabla, sangria: number, disponible: number): Bloque[] {
    const salida: Bloque[] = [];
    if (t.titulo) salida.push(this.parrafo(`**${t.titulo}**`, sangria));

    const ancho = disponible - sangria;
    const anchos = anchosDe(t, ancho, this.f.tamanoTabla);
    const cabecera = new TableRow({
      tableHeader: true,
      children: t.columnas.map((c, j) =>
        this.celda(this.textoDeCelda(c, { negrita: true, centrado: true }), anchos[j], { gris: true }),
      ),
    });
    // Un cuadro exigido sale aunque esté vacío, con una fila para
    // escribir a mano.
    const filas = t.filas.length > 0 ? t.filas : [t.columnas.map(() => '')];
    const cuerpo = filas.map(
      (f) =>
        new TableRow({
          children: t.columnas.map((_c, j) => {
            const v = f[j] ?? '';
            // La primera columna numera las filas: «01», centrado y en
            // negrita, como en los modelos.
            const esNumero = j === 0 && /^\d{1,3}$/.test(v.trim());
            return this.celda(
              this.textoDeCelda(esNumero ? v.trim().padStart(2, '0') : v, {
                negrita: esNumero,
                centrado: esNumero,
              }),
              anchos[j],
            );
          }),
        }),
    );
    salida.push(
      new Table({
        width: { size: ancho, type: WidthType.DXA },
        columnWidths: anchos,
        layout: TableLayoutType.FIXED,
        indent: { size: sangria, type: WidthType.DXA },
        borders: BORDES_TABLA,
        rows: [cabecera, ...cuerpo],
      }),
      // Word pega el párrafo siguiente a la tabla si no hay nada entre medio.
      new Paragraph({ spacing: { after: 60 }, children: [] }),
    );
    return salida;
  }

  /** Un cuadro con forma propia: fichas, celdas combinadas. */
  cuadro(c: PiezaCuadro, sangria: number, disponible: number): Bloque[] {
    const ancho = disponible - sangria;
    const total = c.proporciones.reduce((a, b) => a + b, 0) || 1;
    // Lo que trae cada columna, contando solo las celdas que ocupan una:
    // una celda combinada no dice cuánto necesita cada columna suya.
    const textos: string[][] = c.proporciones.map(() => []);
    for (const fila of c.filas) {
      let col = 0;
      for (const celda of fila) {
        const n = Math.max(1, celda.columnas ?? 1);
        if (n === 1 && col < textos.length) textos[col].push(celda.texto);
        col += n;
      }
    }
    const anchos = queQuepa(
      c.proporciones.map((p) => Math.round((ancho * p) / total)),
      textos,
      c.tamano ?? this.f.tamanoTabla,
    );
    const filas = c.filas.map((fila) => {
      let col = 0;
      return new TableRow({
        cantSplit: true,
        children: fila.map((celda: CeldaCuadro) => {
          const n = Math.max(1, celda.columnas ?? 1);
          const suAncho = anchos.slice(col, col + n).reduce((a, b) => a + b, 0);
          col += n;
          return this.celda(
            this.textoDeCelda(celda.texto, { negrita: celda.negrita ?? celda.gris, tamano: c.tamano }),
            suAncho,
            { gris: celda.gris, crema: celda.crema, columnas: n },
          );
        }),
      });
    });
    return [
      new Table({
        width: { size: ancho, type: WidthType.DXA },
        columnWidths: anchos,
        layout: TableLayoutType.FIXED,
        indent: { size: sangria, type: WidthType.DXA },
        borders: BORDES_TABLA,
        rows: filas,
      }),
      new Paragraph({ spacing: { after: 60 }, children: [] }),
    ];
  }

  /** El cuadro de datos que abre el requerimiento. */
  datos(filas: Array<{ etiqueta: string; valor: string; pendiente?: boolean }>): Bloque[] {
    // Las proporciones de los formatos: 3882 y 4606 de 8488.
    const izquierda = Math.round((this.anchoTexto * 3882) / 8488);
    const derecha = this.anchoTexto - izquierda;
    return [
      new Table({
        width: { size: this.anchoTexto, type: WidthType.DXA },
        columnWidths: [izquierda, derecha],
        layout: TableLayoutType.FIXED,
        borders: BORDES_TABLA,
        rows: filas.map(
          (f) =>
            new TableRow({
              children: [
                this.celda(this.textoDeCelda(`${f.etiqueta.replace(/:$/, '')}:`, { negrita: true }), izquierda, {
                  gris: true,
                }),
                this.celda(
                  this.textoDeCelda(f.pendiente ? `[PENDIENTE: ${f.etiqueta}]` : f.valor),
                  derecha,
                ),
              ],
            }),
        ),
      }),
      new Paragraph({ spacing: { after: 240 }, children: [] }),
    ];
  }

  /**
   * El cuadro de firmas del acta: de tres en tres, una fila alta en
   * blanco para firmar y debajo el nombre y el cargo sobre gris.
   */
  firmas(personas: Array<{ nombre?: string; cargo?: string }>): Bloque[] {
    const gente = personas.length > 0 ? personas : [{}, {}, {}];
    const salida: Bloque[] = [new Paragraph({ spacing: { after: 240 }, children: [] })];
    for (let i = 0; i < gente.length; i += 3) {
      const grupo = gente.slice(i, i + 3);
      while (grupo.length < 3) grupo.push({});
      const ancho = Math.floor(this.anchoTexto / 3);
      const fila = (texto: (p: { nombre?: string; cargo?: string }) => string, gris: boolean, alta = false) =>
        new TableRow({
          height: alta ? { value: 1200, rule: HeightRule.ATLEAST } : undefined,
          cantSplit: true,
          children: grupo.map((p) =>
            this.celda(this.textoDeCelda(texto(p), { negrita: gris, centrado: true }), ancho, { gris }),
          ),
        });
      salida.push(
        new Table({
          width: { size: ancho * 3, type: WidthType.DXA },
          columnWidths: [ancho, ancho, ancho],
          layout: TableLayoutType.FIXED,
          borders: BORDES_TABLA,
          rows: [
            fila(() => '', false, true),
            fila((p) => p.nombre?.trim() || 'Nombres y apellidos', true),
            fila((p) => p.cargo?.trim() || 'Cargo', true),
          ],
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      );
    }
    return salida;
  }

  /** La firma de una carta, centrada bajo su línea. */
  firma(nombre: string, cargo?: string, entidad?: string): Bloque[] {
    const linea = (texto: string, estilo: Estilo, antes = 0) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext: true,
        spacing: { before: antes, after: 0, line: 240 },
        children: this.runs(texto, estilo),
      });
    return [
      linea('___________________________', {}, 1000),
      linea(nombre, { bold: true }),
      ...(cargo ? [linea(cargo, {})] : []),
      ...(entidad ? [linea(entidad, { bold: true })] : []),
    ];
  }

  cabecera(piezas: Pieza[]): Paragraph[] {
    return piezas
      .filter((p) => p.clase === 'titulo' && p.rol)
      .map(
        (p, i, todas) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: i === todas.length - 1 ? 240 : 0, line: 240 },
            children: this.runs(p.clase === 'titulo' ? p.texto : '', { bold: true }),
          }),
      );
  }

  /**
   * Una secuencia de piezas del cuerpo. El cuerpo se sangra con el último
   * título visto: lo que va bajo el «4.1» se alinea con el texto del
   * «4.1», no con el margen.
   */
  componer(piezas: Pieza[], disponible: number, nivelInicial: number): Bloque[] {
    const salida: Bloque[] = [];
    let nivel = nivelInicial;
    const sangria = () => this.sangria(nivel);

    for (const p of piezas) {
      switch (p.clase) {
        case 'titulo':
          if (p.rol) break;
          if (p.numero) nivel = p.nivel;
          salida.push(this.titulo(p.numero, p.texto, p.numero ? p.nivel : nivel));
          break;
        case 'parrafo':
          salida.push(this.parrafo(p.texto, sangria(), {}, p.alineacion ?? 'justificado', p.pegado));
          break;
        case 'campo':
          salida.push(
            this.parrafo(
              `**${p.etiqueta.replace(/:$/, '')}:** ${
                p.pendiente ? `[PENDIENTE: ${p.etiqueta}]` : p.valor
              }`,
              sangria(),
            ),
          );
          break;
        case 'pendiente':
          salida.push(this.parrafo(`[PENDIENTE: ${p.etiqueta}]`, sangria()));
          break;
        case 'nota': {
          // Como las advertencias de los modelos: en rojo, entre
          // corchetes. Son para quien redacta o firma y se retiran antes
          // de remitir, así que tienen que saltar a la vista.
          const t = p.texto.trim();
          salida.push(this.parrafo(t.startsWith('[') ? t : `[${t}]`, sangria(), { color: ROJO }));
          break;
        }
        case 'lista':
          if (p.encabezado) salida.push(this.parrafo(p.encabezado, sangria()));
          salida.push(...this.lista(p.elementos, p.marca, sangria()));
          salida.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
          break;
        case 'tabla':
          salida.push(...this.tabla(p, sangria(), disponible));
          break;
        case 'cuadro':
          salida.push(...this.cuadro(p, sangria(), disponible));
          break;
        case 'datos':
          salida.push(...this.datos(p.filas));
          break;
        case 'firmas':
          salida.push(...this.firmas(p.personas));
          break;
        case 'firma':
          salida.push(...this.firma(p.nombre, p.cargo, p.entidad));
          break;
      }
    }
    return salida;
  }

  /** Títulos numerados y cuerpo sangrado. */
  maquetaNormal(piezas: Pieza[]): Bloque[] {
    return [...this.cabecera(piezas), ...this.componer(piezas, this.anchoTexto, 0)];
  }

  /**
   * La ficha de los anexos de 8 UIT: una tabla de una columna, una fila
   * gris por apartado con su numeral y su título, y debajo la fila con
   * todo lo que cuelga de él.
   */
  maquetaFicha(piezas: Pieza[]): Bloque[] {
    const salida: Bloque[] = [...this.cabecera(piezas)];

    // Lo de antes del primer apartado —el cuadro de datos— va fuera.
    const primero = piezas.findIndex((p) => p.clase === 'titulo' && !p.rol && p.nivel === 1);
    const antes = primero === -1 ? piezas : piezas.slice(0, primero);
    salida.push(...this.componer(antes, this.anchoTexto, 1));
    if (primero === -1) return salida;

    const grupos: Array<{ numero?: string; texto: string; cuerpo: Pieza[] }> = [];
    for (const p of piezas.slice(primero)) {
      if (p.clase === 'titulo' && !p.rol && p.nivel === 1) {
        grupos.push({ numero: p.numero, texto: p.texto, cuerpo: [] });
      } else {
        grupos[grupos.length - 1]?.cuerpo.push(p);
      }
    }

    const dentro = this.anchoTexto - MARGEN_CELDA.left - MARGEN_CELDA.right;
    const paso = this.sangria(1);
    const filas: TableRow[] = [];
    for (const g of grupos) {
      filas.push(
        new TableRow({
          cantSplit: true,
          children: [
            this.celda(
              [
                new Paragraph({
                  keepNext: true,
                  indent: { left: paso, hanging: paso },
                  tabStops: [{ type: TabStopType.LEFT, position: paso }],
                  spacing: { after: 0, line: 240 },
                  children: this.runs(g.numero ? `${g.numero}\t${g.texto}` : g.texto, { bold: true }),
                }),
              ],
              this.anchoTexto,
              { gris: true },
            ),
          ],
        }),
      );
      const cuerpo = this.componer(g.cuerpo, dentro, 1);
      filas.push(
        new TableRow({
          children: [
            // Una celda de Word no puede quedar sin párrafo.
            this.celda(cuerpo.length > 0 ? cuerpo : [new Paragraph({ children: [] })], this.anchoTexto),
          ],
        }),
      );
    }

    salida.push(
      new Table({
        width: { size: this.anchoTexto, type: WidthType.DXA },
        columnWidths: [this.anchoTexto],
        layout: TableLayoutType.FIXED,
        borders: BORDES_TABLA,
        rows: filas,
      }),
    );
    return salida;
  }
}

function marcaDe(marca: MarcaDePieza, i: number): string {
  if (marca === 'numero') return `${i + 1}.`;
  if (marca === 'literal') {
    let n = i;
    let letras = '';
    do {
      letras = String.fromCharCode(97 + (n % 26)) + letras;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return `${letras})`;
  }
  if (marca === 'ninguno') return '';
  // Los modelos usan guiones, no puntos, en sus viñetas.
  return '-';
}

/**
 * Cuánto ancho le toca a cada columna. El «N.°» va estrecho, como en
 * todos los cuadros de los modelos; el resto se reparte según lo que
 * traiga cada columna.
 */
function anchosDe(t: PiezaTabla, total: number, tamano: number): number[] {
  const estrecha = (c: string) => /^(n\.?\s*[°º]|nº|ítem|item|código)\.?$/i.test(c.trim());
  const pesos = t.columnas.map((c, j) => {
    if (estrecha(c)) return 0;
    const largos = t.filas.map((f) => (f[j] ?? '').length);
    const medio = largos.length ? largos.reduce((a, b) => a + b, 0) / largos.length : 0;
    // Un mínimo de 16 para que una cabecera de dos palabras no se parta
    // en tres renglones: «Forma de cálculo» salía una palabra por línea.
    return Math.max(c.length, Math.min(medio, 80), 16);
  });
  const fijo: number[] = t.columnas.map((c) => (estrecha(c) ? 700 : 0));
  const libre = total - fijo.reduce((a, b) => a + b, 0);
  const suma = pesos.reduce((a, b) => a + b, 0) || 1;
  const anchos = pesos.map((p, j) => (fijo[j] ? fijo[j] : Math.round((libre * p) / suma)));
  return queQuepa(
    anchos,
    t.columnas.map((c, j) => [c, ...t.filas.map((f) => f[j] ?? '')]),
    tamano,
  );
}

/**
 * Cada columna, al menos tan ancha como su palabra más larga.
 *
 * Lo que falta se toma de las columnas que tienen de sobra, en proporción
 * a lo que les sobra. Si ni así cabe todo —una tabla con demasiadas
 * columnas—, se reparte en proporción a lo que cada una necesita.
 */
function queQuepa(anchos: number[], textos: string[][], tamano: number): number[] {
  // Arial en negrita, a ojo de buen cubero: 0,65 de eme por letra. Una
  // eme mide el tamaño en puntos; en veinteavos, `tamano` medios puntos
  // son `tamano * 10`.
  const porLetra = tamano * 10 * 0.65;
  const total = anchos.reduce((a, b) => a + b, 0);
  const minimos = textos.map((col) => {
    const palabra = Math.max(
      0,
      ...col.flatMap((t) => t.split(/[\s/]+/)).map((w) => w.length),
    );
    // Las celdas llevan 108 de margen a cada lado.
    return Math.min(Math.round(palabra * porLetra) + 230, total * 0.45);
  });
  const necesita = minimos.reduce((a, b) => a + b, 0);
  if (necesita >= total) {
    return minimos.map((m) => Math.round((total * m) / necesita));
  }
  const salida = [...anchos];
  let falta = 0;
  salida.forEach((w, j) => {
    if (w < minimos[j]) {
      falta += minimos[j] - w;
      salida[j] = minimos[j];
    }
  });
  if (falta === 0) return salida;
  const sobra = salida.map((w, j) => Math.max(0, w - minimos[j]));
  const totalSobra = sobra.reduce((a, b) => a + b, 0) || 1;
  return salida.map((w, j) => Math.round(w - (falta * sobra[j]) / totalSobra));
}

/**
 * El Word de unas piezas, en el formato que se pida.
 *
 * Sin sello de A-LexIA, ni cabecera ni pie: ninguno de los modelos de
 * César los trae, y son documentos que firma la Entidad.
 */
export async function piezasADocx(piezas: Pieza[], formato: Formato): Promise<Buffer> {
  // Una pieza `seccion` abre hoja nueva: los anexos del acta van
  // apaisados, y con la página girada también cambia el ancho que queda
  // para escribir, así que cada hoja se compone con el suyo.
  const hojas: Array<{ horizontal: boolean; piezas: Pieza[] }> = [{ horizontal: false, piezas: [] }];
  for (const p of piezas) {
    if (p.clase === 'seccion') hojas.push({ horizontal: p.orientacion === 'horizontal', piezas: [] });
    else hojas[hojas.length - 1].piezas.push(p);
  }

  const sections = hojas
    .filter((h, i) => i === 0 || h.piezas.length > 0)
    .map((h) => {
      const pagina = h.horizontal
        ? { ancho: formato.pagina.alto, alto: formato.pagina.ancho }
        : formato.pagina;
      const c = new Compositor({ ...formato, pagina });
      const cuerpo = formato.maqueta === 'ficha' ? c.maquetaFicha(h.piezas) : c.maquetaNormal(h.piezas);
      return {
        properties: {
          page: {
            // docx gira la página con `orientation`, pero entonces espera
            // el ancho y el alto de la vertical: si se le dan ya girados,
            // los vuelve a girar y la hoja sale vertical.
            size: {
              width: formato.pagina.ancho,
              height: formato.pagina.alto,
              orientation: h.horizontal ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: formato.margenes.arriba,
              bottom: formato.margenes.abajo,
              left: formato.margenes.izquierda,
              right: formato.margenes.derecha,
            },
          },
        },
        children: cuerpo.length > 0 ? cuerpo : [new Paragraph({ children: [] })],
      };
    });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FUENTE, size: formato.tamano } },
      },
    },
    sections,
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
