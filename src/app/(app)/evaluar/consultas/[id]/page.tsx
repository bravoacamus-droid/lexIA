import { notFound, redirect } from 'next/navigation';
import { MessagesSquare, FileText, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { leerPliego } from '@/lib/consultas/repositorio';
import { EditorDePliego } from '@/components/app/consultas/editor-de-pliego';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
} from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';

export default async function PliegoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const pliego = await leerPliego(params.id);
  if (!pliego) notFound();

  const esAbsolucion = pliego.cara === 'absolucion';
  const titulo = esAbsolucion
    ? 'Absolución de consultas y observaciones'
    : 'Formulación de consultas y observaciones';

  return (
    <Pagina className="max-w-[1400px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Evaluar', href: '/evaluar' },
          { label: 'Consultas y observaciones', href: '/evaluar/consultas' },
          { label: pliego.encabezado.numeroProcedimiento || 'Sin número' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={esAbsolucion ? MessagesSquare : FileText}
        familia="evaluar"
        titulo={titulo}
        bajada={
          esAbsolucion
            ? 'Analiza las solicitudes de los participantes y prepara propuestas de absolución con su sustento.'
            : 'Formula tus consultas y observaciones a las bases, con la estructura que exige el formato oficial.'
        }
        aside={
          <NotaDelCompanero icono={HelpCircle} familia="evaluar" className="max-w-[320px]">
            Cada escrito se arma por tramos —referencia, sustento y solicitud— y así es como sale
            en el Word.
          </NotaDelCompanero>
        }
      />

      <EditorDePliego pliego={pliego} />
    </Pagina>
  );
}
