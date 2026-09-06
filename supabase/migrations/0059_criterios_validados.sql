-- ════════════════════════════════════════════════════════════════════
-- LexIA — Etapa 59: los criterios ya resueltos, como fuente
-- ════════════════════════════════════════════════════════════════════
-- DE DÓNDE SALE ESTO
--
-- Midiendo el chat aparece un patrón nítido. Las preguntas cuya
-- respuesta está ESCRITA en un artículo se aciertan siempre: el plazo
-- para apelar son ocho días hábiles y el artículo 304.1 lo dice con esas
-- palabras. Las preguntas cuya respuesta hay que DEDUCIR encadenando
-- varios artículos se quedan entre el 60 % y el 90 %, por mucho que se
-- afine el prompt: ningún documento dice «tras una nulidad que retrotrae
-- a convocatoria el comité continúa», hay que razonarlo, y razonar tiene
-- varianza.
--
-- La forma de cerrar esa brecha no es pedirle al modelo que razone
-- mejor: es escribir la conclusión para que la encuentre. Cada caso que
-- César resuelve y verificamos contra la norma se convierte en un
-- documento más de la biblioteca, y la pregunta pasa de deducirse a
-- buscarse.
--
-- DÓNDE VA EN LA JERARQUÍA, Y POR QUÉ AHÍ
--
-- En la capa 2, la que interpreta, detrás de las opiniones. No en la
-- capa 1: un criterio nuestro no obliga a nadie y no puede pisar al
-- Reglamento —ese error ya se cometió con unas disposiciones internas de
-- la SUNARP que estaban como `directiva` y se comían el 29 % de los
-- sitios reservados a la norma—. Tampoco en la capa 3: si orientara
-- nada más, no saldría nunca, y el objetivo es justamente que salga.
--
-- Y una advertencia que va en la etiqueta: estos criterios se comprueban
-- contra la norma antes de entrar. Que los valide un especialista no los
-- hace infalibles; en este mismo trabajo, un criterio dado por bueno
-- —que el plazo de apelación se cuenta desde el consentimiento— resultó
-- contrario a los artículos 304.1 y 82.1.
-- ════════════════════════════════════════════════════════════════════

alter table public.normative_documents
  drop constraint if exists normative_documents_type_check;

alter table public.normative_documents
  add constraint normative_documents_type_check check (
    type = any (array[
      'ley', 'reglamento', 'directiva', 'directiva_entidad', 'opinion',
      'pronunciamiento', 'resolucion_tce', 'manual_seace', 'tupa',
      'comunicado', 'guia', 'lineamiento', 'codigo_etica', 'resolucion',
      'bases_estandar', 'criterio_validado'
    ])
  );
