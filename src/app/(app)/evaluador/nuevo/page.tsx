import { EvaluatorWizard } from '@/components/app/evaluator/evaluator-wizard';

export const metadata = { title: 'Nueva evaluación' };

export default function NuevaEvaluacionPage() {
  return (
    <div className="container max-w-3xl py-8">
      <EvaluatorWizard />
    </div>
  );
}
