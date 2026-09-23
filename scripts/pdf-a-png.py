# -*- coding: utf-8 -*-
"""Las primeras páginas de un PDF, en PNG, para mirarlas."""
import sys, fitz
pdf, paginas = sys.argv[1], [int(x) for x in sys.argv[2].split(',')]
doc = fitz.open(pdf)
for n in paginas:
    if n > len(doc): continue
    pix = doc[n - 1].get_pixmap(dpi=int(sys.argv[3]) if len(sys.argv) > 3 else 80)
    salida = pdf.replace('.pdf', '-p%d.png' % n)
    pix.save(salida)
    print(salida)
