-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 56: la norma interna de una entidad no es norma general
-- ════════════════════════════════════════════════════════════════════
-- SÍNTOMA (01/09/2026, reportado por César): preguntó cómo se denomina,
-- en los contratos menores, la actuación con la que la DEC determina el
-- precio del bien o servicio. El chat respondió «indagación de
-- condiciones competitivas del mercado», que es el nombre que usan las
-- disposiciones internas de la SUNARP. El Reglamento lo llama de otra
-- manera: el artículo 228.2 dice que la DEC, a través de la Pladicop,
-- «solicita y recibe cotizaciones».
--
-- CAUSA: las «Disposiciones que regulan los Contratos Menores en la
-- SUNARP» estaban guardadas con type = 'directiva', que en la jerarquía
-- es capa 1 —la que obliga—, al mismo nivel que una directiva del OECE.
-- Y el modelo hace lo que la jerarquía le dice: prefirió una fuente de
-- capa 1 al artículo del Reglamento, que también tenía delante.
--
-- La diferencia importa: una directiva del OECE obliga a todas las
-- entidades; las disposiciones internas de una entidad la obligan solo
-- a ella y no pueden fijar la denominación de una figura nacional. De
-- las sesenta directivas de la biblioteca, cincuenta y nueve son del
-- OECE, Perú Compras o el MEF; esta era la única de una entidad suelta.
--
-- ARREGLO: un tipo propio, `directiva_entidad`, que vive en la capa que
-- orienta. El documento sigue estando y se sigue pudiendo citar —es un
-- buen ejemplo de cómo una entidad ordena sus contratos menores—, pero
-- ya no compite con el Reglamento.
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents
  drop constraint if exists normative_documents_type_check;

alter table public.normative_documents
  add constraint normative_documents_type_check check (
    type = any (array[
      'ley', 'reglamento', 'directiva', 'directiva_entidad', 'opinion',
      'pronunciamiento', 'resolucion_tce', 'manual_seace', 'tupa',
      'comunicado', 'guia', 'lineamiento', 'codigo_etica', 'resolucion',
      'bases_estandar'
    ])
  );

update public.normative_documents
   set type = 'directiva_entidad'
 where type = 'directiva'
   and title !~* '(OECE|OSCE|PER[UÚ] COMPRAS|EF54|MEF|DGA)';
