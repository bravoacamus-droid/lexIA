import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Requisitos del trámite RNP' };

export default async function RequisitosRnpPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const userRole = (profile?.profile_role as ProfileRole | null) || null;

  if (!isRoleAllowed(userRole, ['provider', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['provider', 'consultant']}
        userRole={userRole}
        moduleName="Requisitos del trámite RNP"
        reason="Este contenido informativo está pensado para proveedores."
      />
    );
  }

  // Las fichas técnicas oficiales viven en generator_templates como
  // few-shot del slug rnp_aumento_cmc. Acá las mostramos como referencia.
  const { data: templates } = await supabase
    .from('generator_templates')
    .select('id, label, sample_text, notes')
    .eq('slug', 'rnp_aumento_cmc')
    .eq('active', true);

  const items = (templates || []) as Array<{
    id: string;
    label: string;
    sample_text: string;
    notes: string | null;
  }>;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-3xl tracking-tight">
            Requisitos del trámite RNP
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fichas técnicas oficiales del OECE para Ejecutor y Consultor de
            Obras (Persona Jurídica o Natural, Nacional).
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/rnp">
            <ArrowLeft className="h-4 w-4" />
            Volver a Trámites RNP
          </Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Aún no se han cargado las fichas técnicas oficiales.
        </Card>
      ) : (
        <div className="space-y-5">
          {items.map((t) => (
            <Card key={t.id} className="p-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 shrink-0">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base">{t.label}</h3>
                  {t.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>
                  )}
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed font-sans text-foreground/85 bg-secondary/40 rounded-lg p-4 border border-border max-h-[420px] overflow-y-auto scrollbar-thin">
                {t.sample_text}
              </pre>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5 bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/60">
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">Tip:</span> esta sección es una guía
          rápida de qué documentos necesitas. La lista completa con detalles y
          excepciones está en{' '}
          <Link
            href="/rnp/aumento-cmc"
            className="text-brand-700 dark:text-brand-400 hover:underline"
          >
            Aumento de CMC
          </Link>
          : al generar el escrito, LexIA produce además un checklist personalizado
          según tu tipo de proveedor (PJ/PN) y régimen.
        </p>
      </Card>
    </div>
  );
}
