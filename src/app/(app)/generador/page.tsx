import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Plus, Sparkles } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import {
  GENERATOR_PERFILES,
  GENERATOR_PERFILES_LIST,
  type GeneratorPerfil,
} from '@/lib/ai/generator-perfiles';
import { GeneratorPerfilPicker } from '@/components/app/generator-chat/perfil-picker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Generador de Documentos' };

export default async function GeneradorListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('generator_conversations')
    .select('id, title, perfil, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30);

  const convos = (data || []) as Array<{
    id: string;
    title: string | null;
    perfil: GeneratorPerfil;
    created_at: string;
    updated_at: string;
  }>;

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
          Elige el perfil que firma, adjunta tus fuentes (PDFs) y describe
          qué necesitas. LexIA combina la normativa cargada + tus
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
        <GeneratorPerfilPicker />
      </Card>

      {/* Historial de conversaciones */}
      {convos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Conversaciones recientes ({convos.length})
          </h2>
          <div className="space-y-2">
            {convos.map((c) => {
              const perfil = GENERATOR_PERFILES[c.perfil];
              return (
                <Link key={c.id} href={`/generador/chat/${c.id}`}>
                  <Card className="p-4 hover:border-brand-400 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{perfil.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            {perfil.shortLabel}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm truncate">
                          {c.title || 'Nueva conversación'}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Actualizada {formatRelative(c.updated_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {convos.length === 0 && (
        <Card className="p-8 text-center bg-brand-50/40 dark:bg-brand-950/20 border-dashed">
          <p className="text-sm text-muted-foreground">
            Aún no tienes documentos generados. Elige un perfil arriba
            para empezar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
            {GENERATOR_PERFILES_LIST.slice(0, 3).map((p) => (
              <span
                key={p.key}
                className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-secondary/30 border border-border px-2.5 py-1"
              >
                <span>{p.emoji}</span>
                <span className="font-medium">{p.shortLabel}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
