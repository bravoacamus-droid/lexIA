"""
Texto estructurado de una norma a partir de su PDF oficial.

Documento 11 de César (30/09/2026): «debe reproducir fielmente el texto
oficial, respetando su estructura (títulos, capítulos, artículos,
numerales, literales y tablas), evitando textos concatenados o
distorsionados».

El texto plano que se guardó al ingerir (raw_text) perdió la
maquetación: sin saltos de párrafo, con encabezados de página en medio y
las tablas aplanadas. Aquí se vuelve al PDF y se lee lo que el texto
plano no tiene:

  · columnas: El Peruano compone a dos columnas; se lee una y luego otra;
  · encabezados y pies de página repetidos (y números de página): fuera;
  · párrafos: los marca la sangría de la primera línea o el espacio;
  · negrita: títulos, capítulos y artículos van en negrita;
  · tablas: se rearman con find_tables y salen como tablas.

Sale Markdown con una convención fija, que entiende el visor:
  #      la norma (Ley, Reglamento, Decreto Supremo) cuando hay varias
  ##     Título, Disposiciones complementarias, Anexo, sección mayor
  ###    Capítulo
  ####   Subcapítulo, Sección
  #####  Artículo, disposición (Primera., Segunda.…)
  **192.1.** numeral al inicio del párrafo
  - **a)** literal

Uso: python scripts/texto-estructurado.py <pdf> [--columnas 1|2] > salida.md
"""
import re
import sys
import json
from collections import Counter

import fitz  # PyMuPDF

ROMANOS = r'(?:[IVXLC]+|PRELIMINAR|[ÚU]NIC[OA])'
RX_TITULO = re.compile(rf'^T[ÍI]TULO\s+{ROMANOS}\b', re.I)
RX_CAPITULO = re.compile(rf'^CAP[ÍI]TULO\s+{ROMANOS}\b', re.I)
RX_SUBCAP = re.compile(rf'^(SUBCAP[ÍI]TULO|SECCI[ÓO]N|SUBSECCI[ÓO]N)\s+{ROMANOS}\b', re.I)
RX_ARTICULO = re.compile(r'^Art[íi]culo\s+(?:\d+[A-Za-z°º-]*|[IVXLC]+\b)(?:\s*[.\-–:]+\s*|\s+)', re.I)
RX_DISPOSICION = re.compile(
    r'^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA|UND[ÉE]CIMA|DUOD[ÉE]CIMA|'
    r'D[ÉE]CIMO\s+\w+|VIG[ÉE]SIMA|[ÚU]NICA)\b[.\-–]?',
    re.I,
)
RX_BLOQUE = re.compile(
    r'^(DISPOSICI[ÓO]N(ES)?\s+COMPLEMENTARIA|DISPOSICI[ÓO]N(ES)?\s+FINAL|DISPOSICI[ÓO]N(ES)?\s+TRANSITORIA|'
    r'DISPOSICI[ÓO]N(ES)?\s+DEROGATORIA|ANEXO\b|VISTOS?\b|CONSIDERANDO\b|SE\s+RESUELVE\b|'
    r'DISPOSICIONES\s+GENERALES|DISPOSICIONES\s+ESPEC[ÍI]FICAS|GLOSARIO\b|ANEXOS\b)',
    re.I,
)
RX_NORMA = re.compile(r'^(LEY\s+N[°º]|DECRETO\s+SUPREMO\s+N[°º]|REGLAMENTO\s+DE\s+LA\s+LEY|LEY\s+GENERAL\b)', re.I)
RX_SECCION_ROMANA = re.compile(r'^([IVXLC]{1,6})\.\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ,;:()/.-]{2,})$')
RX_NUMERAL = re.compile(r'^([“"]?)(\d{1,3}(?:\.\d{1,3}){1,4}\.?)\s+(?=\S)')
RX_LITERAL = re.compile(r'^([a-zñ]|[ivx]{1,4})\)\s+')
RX_NOTA = re.compile(r'^\((Texto según|(Artículo|Denominación|Capítulo|Título|Subcapítulo|Sección|Numeral|Literal|Párrafo|Inciso)\s+(modificad|incorporad|derogad|sustituid)|Numeral|Literal|Párrafo|\*)', re.I)


def con_negritas(marcado):
    """Las marcas de negrita como Markdown, sin asteriscos sueltos."""
    m = marcado.replace('\x02\x01', '').replace('\x02 \x01', ' ')
    # El espacio va fuera de los asteriscos: «** Competencia**» no es negrita.
    m = re.sub(r'\x01(\s*)', lambda x: x.group(1) + '\x01', m)
    m = re.sub(r'(\s*)\x02', lambda x: '\x02' + x.group(1), m)
    m = m.replace('\x01\x02', '')
    return m.replace('\x01', '**').replace('\x02', '**')


def resto_marcado(p, prefijo):
    """El texto marcado sin la etiqueta inicial (numeral o literal)."""
    marcado = p.get('marcado') or p['texto']
    plano = prefijo.strip()
    k = 0
    j = 0
    while j < len(marcado) and k < len(plano):
        if marcado[j] in '\x01\x02':
            j += 1
            continue
        if marcado[j] == plano[k] or (marcado[j].isspace() and plano[k].isspace()):
            k += 1
        j += 1
    resto = marcado[j:]
    abiertas = marcado[:j].count('\x01') - marcado[:j].count('\x02')
    resto = ('\x01' if abiertas > 0 else '') + resto.lstrip('\x02 ').lstrip()
    return con_negritas(resto)


def es_mayus(t):
    letras = [c for c in t if c.isalpha()]
    return len(letras) >= 3 and sum(c.isupper() for c in letras) / len(letras) > 0.85


def lineas_de_pagina(pagina, zonas_tabla):
    """Líneas de la página: palabras de la misma altura juntas, con su negrita."""
    filas = []
    bloques = [b for b in pagina.get_text('dict')['blocks'] if b['type'] == 0]
    # La letra del cuerpo de esta página (mediana ponderada por caracteres).
    # Lo que es mucho más chico —sellos de firma digital en el margen— se
    # descarta ANTES de reunir las líneas: si no, se pega al título que
    # tiene al lado («TACCHINO Lilyana Artículo 4.-…»).
    tallas = sorted((round(s['size'], 1), len(s['text'])) for b in bloques for l in b['lines'] for s in l['spans'] if s['text'].strip())
    total = sum(n for _, n in tallas)
    acum, mediana = 0, 10
    for t, n in tallas:
        acum += n
        if acum >= total / 2:
            mediana = t
            break
    for b in bloques:
        for l in b['lines']:
            spans = [s for s in l['spans'] if s['text'].strip() and s['size'] >= mediana * 0.72]
            if not spans:
                continue
            x0, y0, x1, y1 = l['bbox']
            cy = (y0 + y1) / 2
            if any(z.x0 - 1 <= (x0 + x1) / 2 <= z.x1 + 1 and z.y0 - 1 <= cy <= z.y1 + 1 for z in zonas_tabla):
                continue
            texto = ''.join(s['text'] for s in spans).replace('\t', ' ')
            negrita = sum(len(s['text']) for s in spans if s['flags'] & 16 or 'Bold' in s['font'])
            marcado = ''.join(
                ('\x01' + s['text'] + '\x02') if (s['flags'] & 16 or 'Bold' in s['font']) else s['text'] for s in spans
            ).replace('\t', ' ')
            filas.append({
                'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1, 'cy': cy,
                'texto': texto, 'marcado': marcado, 'neg': negrita, 'total': max(len(texto), 1),
                'talla': max(s['size'] for s in spans),
            })
    return filas


def juntar_misma_altura(filas):
    """El Peruano parte cada palabra de una línea justificada: se reúnen."""
    filas.sort(key=lambda f: (round(f['cy'] / 2.5), f['x0']))
    out = []
    for f in filas:
        if out and abs(out[-1]['cy'] - f['cy']) < 2.5 and f['x0'] >= out[-1]['x0'] and f['x0'] - out[-1]['x1'] < 40:
            u = out[-1]
            sep = '' if u['texto'].endswith(' ') or f['texto'].startswith(' ') else ' '
            u['texto'] += sep + f['texto']
            u['marcado'] += sep + f['marcado']
            u['x1'] = max(u['x1'], f['x1'])
            u['neg'] += f['neg']
            u['total'] += f['total']
        else:
            out.append(dict(f))
    for f in out:
        f['texto'] = re.sub(r'\s+', ' ', f['texto']).strip()
        f['marcado'] = re.sub(r'\s+', ' ', f['marcado']).strip()
        # Negrita es la línea entera (un título); una etiqueta en negrita
        # al inicio («Competencia.-») queda marcada dentro del texto.
        f['bold'] = f['neg'] / f['total'] > 0.85
    return out


def tabla_markdown(t):
    filas = t.extract()
    filas = [[re.sub(r'\s+', ' ', (c or '')).strip() for c in f] for f in filas]
    filas = [f for f in filas if any(f)]
    if len(filas) < 2 or max(len(f) for f in filas) < 2:
        return None
    ancho = max(len(f) for f in filas)
    filas = [f + [''] * (ancho - len(f)) for f in filas]
    llenas = sum(1 for f in filas for c in f if c)
    if llenas < 0.4 * len(filas) * ancho:
        return None
    md = ['| ' + ' | '.join(c.replace('|', '/') for c in filas[0]) + ' |', '|' + '---|' * ancho]
    for f in filas[1:]:
        md.append('| ' + ' | '.join(c.replace('|', '/') for c in f) + ' |')
    return '\n'.join(md)


def columnas_de(doc):
    """Dos columnas si buena parte de las líneas empieza en la mitad
    derecha y no cruza la página (El Peruano); si no, una."""
    derecha = total = 0
    for p in list(doc)[: min(len(doc), 12)]:
        mitad = p.rect.width / 2
        for b in p.get_text('dict')['blocks']:
            if b['type'] != 0:
                continue
            for l in b['lines']:
                x0, _, x1, _ = l['bbox']
                if not ''.join(s['text'] for s in l['spans']).strip():
                    continue
                total += 1
                if x0 >= mitad - 4 and x1 - x0 < p.rect.width * 0.55:
                    derecha += 1
    return 2 if total and derecha / total > 0.25 else 1


def convertir(ruta, columnas=0):
    doc = fitz.open(ruta)
    if not columnas:
        columnas = columnas_de(doc)
    paginas = []
    repetidas = Counter()
    for p in doc:
        tablas = []
        try:
            for t in p.find_tables().tables:
                md = tabla_markdown(t)
                if md:
                    tablas.append((fitz.Rect(t.bbox), md))
        except Exception:
            pass
        crudas = lineas_de_pagina(p, [r for r, _ in tablas])
        mitad = p.rect.width / 2
        if columnas == 1:
            filas = juntar_misma_altura(crudas)
        else:
            # Primero las columnas, después las líneas: el espacio entre
            # columnas es menor que el que separa palabras justificadas.
            filas = juntar_misma_altura([f for f in crudas if f['x0'] < mitad - 4]) +                 juntar_misma_altura([f for f in crudas if f['x0'] >= mitad - 4])
        alto = p.rect.height
        for f in filas:
            if f['y0'] < alto * 0.11 or f['y1'] > alto * 0.93:
                repetidas[re.sub(r'\d+', '#', f['texto'].lower())] += 1
        paginas.append((p, filas, tablas))

    n = len(paginas)
    ruido = {t for t, c in repetidas.items() if c >= max(3, n * 0.3)}
    tallas = sorted(f['talla'] for _, filas, _ in paginas for f in filas)
    talla_cuerpo = tallas[len(tallas) // 2] if tallas else 10

    items = []  # ('linea', fila) | ('tabla', md)
    for p, filas, tablas in paginas:
        alto, ancho = p.rect.height, p.rect.width
        util = []
        for f in filas:
            clave = re.sub(r'\d+', '#', f['texto'].lower())
            borde = f['y0'] < alto * 0.11 or f['y1'] > alto * 0.93
            if borde and (clave in ruido or re.fullmatch(r'[#\s|/.-]*', clave) or len(f['texto']) < 4):
                continue
            if re.fullmatch(r'(p[áa]g(ina)?\.?\s*)?\d+(\s*de\s*\d+)?', f['texto'].lower()):
                continue
            if re.match(r'^esta es una copia aut[ée]ntica', f['texto'].lower()):
                continue
            # Sellos de firma digital en el margen («Firmado digitalmente
            # por… Motivo: Doy V° B° Fecha: …»): no son parte de la norma.
            if re.search(r'firmado digitalmente|^firmado por:|motivo:\s*doy|fau\s*\d{11}|^fecha:\s*\d{2}[./]\d{2}[./]\d{4}', f['texto'].lower()):
                continue
            if f['talla'] < talla_cuerpo * 0.72:
                continue
            util.append(f)
        mitad = ancho / 2
        # Las tablas de ancho completo parten la página en franjas: se lee
        # la franja de arriba (columna izquierda y luego derecha), la
        # tabla, y la franja de abajo. Leer cada columna de corrido
        # mezclaba lo de encima y lo de debajo de la tabla.
        anchas = sorted([(r, md) for r, md in tablas if columnas == 2 and r.width > ancho * 0.6], key=lambda x: x[0].y0)
        angostas = [(r, md) for r, md in tablas if not (columnas == 2 and r.width > ancho * 0.6)]
        cortes = [0] + [r.y0 for r, _ in anchas] + [alto + 1]
        # Medidas de cada columna sobre toda la página.
        medidas = {}
        for ci in ([0] if columnas == 1 else [0, 1]):
            col = util if columnas == 1 else [f for f in util if (f['x0'] < mitad - 4) == (ci == 0)]
            base = Counter(round(f['x0']) for f in col).most_common(1)[0][0] if col else 0
            # El borde derecho de la columna: lo alcanzan las líneas
            # justificadas; la última de un párrafo se queda corta.
            bordes = sorted(f['x1'] for f in col)
            medidas[ci] = (base, bordes[int(len(bordes) * 0.9)] if bordes else 0)
        for bi in range(len(cortes) - 1):
            arriba, abajo = cortes[bi], cortes[bi + 1]
            if bi > 0:
                items.append(('tabla', anchas[bi - 1][1]))
                arriba = anchas[bi - 1][0].y1
            for ci in ([0] if columnas == 1 else [0, 1]):
                col = [f for f in util if arriba <= f['y0'] < abajo and (columnas == 1 or (f['x0'] < mitad - 4) == (ci == 0))]
                col.sort(key=lambda f: f['y0'])
                de_col = []
                for r, md in angostas:
                    centro = (r.x0 + r.x1) / 2
                    if arriba <= r.y0 < abajo and (columnas == 1 or (centro < mitad) == (ci == 0)):
                        de_col.append((r.y0, md))
                base, der = medidas[ci]
                mezcla = [(f['y0'], 'linea', dict(f, base=base, der=der)) for f in col] + [(y, 'tabla', md) for y, md in de_col]
                mezcla.sort(key=lambda x: x[0])
                for _, tipo, x in mezcla:
                    items.append((tipo, x))
                items.append(('corte', None))

    # ── Párrafos ──────────────────────────────────────────────────────
    parrafos = []  # dict(texto, bold, tabla?)
    actual = None
    prev = None

    def cerrar():
        nonlocal actual
        if actual and actual['texto'].strip():
            parrafos.append(actual)
        actual = None

    for tipo, x in items:
        if tipo == 'tabla':
            cerrar()
            parrafos.append({'texto': x, 'bold': False, 'tabla': True})
            prev = None
            continue
        if tipo == 'corte':
            continue  # el cambio de columna o página no corta el párrafo
        f = x
        t = f['texto']
        # En texto justificado, una línea que no llega al borde derecho
        # cierra su párrafo. La sangría sola no basta: los numerales
        # llevan sangría francesa y cada renglón quedaba suelto.
        prev_corta = prev is not None and prev['x1'] < prev['der'] - 12
        prev_cierra = prev is not None and re.search(r'[.:;]["”’)]?$', prev['texto'])
        sangria = prev is not None and f['x0'] - prev['x0'] > 6 and (prev_corta or prev_cierra)
        salto = prev is not None and f['y0'] - prev['y1'] > (prev['y1'] - prev['y0']) * 1.1 and f['y0'] > prev['y0']
        fin_de_parrafo = prev_corta and (prev_cierra or f['x0'] - prev['x0'] > 6)
        empieza = bool(RX_NUMERAL.match(t) or RX_LITERAL.match(t) or RX_ARTICULO.match(t) or RX_TITULO.match(t)
                       or RX_CAPITULO.match(t) or RX_SUBCAP.match(t) or re.match(r'^\(\*+\)\s', t)
                       # «PRIMERA. Prevalencia…» en negrita: una disposición nueva,
                       # aunque venga pegada a «FINALES» del encabezado de arriba.
                       or (f['bold'] and RX_DISPOSICION.match(t) and re.match(r'^[A-ZÁÉÍÓÚ]{4,}', t)))
        cambia_negrita = actual is not None and f['bold'] != actual['bold'] and (f['bold'] or actual['bold'])
        if actual is None or sangria or salto or fin_de_parrafo or empieza or cambia_negrita:
            cerrar()
            actual = {'texto': t, 'marcado': f['marcado'], 'bold': f['bold']}
        else:
            a = actual['texto']
            if re.search(r'[a-záéíóúñ]-$', a) and re.match(r'[a-záéíóúñ]', t):
                actual['texto'] = a[:-1] + t
                m = actual['marcado']
                k = m.rfind('-')
                actual['marcado'] = m[:k] + m[k + 1:] + f['marcado']
            else:
                actual['texto'] = a + ' ' + t
                actual['marcado'] += ' ' + f['marcado']
        prev = f
    cerrar()

    # Notas de modificación pegadas al final de un párrafo en negrita:
    # «regularización.” (*) Numeral modificado por…» → texto + nota.
    separados = []
    for p in parrafos:
        m = re.match(r'^(.*?[.;:]["”’]?)\s+(\(\*+\)\s+.+)$', p['texto']) if not p.get('tabla') else None
        if m and len(m.group(1)) < 120 and separados and not separados[-1].get('tabla'):
            separados[-1]['texto'] += ' ' + m.group(1)
            separados.append({'texto': m.group(2), 'bold': False, 'nota': True})
        else:
            separados.append(p)
    parrafos = separados

    # La tabla de contenido impresa al inicio no es parte del texto: va
    # desde «Tabla de Contenido» hasta el primer párrafo de cuerpo.
    limpios = []
    en_indice = False
    for p in parrafos:
        t = p['texto']
        if p['bold'] and re.search(r'\btabla de contenido\b', t, re.I) and not p.get('tabla'):
            en_indice = True
            continue
        if en_indice:
            # El índice son encabezados en mayúsculas; termina en lo primero que no lo es.
            if p['bold'] and not p.get('tabla') and es_mayus(t):
                continue
            en_indice = False
        limpios.append(p)
    parrafos = limpios

    # ── Clasificación y Markdown ──────────────────────────────────────
    md = []
    i = 0
    hubo_norma = False
    while i < len(parrafos):
        p = parrafos[i]
        t = p['texto'].strip()
        if p.get('tabla'):
            md.append(t)
            i += 1
            continue
        siguiente = parrafos[i + 1]['texto'].strip() if i + 1 < len(parrafos) else ''
        sig_es_nombre = (i + 1 < len(parrafos) and parrafos[i + 1]['bold'] and not parrafos[i + 1].get('tabla')
                         and len(siguiente) < 220
                         and (es_mayus(siguiente) or re.fullmatch(rf'((SUB)?CAP[ÍI]TULO|T[ÍI]TULO|(SUB)?SECCI[ÓO]N)\s+{ROMANOS}', t, re.I))
                         and not (RX_TITULO.match(siguiente) or RX_CAPITULO.match(siguiente) or RX_ARTICULO.match(siguiente)
                                  or RX_SUBCAP.match(siguiente)))

        def con_nombre(nivel, cabeza):
            nonlocal i
            m = re.match(rf'^((?:SUB)?CAP[ÍI]TULO\s+{ROMANOS}|T[ÍI]TULO\s+{ROMANOS}|(?:SUB)?SECCI[ÓO]N\s+{ROMANOS})\s*(.*)$', cabeza, re.I)
            if m and m.group(2):
                md.append(f"{'#' * nivel} {m.group(1)} — {m.group(2)}")
                i += 1
            elif sig_es_nombre:
                md.append(f"{'#' * nivel} {cabeza} — {siguiente}")
                i += 2
            else:
                md.append(f"{'#' * nivel} {cabeza}")
                i += 1
            # El nombre a veces sigue en la línea de abajo, suelta
            # («…de los Actos en Vía» / «Administrativa»).
            while i < len(parrafos):
                q = parrafos[i]
                qt = q['texto'].strip()
                if (q['bold'] and not q.get('tabla') and len(qt) < 80 and not re.search(r'[.:;]$', md[-1])
                        and not (RX_TITULO.match(qt) or RX_CAPITULO.match(qt) or RX_SUBCAP.match(qt)
                                 or RX_ARTICULO.match(qt) or RX_NORMA.match(qt) or RX_BLOQUE.match(qt))):
                    md[-1] += ' ' + qt
                    i += 1
                else:
                    break

        solo = lambda rx: re.fullmatch(rx + r'\s*', t, re.I)
        # «TÍTULO IV» solo en su línea es un título aunque el PDF no lo ponga en negrita.
        if (p['bold'] or solo(rf'T[ÍI]TULO\s+{ROMANOS}')) and RX_TITULO.match(t) and len(t) < 260:
            con_nombre(2, t)
            continue
        if (p['bold'] or solo(rf'CAP[ÍI]TULO\s+{ROMANOS}')) and RX_CAPITULO.match(t) and len(t) < 260:
            con_nombre(3, t)
            continue
        if (p['bold'] or solo(rf'(SUBCAP[ÍI]TULO|SECCI[ÓO]N|SUBSECCI[ÓO]N)\s+{ROMANOS}')) and RX_SUBCAP.match(t) and len(t) < 260:
            con_nombre(4, t)
            continue
        if RX_ARTICULO.match(t) and t[0] == 'A' and (p['bold'] or (len(t) < 140 and not t.rstrip().endswith(';'))):
            md.append(f'##### {t}')
            i += 1
            continue
        if p['bold'] and RX_NORMA.match(t) and es_mayus(t) and len(t) < 260:
            hubo_norma = True
            cabeza = t
            if md and re.fullmatch(r'\*\*[^*]+\*\*', md[-1]) and es_mayus(md[-1]) and not md[-1].rstrip('*').endswith('.'):
                cabeza = md.pop().strip('*') + ' ' + t
            if sig_es_nombre:
                cabeza += ' ' + siguiente
                i += 1
            md.append(f'# {cabeza}')
            i += 1
            continue
        if p['bold'] and RX_BLOQUE.match(t) and len(t) < 200 and es_mayus(t[:30]):
            md.append(f'## {t}')
            i += 1
            # «DISPOSICIONES COMPLEMENTARIAS» / «FINALES»: el tipo viene en la línea de abajo.
            while i < len(parrafos):
                q = parrafos[i]
                qt = q['texto'].strip()
                if (q['bold'] and not q.get('tabla') and es_mayus(qt) and len(qt) < 60
                        and not (RX_BLOQUE.match(qt) or RX_TITULO.match(qt) or RX_CAPITULO.match(qt)
                                 or RX_ARTICULO.match(qt) or RX_DISPOSICION.match(qt) or RX_NORMA.match(qt))):
                    md[-1] += ' ' + qt
                    i += 1
                else:
                    break
            continue
        m = RX_SECCION_ROMANA.match(t)
        if p['bold'] and m:
            # «III.ÁMBITO DE APLICACIÓN:» → «III. ÁMBITO DE APLICACIÓN»
            md.append(f"## {m.group(1)}. {m.group(2).rstrip(':. ')}")
            i += 1
            continue
        if p['bold'] and RX_DISPOSICION.match(t) and len(t) < 220:
            md.append(f'##### {t}')
            i += 1
            continue
        m = RX_NUMERAL.match(t)
        if m:
            md.append(f'{m.group(1)}**{m.group(2)}** {resto_marcado(p, m.group(0))}')
            i += 1
            continue
        m = RX_LITERAL.match(t)
        if m:
            md.append(f'- **{m.group(1)})** {resto_marcado(p, m.group(0))}')
            i += 1
            continue
        if (p.get('nota') or RX_NOTA.match(t) or re.match(r'^\(\*+\)\s', t)) and len(t) < 400:
            md.append(f'*{t}*')
            i += 1
            continue
        if p['bold'] and len(t) < 160:
            md.append(f'**{t}**')
            i += 1
            continue
        md.append(con_negritas(p.get('marcado') or t))
        i += 1

    salida = '\n\n'.join(md)
    salida = re.sub(r'\n{3,}', '\n\n', salida)
    return salida


if __name__ == '__main__':
    args = sys.argv[1:]
    columnas = 0  # automático
    if '--columnas' in args:
        columnas = int(args[args.index('--columnas') + 1])
    sys.stdout.reconfigure(encoding='utf-8')
    print(convertir(args[0], columnas))
