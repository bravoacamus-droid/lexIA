import { BasesWizard } from '@/components/app/evaluator/bases-wizard';
import { Pagina, MigaDePan } from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluar unas bases' };

export default function NuevaEvaluacionDeBasesPage() {
  return (
    <Pagina className="max-w-3xl">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Evaluar', href: '/evaluar' },
          { label: 'Evaluación de bases', href: '/evaluar/bases' },
          { label: 'Nueva' },
        ]}
      />
      <BasesWizard />
    </Pagina>
  );
}
