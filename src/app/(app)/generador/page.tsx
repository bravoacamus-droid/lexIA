import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowRight, FileSignature, Bot, MessagesSquare } from 'lucide-react';
import { GENERATOR_PERFILES, type GeneratorPerfil } from '@/lib/ai/generator-perfiles';
import { PERFILES_POR_ROL, type Actuacion, type Perfil, type RolDeUsuario } from '@/lib/ejecucion/catalogo';
import type { SemaforoProcedencia } from '@/lib/ejecucion/tipos';
import { ArranqueDelExpediente } from '@/components/app/ejecucion/arranque';
import { ListaDeExpedientes, type FilaDeExpediente } from '@/components/app/ejecucion/lista-expedientes';
import { Pagina, MigaDePan, EncabezadoDeSeccion, NotaDelCompanero } from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documentos de ejecución contractual' };

/**
 * «Generador de documentos administrativos» (César, setiembre de 2026):
 * el motor inteligente de ejecución contractual. Arriba, las dos
 * decisiones —quién emite y qué hay que resolver— con los documentos
 * que se tengan; debajo, los expedientes. Las conversaciones del
 * generador anterior siguen abiertas al pie: nadie pierde lo que hizo.
 */
export default async function GeneradorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: expedientes }, { data: convos }] = await Promise.all([
    supabase.from('profiles').select('profile_role').eq('id', user.id).maybeSingle(),
    supabase
      .from('expedientes')
      .select('id, titulo, updated_at, expediente_documentos(count), expediente_actuaciones(id, perfil, actuacion, analizada:analisis->>actuacion, semaforo:analisis->procedencia->>semaforo, created_at)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(40),
    supabase
      .from('generator_conversations')
      .select('id, title, perfil, created_at, updated_at, generator_messages(count)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30),
  ]);

  // Filtro por rol: la Entidad emite desde sus órganos; el proveedor, como
  // contratista o supervisor; el consultor, desde cualquiera.
  const rol = ((profile as { profile_role: string | null } | null)?.profile_role || 'consultant') as RolDeUsuario;
  const permitidos: Perfil[] = PERFILES_POR_ROL[rol] ?? PERFILES_POR_ROL.consultant;

  const filas: FilaDeExpediente[] = ((expedientes ?? []) as Array<{
    id: string;
    titulo: string;
    updated_at: string;
    expediente_documentos: Array<{ count: number }>;
    expediente_actuaciones: Array<{ id: string; perfil: Perfil; actuacion: Actuacion | null; analizada: Actuacion | null; semaforo: SemaforoProcedencia | null; created_at: string }>;
  }>).map((e) => ({
    id: e.id,
    titulo: e.titulo,
    updated_at: e.updated_at,
    documentos: e.expediente_documentos?.[0]?.count ?? 0,
    actuaciones: [...(e.expediente_actuaciones ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((a) => ({ id: a.id, perfil: a.perfil, actuacion: a.analizada ?? a.actuacion, semaforo: a.semaforo })),
  }));

  // El generador anterior, por conversación: cuántas conversaciones
  // tiene el usuario, para el acceso del pie.
  const conversaciones = ((convos ?? []) as Array<{ perfil: GeneratorPerfil; generator_messages: Array<{ count: number }> }>).filter(
    (c) => (c.generator_messages?.[0]?.count ?? 0) > 0 && GENERATOR_PERFILES[c.perfil],
  ).length;

  return (
    <Pagina className="max-w-[1200px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Generar', href: '/generar' },
          { label: 'Documentos de ejecución contractual' },
        ]}
      />

      <EncabezadoDeSeccion
        icono={FileSignature}
        familia="generar"
        titulo="Documentos de ejecución contractual"
        bajada="Comprende · Diagnostica · Solicita · Analiza · Redacta · Verifica. Cuéntale tu caso a A-LexIA y adjunta lo que tengas: identifica la figura, pide solo lo indispensable y proyecta el documento del perfil que lo emite."
        aside={
          <NotaDelCompanero icono={Bot} familia="generar" className="max-w-[330px]">
            Pido menos, analizo más y explico mejor: no te volveré a preguntar lo que ya dicen tus documentos.
          </NotaDelCompanero>
        }
      />

      <ArranqueDelExpediente permitidos={permitidos} />

      <ListaDeExpedientes filas={filas} />

      <Link
        href="/generador/conversacion"
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-generar-300 dark:hover:border-generar-700"
      >
        <MessagesSquare className="h-5 w-5 shrink-0 text-generar-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">Redacción libre por conversación</span>
          <span className="block text-[12.5px] text-muted-foreground">
            El generador anterior, sin expediente{conversaciones ? `: tus ${conversaciones} ${conversaciones === 1 ? 'conversación sigue' : 'conversaciones siguen'} ahí` : ''}.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </Pagina>
  );
}
