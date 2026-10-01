import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentViewer, type ParteDelActo } from '@/components/app/library/document-viewer';
import { agruparEnActos, type ActoInfo } from '@/lib/normativa/actos';
import type { NormativeDocType, UserAnnotation } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function DocumentPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: doc } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, summary, date, source_url, metadata, acto_clave, texto_estructurado')
    .eq('id', params.id)
    .maybeSingle();
  if (!doc) notFound();

  // El texto plano solo si no hay estructurado: la Ley y el Reglamento
  // pesan 1,3 millones de caracteres y no tiene sentido mandar los dos.
  let texto = doc.texto_estructurado as string | null;
  const estructurado = !!texto;
  if (!texto) {
    const { data } = await supabase.from('normative_documents').select('raw_text').eq('id', params.id).maybeSingle();
    texto = (data?.raw_text as string | null) ?? null;
  }

  // El acto y sus piezas, para el encabezado y para pasar de una a otra.
  let acto: ActoInfo | null = null;
  let partes: ParteDelActo[] = [];
  if (doc.acto_clave) {
    const [{ data: a }, { data: hermanas }] = await Promise.all([
      supabase.from('normative_acts').select('*').eq('clave', doc.acto_clave).maybeSingle(),
      supabase
        .from('normative_documents')
        .select('id, type, number, title, date, metadata, acto_clave')
        .eq('acto_clave', doc.acto_clave)
        .eq('oculto', false),
    ]);
    acto = (a as ActoInfo | null) ?? null;
    const [agrupado] = agruparEnActos(hermanas || [], acto ? { [acto.clave]: acto } : {});
    partes = (agrupado?.partes ?? []).map(({ doc: d, parte }) => ({
      id: d.id,
      etiqueta: parte.etiqueta.replace(/^Resolución que la aprueba$/, 'Resolución que la aprueba'),
      fecha: (d.metadata?.parte_fecha as string | null) ?? null,
    }));
  }

  const [annotationsRes, savedRes, foldersRes] = await Promise.all([
    supabase
      .from('user_annotations')
      .select('id, document_id, highlighted_text, position, color, created_at')
      .eq('user_id', user.id)
      .eq('document_id', params.id)
      .order('created_at', { ascending: true }),
    supabase.from('user_saved_documents').select('id, folder_id').eq('user_id', user.id).eq('document_id', params.id).maybeSingle(),
    supabase.from('user_folders').select('id, name, color, icon, created_at').eq('user_id', user.id).order('created_at', { ascending: true }),
  ]);

  return (
    <DocumentViewer
      document={{
        id: doc.id,
        type: doc.type as NormativeDocType,
        number: doc.number,
        title: doc.title,
        summary: doc.summary,
        date: doc.date,
        source_url: doc.source_url,
        metadata: (doc.metadata as Record<string, unknown> | null) ?? null,
        texto,
        estructurado,
      }}
      acto={acto}
      partes={partes}
      initialAnnotations={(annotationsRes.data || []) as UserAnnotation[]}
      isSaved={!!savedRes.data}
      folders={(
        (foldersRes.data || []) as Array<{ id: string; name: string; color: string; icon: string; created_at: string }>
      ).map((f) => ({ ...f, count: 0 }))}
    />
  );
}
