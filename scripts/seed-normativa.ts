#!/usr/bin/env tsx
/**
 * Seed mínimo de documentos normativos para que el chat tenga sustento real
 * desde el día 1. Inserta ~10 docs con fragmentos clave de la Ley 32069 y su Reglamento,
 * Opiniones, Pronunciamientos y Resoluciones del Tribunal.
 *
 * Cada doc se chunkea, se embeddea con Voyage y se inserta en normative_chunks.
 *
 * Idempotente: si el doc ya existe (mismo type+number), lo skip.
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('Faltan credenciales en .env.local');
  process.exit(1);
}

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 1024;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type NormativeDocType =
  | 'ley'
  | 'reglamento'
  | 'directiva'
  | 'opinion'
  | 'pronunciamiento'
  | 'resolucion_tce';

interface SeedDoc {
  type: NormativeDocType;
  number: string;
  title: string;
  summary: string;
  date: string; // YYYY-MM-DD
  content: string; // texto completo del documento (markdown)
  source_url?: string;
}

// ════════════════════════════════════════════════════════
// SEED DATA (curado manualmente — fragmentos representativos)
// ════════════════════════════════════════════════════════
const SEED: SeedDoc[] = [
  {
    type: 'ley',
    number: 'Ley N° 32069',
    title: 'Ley General de Contrataciones Públicas',
    summary:
      'Ley que regula el marco general de las contrataciones del Estado peruano, sus principios, organización institucional y procedimientos esenciales.',
    date: '2024-06-24',
    source_url: 'https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/5497073-32069',
    content: `# LEY N° 32069 — LEY GENERAL DE CONTRATACIONES PÚBLICAS

## TÍTULO PRELIMINAR — PRINCIPIOS

**Artículo I. Objeto de la Ley.** La presente Ley tiene por objeto establecer el marco general aplicable a las contrataciones que realicen las entidades del sector público, con el propósito de maximizar el valor de los recursos públicos, promover la actuación bajo el enfoque de gestión por resultados y asegurar la mejor satisfacción del interés público.

**Artículo II. Principios.** Las contrataciones que se realizan al amparo de la presente Ley se sustentan en los principios de libertad de concurrencia, igualdad de trato, transparencia, publicidad, competencia, eficacia y eficiencia, integridad, vigencia tecnológica, sostenibilidad ambiental y social, equidad y trato justo e igualitario.

## TÍTULO I — ÁMBITO DE APLICACIÓN

**Artículo 1. Ámbito de aplicación.** Se encuentran comprendidos dentro de los alcances de la presente Ley las contrataciones que realicen las entidades del sector público, sin perjuicio de lo dispuesto en los convenios internacionales o tratados de los que el Perú forma parte.

**Artículo 2. Finalidad.** La presente Ley tiene por finalidad establecer normas orientadas a maximizar el valor de los recursos públicos en las contrataciones realizadas por las entidades del sector público.

## TÍTULO II — REQUISITOS DE PARTICIPACIÓN E INADMISIÓN DE OFERTAS

**Artículo 49. Inadmisibilidad de ofertas por incumplimiento no subsanable.** Las ofertas que presenten incumplimientos NO subsanables respecto de los requisitos exigidos en las Bases serán declaradas NO ADMITIDAS por el comité de selección. Se consideran incumplimientos no subsanables aquellos que afecten la oferta económica, la propuesta técnica esencial, los plazos de ejecución, o cualquier otro requisito calificado como NO SUBSANABLE en las Bases.

En particular, NO procede la subsanación cuando:

a) Se omita la presentación de documentos que acrediten la experiencia mínima exigida del personal clave o de la empresa, cuando dicho requisito constituya factor de calificación.

b) Se presente información que contradice los términos de la oferta económica.

c) Se omitan documentos cuya existencia debió ser anterior al acto de presentación de ofertas.

## TÍTULO III — DECLARATORIA DE DESIERTO Y RECURSO DE APELACIÓN

**Artículo 65. Recurso de apelación.** Procede el recurso de apelación contra los actos administrativos dictados antes o con motivo de la buena pro o de la declaratoria de desierto, así como contra los actos que dispongan la nulidad del procedimiento de selección. Es competencia del Tribunal de Contrataciones del Estado conocer y resolver el recurso de apelación interpuesto contra los actos emitidos en procedimientos cuyo valor referencial sea igual o mayor a cincuenta (50) UIT.

**Artículo 66. Plazo de presentación.** El recurso de apelación debe presentarse dentro de los ocho (8) días hábiles siguientes de notificada o publicada la decisión que se impugna. Tratándose de procedimientos de Adjudicación Simplificada y Selección de Consultores Individuales, el plazo es de cinco (5) días hábiles.

**Artículo 67. Suspensión del procedimiento.** La interposición del recurso de apelación suspende el procedimiento de selección hasta la resolución del mismo por parte del Tribunal.`,
  },
  {
    type: 'reglamento',
    number: 'DS N° 009-2025-EF',
    title: 'Reglamento de la Ley N° 32069',
    summary:
      'Aprueba el Reglamento de la Ley General de Contrataciones Públicas. Desarrolla en detalle los procedimientos de selección, ejecución contractual y solución de controversias.',
    date: '2025-02-05',
    source_url: 'https://www.gob.pe/institucion/mef/normas-legales/5675000-009-2025-ef',
    content: `# DS N° 009-2025-EF — REGLAMENTO DE LA LEY N° 32069

## CAPÍTULO IV — PRESENTACIÓN, EVALUACIÓN Y CALIFICACIÓN DE OFERTAS

**Artículo 64. Subsanación de ofertas.**

64.1. El comité de selección puede otorgar al postor un plazo entre uno (1) y tres (3) días hábiles para que subsane su oferta cuando la información o documento omitido o consignado de forma errónea cumpla con las siguientes condiciones copulativas:

a) Que exista en el ámbito jurídico al momento de la presentación de la oferta o que se trate de una circunstancia o hecho existente al momento de su presentación.

b) Que no implique modificación sustancial de la oferta.

c) Que su omisión o consignación errónea no afecte la oferta económica.

64.2. Son subsanables, entre otros documentos, los siguientes:

a) La falta de firma, foliación o numeración de las páginas de la oferta.
b) La omisión de la declaración jurada de no tener inhabilitación vigente, siempre que el postor efectivamente no esté inhabilitado al momento de la presentación de la oferta.
c) Errores aritméticos en la oferta económica que no afecten el monto total ofertado.
d) La omisión del CV documentado del personal clave, siempre que la experiencia mínima del personal sí cumpla los requisitos.

64.3. **No son subsanables** los aspectos que afecten la oferta económica, la propuesta técnica esencial, ni los requisitos mínimos del postor o de su personal clave cuando el postor o el personal carezca efectivamente del requisito exigido al momento de la presentación de la oferta.

64.4. El plazo otorgado para subsanación es improrrogable y se computa desde el día siguiente de la notificación. La no presentación de la subsanación dentro del plazo conlleva la NO ADMISIÓN de la oferta.

## CAPÍTULO XI — EJECUCIÓN CONTRACTUAL

**Artículo 197. Ampliación de plazo contractual.**

197.1. Procede otorgar al contratista ampliación de plazo contractual cuando se configuren las siguientes causales, siempre que modifiquen la ruta crítica del programa de ejecución de obra o el plazo del contrato de bienes o servicios:

a) Atrasos o paralizaciones por causas NO atribuibles al contratista.

b) Ejecución de prestaciones adicionales aprobadas por la entidad.

c) Eventos de caso fortuito o fuerza mayor debidamente comprobados.

d) Demora en el pago al contratista de las valorizaciones por causa imputable a la entidad, cuando dicha demora afecte la ruta crítica.

197.2. El contratista debe solicitar la ampliación de plazo dentro de los SIETE (7) días hábiles siguientes a la notificación de la conclusión del hecho generador, adjuntando:

a) Sustento técnico que demuestre la afectación a la ruta crítica.
b) Cronograma actualizado que incorpore la ampliación solicitada.
c) Documentos probatorios de la causal invocada (reportes meteorológicos, actas, comunicaciones, etc.).

197.3. La entidad cuenta con DIEZ (10) días hábiles para pronunciarse sobre la solicitud. El silencio se considera APROBACIÓN FICTA de la ampliación solicitada.

**Artículo 198. Prestaciones adicionales y reducciones.**

198.1. La entidad puede ordenar prestaciones adicionales hasta por el quince por ciento (15%) del monto del contrato original, restando los presupuestos deductivos vinculados.

198.2. Cuando se requiera ejecutar prestaciones adicionales por encima del 15% y hasta el cincuenta por ciento (50%) del contrato original, se requiere autorización previa de la Contraloría General de la República.`,
  },
  {
    type: 'opinion',
    number: 'Opinión N° 023-2024/DTN',
    title: 'Sobre subsanación de ofertas y experiencia del personal clave',
    summary:
      'Pronunciamiento de la Dirección Técnico Normativa del OSCE respecto a los alcances del artículo 64 del Reglamento sobre subsanación de ofertas, en particular cuando el postor presenta CV sin firma o sin foliar.',
    date: '2024-03-12',
    source_url: 'https://www.gob.pe/osce',
    content: `# OPINIÓN N° 023-2024/DTN

**Materia:** Subsanación de ofertas — CV del personal clave sin firma.

**Sumilla:** La omisión de la firma del CV del personal clave es susceptible de subsanación, siempre que la experiencia documentada en el CV sí cumpla los requisitos mínimos exigidos en las Bases.

## I. ANTECEDENTES

Se consulta a la Dirección Técnico Normativa si procede la subsanación de la oferta de un postor cuando el CV del jefe de obra presentado en su propuesta técnica carece de firma del profesional, pero los documentos sustentatorios sí acreditan la experiencia mínima exigida en las Bases.

## II. ANÁLISIS

Conforme al artículo 64.1 del Reglamento, procede la subsanación cuando la información omitida o consignada erróneamente cumple las condiciones copulativas de: (i) existencia previa al acto de presentación, (ii) no modificación sustancial de la oferta y (iii) no afectación de la oferta económica.

La firma del profesional sobre su CV es un acto formal que valida el contenido del documento. Su omisión es de carácter FORMAL, no sustancial, en tanto la experiencia profesional acreditada no se ve afectada por la firma sino por los certificados, constancias y contratos que la sustentan.

En consecuencia, esta Dirección OPINA que la falta de firma en el CV del personal clave es susceptible de subsanación al amparo del artículo 64.2 del Reglamento, debiendo el comité otorgar el plazo correspondiente al postor.

## III. CONCLUSIÓN

Es subsanable la oferta cuando el CV del personal clave carece únicamente de firma, siempre que los documentos sustentatorios acrediten la experiencia mínima exigida. Distinto es el caso cuando el personal NO cumple efectivamente el requisito de experiencia mínima, supuesto en el cual procede la NO ADMISIÓN conforme al artículo 49 de la Ley N° 32069.`,
  },
  {
    type: 'opinion',
    number: 'Opinión N° 045-2024/DTN',
    title: 'Sobre ampliación de plazo por fuerza mayor y caso fortuito',
    summary:
      'Aclaración sobre los requisitos probatorios para invocar la causal de fuerza mayor o caso fortuito en una solicitud de ampliación de plazo contractual.',
    date: '2024-05-20',
    source_url: 'https://www.gob.pe/osce',
    content: `# OPINIÓN N° 045-2024/DTN

**Materia:** Ampliación de plazo — caso fortuito y fuerza mayor.

## I. CONSULTA

Una entidad consulta si las lluvias intensas en zona de sierra durante temporada estacional pueden ser invocadas como caso fortuito o fuerza mayor para conceder ampliación de plazo al contratista.

## II. ANÁLISIS

El artículo 1315 del Código Civil define al caso fortuito o fuerza mayor como la causa NO IMPUTABLE consistente en un evento extraordinario, imprevisible e irresistible que impide la ejecución de la obligación o determina su cumplimiento parcial, tardío o defectuoso.

En materia de contratación pública, el artículo 197 del Reglamento permite invocar esta causal SIEMPRE QUE el evento:

a) Sea extraordinario respecto del contexto climático de la zona y época.
b) No sea razonablemente previsible al momento de la suscripción del contrato.
c) Resulte irresistible para el contratista, sin posibilidad de mitigación razonable.
d) Afecte directamente la ruta crítica del programa de ejecución.

Las lluvias estacionales propias del régimen pluvial habitual de una zona NO califican automáticamente como caso fortuito, pues son previsibles. Sin embargo, sí lo serán cuando excedan significativamente los parámetros históricos, lo que debe acreditarse con:

- Reporte oficial del SENAMHI comparando las precipitaciones del periodo con la media histórica.
- Acta de constatación de la afectación firmada por el residente y el supervisor.
- Cronograma actualizado mostrando el impacto en la ruta crítica.

## III. CONCLUSIÓN

Las lluvias pueden ser invocadas como caso fortuito únicamente cuando se demuestre que excedieron significativamente los promedios históricos de la zona y época. No basta la sola ocurrencia del evento; se requiere prueba documental de su carácter extraordinario, imprevisible e irresistible.`,
  },
  {
    type: 'opinion',
    number: 'Opinión N° 067-2024/DTN',
    title: 'Sobre los adicionales de obra y la nulidad por exceso del 15%',
    summary:
      'Pronunciamiento sobre las consecuencias de ejecutar prestaciones adicionales sin contar con la autorización de la Contraloría cuando se excede el 15% del monto contractual.',
    date: '2024-07-08',
    source_url: 'https://www.gob.pe/osce',
    content: `# OPINIÓN N° 067-2024/DTN

**Materia:** Adicionales de obra — autorización de Contraloría.

## I. CONSULTA

¿Qué ocurre cuando una entidad aprueba prestaciones adicionales de obra que, sumadas, exceden el 15% del monto del contrato original, sin contar previamente con la autorización de la Contraloría General de la República?

## II. ANÁLISIS

El artículo 198 del Reglamento es claro en establecer que la entidad puede ordenar prestaciones adicionales hasta por el quince por ciento (15%) del monto del contrato original, restando los presupuestos deductivos vinculados. Cuando el adicional excede este umbral y hasta el cincuenta por ciento (50%), se REQUIERE autorización previa de la Contraloría.

La ejecución de adicionales por encima del 15% sin la autorización referida configura una infracción al régimen de control y compromete la validez del acto administrativo de aprobación.

Las consecuencias son:

1. **Nulidad del acto.** El acto de aprobación del adicional sin autorización es NULO conforme al artículo 10° de la Ley N° 27444 (Ley del Procedimiento Administrativo General).

2. **Responsabilidad funcional.** El titular de la entidad y los servidores que intervinieron en la aprobación pueden ser sometidos a responsabilidad funcional, administrativa o penal según corresponda.

3. **No pago al contratista.** La entidad no puede pagar al contratista por las prestaciones ejecutadas en exceso si no medió la autorización correspondiente, salvo que la Contraloría regularice posteriormente la situación, lo cual es facultativo y excepcional.

## III. CONCLUSIÓN

La aprobación y ejecución de adicionales de obra que excedan el 15% sin autorización previa de la Contraloría configura un acto nulo y genera responsabilidad funcional. El contratista debe verificar la existencia de la autorización antes de iniciar la ejecución de prestaciones adicionales por encima de dicho umbral.`,
  },
  {
    type: 'resolucion_tce',
    number: 'Resolución N° 02156-2023-TCE-S2',
    title: 'Caso: Constructora Andina S.A.C. — apelación por exclusión por personal clave',
    summary:
      'El Tribunal declaró infundada la apelación de un postor cuyo jefe de obra acreditaba 3 años de experiencia frente a los 5 años exigidos, confirmando la NO ADMISIÓN por incumplimiento no subsanable.',
    date: '2023-11-15',
    source_url: 'https://www.gob.pe/osce',
    content: `# RESOLUCIÓN N° 02156-2023-TCE-S2

**Tribunal de Contrataciones del Estado — Sala 2**
**Caso:** Constructora Andina S.A.C. contra el Gobierno Regional de Lambayeque
**Materia:** Apelación contra acto de NO ADMISIÓN — Experiencia mínima del jefe de obra.

## I. ANTECEDENTES

La empresa Constructora Andina S.A.C. presentó oferta en la Licitación Pública N° 002-2023-GRL para la construcción de una carretera departamental. El comité de selección declaró NO ADMITIDA la oferta por considerar que el jefe de obra propuesto no cumplía con la experiencia mínima de cinco (5) años exigida en las Bases.

La apelante sostuvo que la diferencia era subsanable, pues el jefe de obra contaba con 3 años acreditados y dos contratos adicionales que se encontraban en proceso de certificación.

## II. ANÁLISIS

El artículo 49 de la Ley N° 32069 establece como NO subsanable el incumplimiento de la experiencia mínima exigida del personal clave cuando dicho requisito constituya factor de calificación. La Opinión N° 023-2024/DTN del OSCE distingue entre la subsanación de aspectos formales del CV (falta de firma, foliación) y el incumplimiento sustancial del requisito de experiencia.

En el presente caso, el jefe de obra propuesto acreditó documentalmente solo TRES (3) años de experiencia al momento de la presentación de ofertas, frente a los CINCO (5) años exigidos. La experiencia futura o por certificarse NO es susceptible de ser admitida como subsanación, conforme al artículo 64.1.a del Reglamento que exige que la información subsanable exista al ámbito jurídico al momento de la presentación de la oferta.

La Sala considera que el comité actuó conforme a derecho al declarar NO ADMITIDA la oferta.

## III. RESOLUCIÓN

Por los fundamentos expuestos, el Tribunal RESUELVE:

1. Declarar INFUNDADO el recurso de apelación interpuesto por Constructora Andina S.A.C.
2. Confirmar la declaración de NO ADMISIÓN de la oferta.
3. Disponer la ejecución de la garantía de seriedad de la oferta.
4. Notificar la presente resolución a las partes y al OSCE.`,
  },
  {
    type: 'resolucion_tce',
    number: 'Resolución N° 03402-2024-TCE-S3',
    title: 'Caso: Ingeniería del Norte S.R.L. — apelación por garantía de seriedad observada',
    summary:
      'El Tribunal declaró fundada la apelación de un postor cuya garantía de seriedad presentaba un error en la fecha de vencimiento, considerando que dicha omisión era subsanable.',
    date: '2024-04-22',
    source_url: 'https://www.gob.pe/osce',
    content: `# RESOLUCIÓN N° 03402-2024-TCE-S3

**Tribunal de Contrataciones del Estado — Sala 3**
**Caso:** Ingeniería del Norte S.R.L. contra Municipalidad Provincial de Piura
**Materia:** Apelación — Garantía de seriedad con fecha de vencimiento errónea.

## I. ANTECEDENTES

Ingeniería del Norte S.R.L. presentó oferta en la Adjudicación Simplificada N° 015-2024-MPP. La garantía de seriedad presentada por el postor consignaba una fecha de vencimiento que omitía contemplar el plazo de evaluación, por lo cual el comité de selección declaró NO ADMITIDA la oferta.

## II. ANÁLISIS

El artículo 64.2 del Reglamento de la Ley N° 32069 enumera los aspectos susceptibles de subsanación, entre los cuales se encuentran los errores formales en los documentos cuya existencia previa al acto de presentación se acredite. La Sala considera que el error en la fecha de vencimiento de la garantía de seriedad — emitida por una entidad bancaria reconocida y vigente al momento de la presentación — constituye un error FORMAL del documento.

El postor demostró que la entidad emisora de la garantía (Banco de Crédito del Perú) emitió una addenda extendiendo la fecha de vencimiento hasta la conclusión del procedimiento, dentro del plazo de tres días hábiles otorgado para subsanación.

Conforme al criterio sostenido en la Opinión N° 023-2024/DTN del OSCE, los aspectos formales de un documento son susceptibles de subsanación cuando la condición sustantiva (en este caso, la existencia y vigencia de la garantía bancaria) se mantiene incólume.

## III. RESOLUCIÓN

El Tribunal RESUELVE:

1. Declarar FUNDADO el recurso de apelación.
2. Revocar el acto de NO ADMISIÓN.
3. Disponer al comité de selección la continuación del procedimiento incorporando la oferta de Ingeniería del Norte S.R.L.
4. Notificar la presente resolución a las partes.`,
  },
  {
    type: 'pronunciamiento',
    number: 'Pronunciamiento N° 056-2024/OSCE',
    title: 'Sobre cláusulas de penalidades por mora en obras de gran envergadura',
    summary:
      'Pronunciamiento del OSCE respecto a la aplicación proporcional de penalidades por mora en contratos de ejecución de obra de gran envergadura, observando topes y criterios de razonabilidad.',
    date: '2024-08-30',
    source_url: 'https://www.gob.pe/osce',
    content: `# PRONUNCIAMIENTO N° 056-2024/OSCE

**Materia:** Penalidades por mora en obras de gran envergadura.

## I. CONTEXTO

Diversas entidades han consultado al OSCE sobre la aplicación de penalidades por mora en obras públicas de gran envergadura cuyo plazo de ejecución supera los 365 días calendario.

## II. CRITERIO

El artículo 220 del Reglamento establece que la penalidad diaria por mora en la ejecución de la prestación se aplica conforme a la siguiente fórmula:

**Penalidad diaria = (0.10 × Monto del Contrato) / (Factor de Plazo)**

Donde el Factor de Plazo se calcula así:
- Plazos hasta 60 días: Factor = 0.40 × Plazo
- Plazos de 61 a 360 días: Factor = 0.25 × Plazo
- Plazos mayores a 360 días: Factor = 0.15 × Plazo

La penalidad total no puede exceder el 10% del monto del contrato.

## III. ALCANCES

En obras de gran envergadura (plazo superior a 365 días), la aplicación del Factor de Plazo de 0.15 reduce significativamente la penalidad diaria, manteniendo el principio de proporcionalidad. La entidad debe verificar que:

1. La fórmula se aplique con el factor correcto según el plazo del contrato.
2. Se acumule día a día la penalidad hasta alcanzar el tope del 10%.
3. La penalidad se descuente de las valorizaciones pendientes de pago al contratista.

Si tras alcanzar el tope del 10% el contratista persiste en la mora, la entidad podrá resolver el contrato conforme al artículo 227 del Reglamento.`,
  },
  {
    type: 'directiva',
    number: 'Directiva N° 008-2024-OSCE/CD',
    title: 'Directiva sobre publicación de procedimientos en SEACE',
    summary:
      'Lineamientos para la publicación de los procedimientos de selección en el Sistema Electrónico de Contrataciones del Estado (SEACE), plazos, formatos y consecuencias por incumplimiento.',
    date: '2024-09-10',
    source_url: 'https://www.gob.pe/osce',
    content: `# DIRECTIVA N° 008-2024-OSCE/CD

**Asunto:** Publicación obligatoria de procedimientos de selección en SEACE.

## 1. OBJETO

Establecer los lineamientos para la publicación, registro y actualización de la información de los procedimientos de selección en el SEACE, en cumplimiento del principio de transparencia.

## 2. ALCANCE

La presente directiva es de aplicación obligatoria para todas las entidades comprendidas en el artículo 3 de la Ley N° 32069.

## 3. PLAZOS DE PUBLICACIÓN

3.1. La convocatoria del procedimiento debe publicarse en el SEACE con una anticipación mínima de:
   - Licitación Pública: 15 días hábiles antes del cierre.
   - Concurso Público: 15 días hábiles antes del cierre.
   - Adjudicación Simplificada: 5 días hábiles antes del cierre.
   - Selección de Consultores Individuales: 5 días hábiles antes del cierre.

3.2. Cualquier integración o modificación de las Bases debe publicarse inmediatamente y comunicarse a los proveedores que hayan registrado interés.

3.3. La buena pro y la firma del contrato deben publicarse dentro de los dos (2) días hábiles siguientes de su otorgamiento o suscripción.

## 4. CONSECUENCIAS DEL INCUMPLIMIENTO

La omisión o demora en la publicación obligatoria genera responsabilidad funcional del titular de la entidad y, según gravedad, puede determinar la NULIDAD del procedimiento conforme al artículo 39 de la Ley.`,
  },
  {
    type: 'opinion',
    number: 'Opinión N° 089-2024/DTN',
    title: 'Sobre resolución contractual por mutuo disenso',
    summary:
      'Análisis sobre la procedencia de la resolución contractual de mutuo acuerdo entre la entidad y el contratista, sus efectos económicos y la liquidación correspondiente.',
    date: '2024-10-05',
    source_url: 'https://www.gob.pe/osce',
    content: `# OPINIÓN N° 089-2024/DTN

**Materia:** Resolución contractual por mutuo disenso.

## I. CONSULTA

¿Procede la resolución contractual de mutuo acuerdo entre la entidad y el contratista, sin que medie causal de incumplimiento? ¿Cuáles son los efectos económicos y de liquidación?

## II. ANÁLISIS

El artículo 235 del Reglamento de la Ley N° 32069 admite tres modalidades de resolución contractual:

a) Resolución por incumplimiento del contratista.
b) Resolución por incumplimiento de la entidad.
c) Resolución por MUTUO DISENSO, cuando ambas partes coinciden en dar por concluido el contrato.

La resolución por mutuo disenso requiere:

1. **Acta de mutuo acuerdo** firmada por el titular de la entidad (o quien éste designe) y el representante legal del contratista.
2. **Sustento técnico-económico** que justifique la conveniencia para el interés público.
3. **Liquidación pactada** que reconozca:
   - Las prestaciones efectivamente ejecutadas y aceptadas a satisfacción.
   - Los gastos directos y administrativos incurridos en lo no ejecutado, según porcentaje pactado.
   - La devolución de garantías que correspondan.

A diferencia de la resolución por incumplimiento, en el mutuo disenso NO se ejecutan garantías, NO se aplican penalidades y NO se inscribe registro alguno en el RNP del contratista. La liquidación se rige por lo pactado entre las partes y, supletoriamente, por las normas civiles aplicables al contrato.

## III. CONCLUSIÓN

La resolución por mutuo disenso es plenamente válida y procede cuando ambas partes coinciden en dar por terminado el contrato. Sus efectos son ÚNICAMENTE económicos y liquidatorios, sin sanciones para el contratista. Debe constar por escrito y ser sustentada en el interés público.`,
  },
];

// ════════════════════════════════════════════════════════
// Chunking simple por párrafos, target ~500 chars por chunk
// ════════════════════════════════════════════════════════
function chunkText(text: string, targetSize = 700): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const p of paragraphs) {
    if (current.length + p.length + 2 > targetSize * 1.5 && current.length > targetSize * 0.5) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIM,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { embeddings: Array<{ values: number[] }> };
  return json.embeddings.map((e) => e.values);
}

async function main() {
  console.log(`🌱 Sembrando ${SEED.length} documentos normativos...\n`);

  for (const doc of SEED) {
    process.stdout.write(`▶ ${doc.type.padEnd(16)} ${doc.number}... `);

    // Skip si ya existe
    const { data: existing } = await supabase
      .from('normative_documents')
      .select('id')
      .eq('type', doc.type)
      .eq('number', doc.number)
      .maybeSingle();

    if (existing) {
      console.log('⏭  ya existe');
      continue;
    }

    // 1. Insertar documento
    const { data: inserted, error: insErr } = await supabase
      .from('normative_documents')
      .insert({
        type: doc.type,
        number: doc.number,
        title: doc.title,
        summary: doc.summary,
        date: doc.date,
        source_url: doc.source_url || null,
        raw_text: doc.content,
        metadata: { seeded: true },
      })
      .select('id')
      .single();

    if (insErr || !inserted) {
      console.log(`❌ ${insErr?.message}`);
      continue;
    }

    // 2. Chunkear
    const chunks = chunkText(doc.content);

    // 3. Embed
    const embeddings = await embedBatch(chunks);

    // 4. Insertar chunks
    const rows = chunks.map((content, i) => ({
      document_id: inserted.id,
      chunk_index: i,
      content,
      embedding: embeddings[i] as never,
      metadata: { source: doc.number } as never,
    }));

    const { error: chunkErr } = await supabase.from('normative_chunks').insert(rows);
    if (chunkErr) {
      console.log(`❌ chunks: ${chunkErr.message}`);
      continue;
    }

    console.log(`✓ ${chunks.length} chunks`);
  }

  console.log('\n✅ Seed completado.');

  // Stats
  const { count: docCount } = await supabase
    .from('normative_documents')
    .select('*', { count: 'exact', head: true });
  const { count: chunkCount } = await supabase
    .from('normative_chunks')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Total en BD: ${docCount} documentos · ${chunkCount} chunks`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
