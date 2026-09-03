-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 57: un índice de opiniones no es la Ley ni el Reglamento
-- ════════════════════════════════════════════════════════════════════
-- HALLAZGO (01/09/2026, auditando la jerarquía tras el fallo de los
-- contratos menores): dos documentos titulados «Buscador de opiniones
-- organizadas por artículo (Índice oficial DTN-OECE v1.0)» estaban
-- guardados como `ley` y `reglamento`. No son ninguna de las dos cosas:
-- son un índice del DTN que lista los artículos y, debajo de cada uno,
-- las opiniones que lo interpretan. De sus noventa fragmentos, sesenta
-- y siete —el 74 %— son opiniones.
--
-- POR QUÉ IMPORTA: la ruta del chat pide expresamente fragmentos de la
-- Ley, del Reglamento y de las directivas, para que la norma llegue
-- aunque la búsqueda general se llene de casuística. Medido sobre ocho
-- preguntas representativas, este índice ocupaba el 29 % de esos
-- puestos reservados, y el 78 % de los reservados al Reglamento. Es
-- decir: en la mitad de las respuestas, lo que llegaba como «norma de
-- capa 1» era en realidad una opinión.
--
-- Es el mismo fallo que reportó César con los contratos menores —una
-- fuente que responde con más rango del que le toca—, pero este afecta
-- a todas las preguntas, no a una.
--
-- ARREGLO: pasan a `opinion`, que es lo que su contenido es. Siguen en
-- la biblioteca y se siguen pudiendo citar; lo que dejan de hacer es
-- ocupar el sitio del articulado.
-- ════════════════════════════════════════════════════════════════════

update public.normative_documents
   set type = 'opinion'
 where title ilike '%Buscador de opiniones organizadas por art%'
   and type in ('ley', 'reglamento');
