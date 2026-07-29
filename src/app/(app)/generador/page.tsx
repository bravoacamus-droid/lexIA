import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Plus, Sparkles } from 'lucide-react';
import {
  GENERATOR_PERFILES,
  PERFILES_POR_ROL,
  type GeneratorPerfil,
  type GeneratorUserRole,
} from '@/lib/ai/generator-perfiles';
import { GeneratorPerfilPicker } from '@/components/app/generator-chat/perfil-picker';
import { GeneratorHistoryTabs } from '@/components/app/generator-chat/history-tabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Generador de Documentos' };

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
    <div className="container max-w-5xl py-8 space-y-6">
      <header>
        <div className="inline-flex items-center gap-2 mb-2 text-xs font-medium text-brand-700 dark:text-brand-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Nuevo · Chat conversacional + adjuntos + perfiles</span>
        </div>
        <h1 className="font-semibold text-3xl tracking-tight">
          Generador de Documentos con IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Redacta memorandos, informes, resoluciones, descargos, TDR y más.
          Elige el perfil que firma, adjunta tus fuentes (PDF o Word) y
          describe qué necesitas. LexIA combina la normativa cargada + tus
          documentos y arma el borrador que puedes descargar a Word.
        </p>
      </header>

      {/* Selector de perfil para arrancar nueva conversación */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Nuevo documento — elige un perfil</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          El perfil define el tono, la estructura y el sustento jurídico
          del documento que se generará.
        </p>
        <GeneratorPerfilPicker allowed={allowed} />
      </Card>

      {/* Historial clasificado en pestañas por perfil */}
      <GeneratorHistoryTabs convos={convosValidas} />

      {convosValidas.length === 0 && (
        <Card className="p-8 text-center bg-brand-50/40 dark:bg-brand-950/20 border-dashed">
          <p className="text-sm text-muted-foreground">
            Aún no tienes documentos generados. Elige un perfil arriba
            para empezar.
          </p>
        </Card>
      )}
    </div>
  );
}
