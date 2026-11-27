import { notFound } from 'next/navigation';
import { TdrAuditResultView } from '@/components/app/evaluator/tdr-audit-result-view';

/**
 * Vista previa de la pantalla de resultados del requerimiento con datos de
 * ejemplo (hallazgos reales del CPA 008-2026). Solo en desarrollo: en
 * producción no existe. Las acciones que llaman al servidor (contrastar,
 * guardar, Word) fallan aquí porque la evaluación «demo» no existe.
 */
export const metadata = { title: 'Vista previa · Revisión del requerimiento', robots: { index: false, follow: false } };

const ub = (pagina: string, capitulo: string, numeral: string, literal: string) => ({ pagina, capitulo, numeral, literal });
const linea = (u: ReturnType<typeof ub>) => `Pág. ${u.pagina} · Cap. ${u.capitulo} · Numeral ${u.numeral} · Literal ${u.literal}`;

const H = [
  {
    id: 'tema_penalidades_1',
    categoria: 'penalidades',
    severidad: 'critico' as const,
    titulo: 'Omisión de supuestos, cálculo y verificación de otras penalidades',
    ubicacion_detalle: ub('26', 'CONDICIONES DE CONTRATACIÓN', '3.3', 'f)'),
    extracto_literal: 'f) Otras penalidades: Se aplicarán las penalidades que correspondan conforme a la normativa.',
    descripcion:
      'El requerimiento anuncia otras penalidades sin consignar el supuesto de aplicación, la forma de cálculo ni el procedimiento de verificación, lo que impide su aplicación objetiva y vulnera la previsibilidad exigida por la normativa.',
    solicitud: 'incorporar' as const,
    recomendacion:
      'Incorporar un cuadro de otras penalidades con, para cada una, el supuesto objetivo, la forma de cálculo y el procedimiento de verificación, cuidando que en conjunto no excedan el 10 % del monto del contrato.',
    origen: 'tema' as const,
    fundamento_normativo: [
      { norma: 'numeral 119.1 del artículo 119 del Reglamento' },
      { norma: 'Pronunciamiento N° 242-2026/OECE-DSAT', articulo: 'Pronunciamiento del OECE: las otras penalidades deben consignar supuestos de aplicación, forma de cálculo y procedimiento de verificación.' },
      { norma: 'Opinión N° 052-2022/DTN', articulo: 'Opinión del OECE: para aplicar penalidades distintas a la mora, la Entidad debe prever supuestos objetivos, razonables y congruentes con el objeto.' },
    ],
    terminos_clave: ['otras penalidades'],
  },
  {
    id: 'plazo_indeterminado',
    categoria: 'plazos_insustentables',
    severidad: 'critico' as const,
    titulo: 'Plazo de ejecución indeterminado hasta agotar el monto contratado',
    ubicacion_detalle: ub('25', 'CONDICIONES DE CONTRATACIÓN', '3.3', 'c)'),
    extracto_literal: 'c) El plazo de ejecución será hasta agotar el monto contratado.',
    descripcion: 'Un plazo sujeto a que se agote el monto no define la duración de la prestación y genera incertidumbre sobre la vigencia del contrato.',
    solicitud: 'modificar' as const,
    recomendacion: 'Fijar un plazo de ejecución en días calendario y, si se requiere, un límite de consumo vinculado a ese plazo.',
    origen: 'auditor' as const,
    fundamento_normativo: [
      { norma: 'artículo 106 del Reglamento' },
      { norma: 'Opinión N° 120-2021/DTN', articulo: 'Opinión del OECE: todo contrato debe contemplar un plazo de ejecución definido desde el requerimiento.' },
    ],
  },
  {
    id: 'tema_ubicacion_1',
    categoria: 'otro',
    severidad: 'alto' as const,
    titulo: 'Exigencia de taller a no más de 7 km sin sustento técnico',
    ubicacion_detalle: ub('25', 'CONDICIONES DE CONTRATACIÓN', '3.3', 'd)'),
    extracto_literal: 'd) El contratista deberá contar con taller ubicado en un radio no mayor de 7 km de la sede.',
    descripcion: 'La distancia exigida restringe la concurrencia sin una justificación técnica que la sustente.',
    solicitud: 'modificar' as const,
    recomendacion: 'Suprimir el radio o sustentarlo técnicamente, y exigirlo para la ejecución y no como condición para presentar oferta.',
    origen: 'tema' as const,
    fundamento_normativo: [
      { norma: 'Pronunciamiento N° 209-2024/OSCE-DGR', articulo: 'Pronunciamiento del OECE: exigir que el taller se ubique a una distancia determinada restringe la concurrencia si no está sustentado.' },
    ],
  },
  {
    id: 'tema_conformidad_1',
    categoria: 'conformidad',
    severidad: 'alto' as const,
    titulo: 'Omisión del procedimiento y plazo de la conformidad',
    ubicacion_detalle: ub('No corresponde', 'Conformidad de la prestación', 'No corresponde', 'No corresponde'),
    extracto_literal: '(omisión) No se indica quién otorga la conformidad, en qué plazo ni qué ocurre si hay observaciones.',
    descripcion: 'Sin reglas de conformidad no se puede verificar la prestación ni computar los plazos de pago.',
    solicitud: 'incorporar' as const,
    recomendacion: 'Incorporar el área que otorga la conformidad, su plazo y el procedimiento ante observaciones.',
    origen: 'tema' as const,
    fundamento_normativo: [
      { norma: 'Informe IVN N° 051-2025/DSAT', articulo: 'Informe de vicio de nulidad del OECE: el área usuaria es responsable de verificar las obligaciones y otorgar la conformidad.' },
    ],
  },
  {
    id: 'experiencia_privados',
    categoria: 'experiencia_restrictiva',
    severidad: 'medio' as const,
    titulo: 'Acreditación de experiencia con privados solo con comprobantes',
    ubicacion_detalle: ub('47', 'REQUISITOS DE CALIFICACIÓN', '3.5.1', 'a)'),
    extracto_literal: 'La experiencia con privados se acreditará únicamente con comprobantes de pago.',
    descripcion: 'Limitar la acreditación a comprobantes puede excluir formas válidas de acreditar la experiencia.',
    solicitud: 'ampliar' as const,
    recomendacion: 'Admitir contratos con su conformidad o constancia de prestación, o comprobantes de pago.',
    origen: 'auditor' as const,
    fundamento_normativo: [],
  },
  {
    id: 'redaccion_alcance',
    categoria: 'especificaciones_ambiguas',
    severidad: 'bajo' as const,
    titulo: 'Términos vagos en la descripción del servicio',
    ubicacion_detalle: ub('24', 'ALCANCE', '3.2', 'No corresponde'),
    extracto_literal: 'El servicio deberá ser de alta calidad.',
    descripcion: '«Alta calidad» no tiene una métrica verificable.',
    solicitud: 'precisar' as const,
    recomendacion: 'Reemplazar por estándares medibles (tiempos de respuesta, niveles de servicio).',
    origen: 'auditor' as const,
    fundamento_normativo: [],
  },
].map((h) => ({ ...h, ubicacion: linea(h.ubicacion_detalle) }));

export default function VistaPreviaRevision() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="min-h-screen bg-background pt-14">
      <TdrAuditResultView
        id="demo"
        title="Servicio de mantenimiento preventivo y correctivo de vehículos de la sede central"
        completedAt={new Date().toISOString()}
        origen="pdf"
        result={{
          tipo_documento: 'TDR',
          objeto_inferido: 'Mantenimiento de vehículos',
          regimen: 'seleccion',
          objeto_contratacion: 'servicios',
          stats: { criticos: 2, altos: 2, medios: 1, bajos: 1 },
          hallazgos: H,
          resumen_ejecutivo:
            'El requerimiento requiere correcciones antes de llevarse al mercado: omite el cuadro de otras penalidades y fija un plazo indeterminado, dos vicios críticos. Además restringe la concurrencia con la ubicación del taller y no regula la conformidad.',
          cobertura: [
            { tema: 'penalidades', nombre: 'Penalidades (mora y otras penalidades)', clausulas: 1, documentosEnLaBiblioteca: 4, leidos: 10, hallazgos: 1 },
            { tema: 'conformidad', nombre: 'Conformidad de la prestación', clausulas: 0, documentosEnLaBiblioteca: 8, leidos: 8, hallazgos: 1 },
            { tema: 'ubicacion', nombre: 'Ubicación del proveedor, taller o almacén', clausulas: 3, documentosEnLaBiblioteca: 219, leidos: 10, hallazgos: 1 },
            { tema: 'experiencia', nombre: 'Experiencia del proveedor', clausulas: 3, documentosEnLaBiblioteca: 271, leidos: 10, hallazgos: 0 },
          ],
        }}
      />
    </div>
  );
}
