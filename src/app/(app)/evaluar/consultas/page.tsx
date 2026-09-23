import { redirect } from 'next/navigation';
import { MessagesSquare, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRole } from '@/lib/auth/session';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
  BandaDeConfianza,
} from '@/components/app/seccion/piezas';
import {
  ListadoDePliegos,
  type FilaDePliego,
} from '@/components/app/consultas/listado-de-pliegos';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consultas y observaciones' };

export default async function ConsultasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const rol = (perfil?.profile_role as ProfileRole | null) || null;

  // Absolver es del comité de selección; formular, de quien participa.
  // El consultor asesora a los dos lados, así que ve las dos puertas.
  const puedeAbsolver = rol === 'entity' || rol === 'consultant' || rol === null;
  const puedeFormular = rol === 'provider' || rol === 'consultant' || rol === null;

  const { data } = await supabase
    .from('pliegos_consultas')
    .select(
      'id, cara, procedimiento, numero_procedimiento, updated_at, entradas_consulta(count)',
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  const pliegos: FilaDePliego[] = (
    (data ?? []) as Array<{
      id: string;
      cara: 'formulacion' | 'absolucion';
      procedimiento: string;
      numero_procedimiento: string;
      updated_at: string;
      entradas_consulta: Array<{ count: number }>;
    }>
  ).map((p) => ({
    id: p.id,
    cara: p.cara,
    procedimiento: p.procedimiento,
    numeroProcedimiento: p.numero_procedimiento,
    entradas: p.entradas_consulta?.[0]?.count ?? 0,
    actualizado: p.updated_at,
  }));

  return (
    <Pagina className="max-w-[1200px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Evaluar', href: '/evaluar' },
          { label: 'Consultas y observaciones' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={MessagesSquare}
        familia="evaluar"
        titulo="Consultas y observaciones"
        bajada="La etapa en que los participantes cuestionan las bases y el comité responde. A-LexIA arma los dos escritos con la estructura del formato oficial."
        aside={
          <NotaDelCompanero icono={HelpCircle} familia="evaluar" className="max-w-[320px]">
            Una consulta pide una aclaración; una observación denuncia que un extremo contraviene
            la norma y pide corregirlo.
          </NotaDelCompanero>
        }
      />

      <ListadoDePliegos
        pliegos={pliegos}
        puedeAbsolver={puedeAbsolver}
        puedeFormular={puedeFormular}
      />

      <BandaDeConfianza
        texto="Los fundamentos se apoyan en la Ley N.° 32069, su reglamento y las bases estándar: A-LexIA no cita una norma que no esté en la biblioteca."
        lemas={['Sustento', 'Estructura', 'Trazabilidad']}
      />
    </Pagina>
  );
}
