import { notFound } from 'next/navigation';
import { BasesResultView } from '@/components/app/evaluator/bases-result-view';
import type { HallazgoBases } from '@/lib/evaluacion/bases/tipos';

/** Vista previa de la pantalla de resultados de bases (solo en desarrollo). */
export const metadata = { title: 'Vista previa · Evaluación de bases', robots: { index: false, follow: false } };

const base = (h: Partial<HallazgoBases> & Pick<HallazgoBases, 'id' | 'titulo' | 'severidad'>): HallazgoBases => ({
  tipo: 'exigencia_no_prevista',
  seccion: 'Específica',
  capitulo: 'CAPÍTULO III — REQUERIMIENTO',
  numeral: '',
  enLasBases: '',
  analisis: '',
  norma: '',
  paraElProveedor: { tipo: 'observacion', solicitud: '' },
  paraLaEntidad: '',
  origen: 'revision',
  avisos: [],
  ...h,
});

const HALLAZGOS: HallazgoBases[] = [
  base({
    id: 'tema-penalidades-1',
    titulo: 'Omisión de supuestos objetivos, cálculo y verificación en otras penalidades',
    severidad: 'critico',
    tipo: 'omision',
    numeral: '3.3',
    pagina: '26',
    analisis: 'Se anuncian otras penalidades sin consignar supuesto, forma de cálculo ni procedimiento de verificación.',
    norma: 'numeral 119.1 del artículo 119 del Reglamento',
    fuentes: [
      { tipo: 'pronunciamiento', numero: 'Pronunciamiento N° 420-2026/OECE-DSAT', documentId: 'x1', criterio: 'Exige supuestos y procedimientos de verificación objetivos para otras penalidades.' },
      { tipo: 'informe_vicio_nulidad', numero: 'Informe IVN N° 066-2026/DSAT', documentId: 'x2', criterio: 'Las otras penalidades deben estructurarse con supuesto, cálculo y procedimiento.' },
    ],
    paraElProveedor: { tipo: 'observacion', solicitud: 'Se solicita incorporar el cuadro de otras penalidades con supuesto, cálculo y verificación.' },
    paraLaEntidad: 'Incorporar el cuadro de otras penalidades.',
  }),
  base({
    id: 'gen-1',
    titulo: 'Se modificó el texto de la Sección General sobre el perfeccionamiento del contrato',
    severidad: 'alto',
    tipo: 'modificacion_indebida',
    seccion: 'General',
    capitulo: 'CAPÍTULO III — DEL CONTRATO',
    numeral: '3.1',
    pagina: '12',
    enLasBases: 'El postor ganador deberá presentar los documentos dentro de los cinco días.',
    enElEstandar: 'El postor ganador presenta los documentos dentro de los ocho días hábiles.',
    analisis: 'La Sección General no puede modificarse, bajo sanción de nulidad.',
    origen: 'cotejo',
    paraElProveedor: { tipo: 'observacion', solicitud: 'Se solicita restituir el texto de las bases estándar.' },
    paraLaEntidad: 'Restituir el texto de las bases estándar.',
  }),
  base({
    id: 'cap4-1',
    titulo: '¿Cómo se acredita la experiencia con privados?',
    severidad: 'medio',
    capitulo: 'CAPÍTULO IV — FACTORES DE EVALUACIÓN',
    numeral: '4.1',
    literal: 'A.',
    pagina: '52',
    enLasBases: 'La experiencia con privados se acredita con comprobantes de pago.',
    analisis: 'No queda claro si se admiten contratos con conformidad.',
    paraElProveedor: { tipo: 'consulta', solicitud: '¿Se admitirán contratos con su conformidad para acreditar la experiencia con privados?' },
    paraLaEntidad: 'Precisar los documentos admitidos.',
  }),
  base({
    id: 'cap3-2',
    titulo: 'Exigencia de homologación vigente a la presentación de la oferta',
    severidad: 'bajo',
    numeral: '3.5.2',
    literal: 'B.3.',
    pagina: '48',
    enLasBases: 'Presentar homologación vigente de los equipos.',
    analisis: 'La homologación corresponde a la etapa de perfeccionamiento del contrato.',
    fuentes: [{ tipo: 'pronunciamiento', numero: 'Pronunciamiento N° 533-2026/OECE-DSAT', documentId: 'x3', criterio: 'La acreditación de equipamiento corresponde a la suscripción del contrato.' }],
    paraElProveedor: { tipo: 'observacion', solicitud: 'Se solicita exigir la homologación para el perfeccionamiento del contrato.' },
    paraLaEntidad: 'Trasladar la exigencia al perfeccionamiento.',
  }),
];

export default function VistaPreviaBases() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <div className="mx-auto min-h-screen max-w-[1400px] bg-background px-6 py-8">
      <BasesResultView
        id="demo"
        titulo="CPA 008-2026 — Servicio de mantenimiento de vehículos"
        documento="BASES INTEGRADAS CPA 008-2026.pdf"
        completada={new Date().toISOString()}
        lecturaInicial="proveedor"
        puedeFormular
        estandares={[{ id: 'be-9', titulo: 'Concurso Público Abreviado de Servicios' }]}
        resultado={{
          generadoEn: new Date().toISOString(),
          origen: 'pdf',
          estandar: { id: 'be-9', titulo: 'Concurso Público Abreviado de Servicios', parecido: 0.9 },
          alternativas: [],
          seccionGeneral: { textos: 120, modificados: 1, faltan: 0 },
          capitulosRevisados: ['CAPÍTULO III — REQUERIMIENTO', 'CAPÍTULO IV — FACTORES DE EVALUACIÓN'],
          hallazgos: HALLAZGOS,
          resumen:
            'Se cotejaron 120 textos de la Sección General con las bases estándar: 1 tramo difiere del estándar. En la sección específica se revisaron 2 capítulos, con 4 hallazgos en total (1 crítico).',
        }}
      />
    </div>
  );
}
