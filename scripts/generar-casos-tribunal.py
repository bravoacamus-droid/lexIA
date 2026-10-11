"""
Casos del Tribunal para el evaluador de ofertas, desde la guía que
entregó César el 10/10/2026: «CASOS PRÁCTICOS DEL TRIBUNAL» (Corporación
Gung Ho, 2026), 629 cuestionamientos de 322 resoluciones ordenados por
etapa y requisito.

NO va a la biblioteca normativa —César lo pidió así—: es material para
que el evaluador reconozca las controversias de cada requisito. Por eso
se convierte en un módulo de datos del evaluador
(src/lib/evaluacion/casos-tribunal.generado.ts) y no se ingiere.

Uso:
    python scripts/generar-casos-tribunal.py "CASOS PRÁCTICOS DEL TRIBUNAL.pdf"
"""
import json
import re
import sys

import fitz

PDF = sys.argv[1] if len(sys.argv) > 1 else 'CASOS PRÁCTICOS DEL TRIBUNAL.pdf'
SALIDA = 'src/lib/evaluacion/casos-tribunal.generado.ts'

# Etapa del evaluador a la que pertenece cada capítulo de la guía.
ETAPA_DE_CAPITULO = {
    '1': 'admision',
    '2': 'calificacion',
    '3': 'evaluacion',
    '4': 'rechazo',
    '5': 'bonificacion',
    '6': 'negociacion',
    '7': 'buena_pro',
    'A': 'procesal',
}

# Lo que se repite al pie de cada página y no es contenido.
PIE = re.compile(
    r'^(?:0\d\s+[A-ZÁÉÍÓÚÑ ,Y]+|GUÍA PRÁCTICA|CORPORACIÓN GUNG HO|CASOS EN ESTA PÁGINA.*|\d{1,3}|'
    r'LECTURA Y CONSULTA|HERRAMIENTAS|CONSULTA \d+|ANEXO [A-Z]\s+[A-ZÁÉÍÓÚÑ ]+)$'
)


def lineas_del_compendio(doc):
    salida = []
    for i in range(doc.page_count):
        if i + 1 < 33:
            continue
        for l in doc[i].get_text().split('\n'):
            l = l.strip()
            if not l or PIE.match(l):
                continue
            salida.append(l)
    return salida


def unir(ls):
    texto = ' '.join(ls)
    texto = re.sub(r'\s+', ' ', texto)
    # Guiones de corte de línea: «trans- cripción» → «transcripción».
    texto = re.sub(r'(\w)- (\w)', r'\1\2', texto)
    return texto.strip()


RX_SECCION = re.compile(r'^([1-7A])\.(\d+)\.\s+(.+)$')
RX_CASO = re.compile(r'^CASO (\d{3})$')
ETIQUETAS = [
    ('cuestionamiento', re.compile(r'^El cuestionamiento$')),
    ('resolvio', re.compile(r'^Cómo resolvió el Tribunal$|^Cómo resolvió$|^Cómo respondió el OECE$|^La respuesta del Tribunal$')),
    ('resultado', re.compile(r'^Resultado\.\s*(.*)$')),
    ('recordar', re.compile(r'^Qué recordar\.\s*(.*)$')),
    ('referencia', re.compile(r'^Referencia:\s*(.*)$')),
    ('precision', re.compile(r'^Precisión de lectura\.\s*(.*)$')),
    ('antes', re.compile(r'^Antes de revisar los casos$')),
]


def main():
    doc = fitz.open(PDF)
    lineas = lineas_del_compendio(doc)

    secciones = []
    casos = []
    seccion = None
    caso = None
    campo = None
    buffer = []

    def cerrar_campo():
        nonlocal buffer, campo
        if campo and buffer:
            destino = caso if caso is not None and campo != 'antes' else seccion
            if destino is not None:
                destino[campo] = (destino.get(campo, '') + ' ' + unir(buffer)).strip()
        buffer = []

    for l in lineas:
        # La portada de un anexo («ANEXO A / Cuestiones procesales…») no es
        # de ningún caso: se descarta hasta su primera sección.
        if re.match(r'^ANEXO [A-Z]$', l):
            cerrar_campo()
            caso = None
            campo = 'descartar'
            continue
        if campo == 'descartar' and not RX_SECCION.match(l):
            continue
        m = RX_SECCION.match(l)
        if m and len(l) < 120 and not l.endswith('.'):
            cerrar_campo()
            caso = None
            seccion = {
                'id': f'{m.group(1)}.{m.group(2)}',
                'etapa': ETAPA_DE_CAPITULO[m.group(1)],
                'titulo': m.group(3).strip(),
            }
            secciones.append(seccion)
            campo = 'titulo'
            continue
        # El título de una sección puede seguir en la línea de abajo.
        if campo == 'titulo':
            if l and l[0].islower():
                seccion['titulo'] += ' ' + l
                continue
            campo = None
        m = RX_CASO.match(l)
        if m and seccion is not None:
            cerrar_campo()
            caso = {'numero': int(m.group(1)), 'seccion': seccion['id']}
            casos.append(caso)
            campo = 'resolucion'
            continue
        etiqueta = None
        for nombre, rx in ETIQUETAS:
            mm = rx.match(l)
            if mm:
                etiqueta = (nombre, mm.group(1) if mm.groups() else '')
                break
        if etiqueta:
            cerrar_campo()
            campo = etiqueta[0]
            if etiqueta[1]:
                buffer.append(etiqueta[1])
            continue
        if campo == 'resolucion' and caso is not None and 'resolucion' in caso:
            # La línea de la resolución es una sola; lo que sigue sin
            # etiqueta es parte del cuestionamiento.
            campo = 'cuestionamiento'
        buffer.append(l)
    cerrar_campo()

    # Limpieza y forma final.
    finales = []
    for c in casos:
        res = c.get('resolucion', '')
        resoluciones = re.findall(r'\d{1,5}-\d{4}-(?:TCE|TCP|OECE|OSCE)?-?[A-Z0-9]*S?\d?', res)
        finales.append({
            'caso': c['numero'],
            'seccion': c['seccion'],
            'resolucion': res,
            'cuestionamiento': c.get('cuestionamiento', ''),
            'resolvio': c.get('resolvio', ''),
            'recordar': c.get('recordar', ''),
            'precision': c.get('precision', ''),
        })

    sin_resolvio = [c['caso'] for c in finales if not c['resolvio']]
    print(f'secciones {len(secciones)} · casos {len(finales)} · sin «cómo resolvió»: {len(sin_resolvio)} {sin_resolvio[:10]}')
    for s in secciones:
        n = sum(1 for c in finales if c['seccion'] == s['id'])
        print(f"  {s['id']:5} {s['etapa']:12} {n:4}  {s['titulo']}")

    cabecera = '''/**
 * Casos del Tribunal por requisito, para el evaluador de ofertas.
 * GENERADO — no editar a mano: `python scripts/generar-casos-tribunal.py`.
 *
 * Sale de la guía «CASOS PRÁCTICOS DEL TRIBUNAL» (Corporación Gung Ho,
 * 2026) que entregó César el 10/10/2026: 629 cuestionamientos de 322
 * resoluciones, por etapa y requisito. No está en la biblioteca normativa
 * —lo pidió así—: es material para que el evaluador reconozca qué
 * controversias existen sobre cada requisito y cómo las resolvió el
 * Tribunal. Y es una muestra: el evaluador contrasta además con las
 * resoluciones de la biblioteca (ver `jurisprudencia.ts`).
 */

export interface SeccionDeCasos {
  /** «2.6» */
  id: string;
  etapa: 'admision' | 'calificacion' | 'evaluacion' | 'rechazo' | 'bonificacion' | 'negociacion' | 'buena_pro' | 'procesal';
  /** «Equipamiento estratégico» */
  titulo: string;
  /** La orientación de la guía antes de los casos de la sección. */
  antes?: string;
}

export interface CasoDelTribunal {
  caso: number;
  seccion: string;
  /** «Resolución 351-2026-TCP-S3» tal como la cita la guía. */
  resolucion: string;
  cuestionamiento: string;
  /** Cómo resolvió el Tribunal. */
  resolvio: string;
  /** La enseñanza que la guía saca del caso. */
  recordar: string;
  /** Advertencia de la guía sobre el alcance del caso, si la hay. */
  precision: string;
}

'''
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(cabecera)
        f.write('export const SECCIONES_DE_CASOS: SeccionDeCasos[] = ')
        f.write(json.dumps(secciones, ensure_ascii=False, indent=2))
        f.write(';\n\nexport const CASOS_DEL_TRIBUNAL: CasoDelTribunal[] = ')
        f.write(json.dumps(finales, ensure_ascii=False, indent=1))
        f.write(';\n')
    print('escrito', SALIDA)


main()
