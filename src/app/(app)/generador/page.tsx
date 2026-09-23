import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { FileSignature, Bot } from 'lucide-react';
import {
  GENERATOR_PERFILES,
  PERFILES_POR_ROL,
  type GeneratorPerfil,
  type GeneratorUserRole,
} from '@/lib/ai/generator-perfiles';
import { ArranqueDelGenerador } from '@/components/app/generator-chat/arranque';
import { GeneratorHistoryTabs } from '@/components/app/generator-chat/history-tabs';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
} from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documentos de ejecución contractual' };

export default async function GeneradorListPage() {
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
    supabase
      .from('profiles')
      .select('profile_role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const rawConvos = (data || []) as Array<{
    id: string;
    title: string | null;
    perfil: GeneratorPerfil;
    created_at: string;
    updated_at: string;
    generator_messages: Array<{ count: number }>;
  }>;
  // Ocultar conversaciones vacías (creadas al elegir perfil y abandonadas)
  // salvo las de los últimos 5 minutos — misma regla que el chat.
  const cutoff = Date.now() - 5 * 60 * 1000;
  const convos = rawConvos.filter((c) => {
    const n = c.generator_messages?.[0]?.count ?? 0;
    return n > 0 || new Date(c.created_at).getTime() > cutoff;
  });

  // Filtro por rol (observación César 27/07/2026): en modo entidad solo
  // los perfiles de entidad; en modo proveedor solo el postor; el
  // consultor ve todos. Sin rol definido → todos (no bloquear).
  const role = ((profile as { profile_role: string | null } | null)?.profile_role ||
    'consultant') as GeneratorUserRole;
  const allowed = PERFILES_POR_ROL[role] ?? PERFILES_POR_ROL.consultant;
  // El historial solo muestra conversaciones de perfiles conocidos
  // (defensivo ante datos viejos), pero NO se filtra por rol: si el
  // usuario creó documentos antes del filtro, debe poder abrirlos.
  const convosValidas = convos.filter((c) => GENERATOR_PERFILES[c.perfil]);

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
        bajada="Cuéntale a A-LexIA tu caso. Analizará lo que le des, identificará la normativa aplicable y te guiará para proyectar el documento que necesitas."
        aside={
          <NotaDelCompanero icono={Bot} familia="generar" className="max-w-[330px]">
            A-LexIA analiza tu caso, pide solo lo necesario y te da un resultado con su sustento
            citado.
          </NotaDelCompanero>
        }
      />

      <ArranqueDelGenerador allowed={allowed} />

      {/* Historial clasificado en pestañas por perfil */}
      <GeneratorHistoryTabs convos={convosValidas} />

      {convosValidas.length === 0 && (
        <Card className="border-dashed bg-generar-50/40 p-8 text-center dark:bg-generar-900/15">
          <p className="text-sm text-muted-foreground">
            Aún no tienes documentos generados. Describe tu caso arriba para empezar.
          </p>
        </Card>
      )}
    </Pagina>
  );
}
