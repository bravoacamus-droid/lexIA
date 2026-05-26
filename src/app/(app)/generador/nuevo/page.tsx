import { GeneratorWizard } from '@/components/app/generator/generator-wizard';

export const metadata = { title: 'Nuevo documento' };

export default function NuevoDocumentoPage() {
  return (
    <div className="container max-w-3xl py-8">
      <GeneratorWizard />
    </div>
  );
}
