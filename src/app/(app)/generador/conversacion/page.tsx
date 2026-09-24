import { createClient } from '@/lib/supabase/server';
import { Bot, MessagesSquare } from 'lucide-react';
import {
  GENERATOR_PERFILES,
  PERFILES_POR_ROL,
  type GeneratorPerfil,
  type GeneratorUserRole,
} from '@/lib/ai/generator-perfiles';
import { ArranqueDelGenerador } from '@/components/app/generator-chat/arranque';
import { GeneratorHistoryTabs } from '@/components/app/generator-chat/history-tabs';
import { Pagina, MigaDePan, EncabezadoDeSeccion, NotaDelCompanero } from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Redacción libre por conversación' };

/**
 * El generador anterior: una conversación para redactar, sin
 * expediente. Se conserva —con sus conversaciones— para quien quiera
 * redactar así o tenga trabajo empezado. El motor de ejecución
 * contractual, con expediente, está en /generador.
 */
export default async function ConversacionLibrePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('generator_conversations')
      .select('id, title, perfil, created_at, updated_at, generator_messages(count)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase.from('profiles').select('profile_role').eq('id', user.id).maybeSingle(),
  ]);
  const role = ((profile as { profile_role: string | null } | null)?.profile_role || 'consultant') as GeneratorUserRole;
  const allowed = PERFILES_POR_ROL[role] ?? PERFILES_POR_ROL.consultant;
  const cutoff = Date.now() - 5 * 60 * 1000;
  const convos = ((data || []) as Array<{
    id: string;
    title: string | null;
    perfil: GeneratorPerfil;
    created_at: string;
    updated_at: string;
    generator_messages: Array<{ count: number }>;
  }>).filter(
    (c) => GENERATOR_PERFILES[c.perfil] && ((c.generator_messages?.[0]?.count ?? 0) > 0 || new Date(c.created_at).getTime() > cutoff),
  );

  return (
    <Pagina className="max-w-[1200px]">
      <MigaDePan
        trozos={[
          { label: 'Inicio', href: '/app' },
          { label: 'Generar', href: '/generar' },
          { label: 'Documentos de ejecución contractual', href: '/generador' },
          { label: 'Redacción libre' },
        ]}
      />
      <EncabezadoDeSeccion
        icono={MessagesSquare}
        familia="generar"
        titulo="Redacción libre por conversación"
        bajada="Una conversación para redactar un documento sin armar expediente. Para las actuaciones de ejecución contractual, con diagnóstico y ficha de control, usa el expediente."
        aside={
          <NotaDelCompanero icono={Bot} familia="generar" className="max-w-[330px]">
            Tus conversaciones anteriores siguen aquí.
          </NotaDelCompanero>
        }
      />
      <ArranqueDelGenerador allowed={allowed} />
      <GeneratorHistoryTabs convos={convos} />
    </Pagina>
  );
}
