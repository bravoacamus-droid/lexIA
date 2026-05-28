import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel } from '@/lib/ai/gemini';
import { AMPLIACION_PLAZO_SYSTEM_PROMPT } from '@/lib/ai/generator-prompts';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('generated_documents')
    .select('id, document_type, title, input_data, user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const row = data as {
    id: string;
    document_type: string;
    title: string;
    input_data: Record<string, unknown>;
    user_id: string;
  };
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (row.document_type !== 'ampliacion_plazo') {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 });
  }

  const userPrompt = buildAmpliacionUserPrompt(row.input_data, row.title);

  const result = streamText({
    model: chatModel,
    system: AMPLIACION_PLAZO_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.3,
    onFinish: async ({ text }) => {
      // Persistimos también desde el server como red de seguridad.
      // El cliente igualmente persiste al terminar el stream (PATCH explícito)
      // porque onFinish corre después de cerrar la conexión y puede perderse.
      await supabase
        .from('generated_documents')
        .update({ generated_content: text } as never)
        .eq('id', row.id);
    },
  });

  // Stream de TEXTO PLANO (no el data-stream protocol con prefijos 0:/d:/e:)
  // — más robusto a chunks partidos, sin parsing JSON en el cliente.
  return result.toTextStreamResponse();
}

function buildAmpliacionUserPrompt(
  input: Record<string, unknown>,
  title: string,
): string {
  const get = (k: string) => (input[k] ? String(input[k]).trim() : '');
  const numero_contrato = get('numero_contrato') || 'N° [pendiente]';
  const objeto_contrato = get('objeto_contrato') || 'Objeto del contrato';
  const entidad = get('entidad') || 'la entidad contratante';
  const fecha_inicio = get('fecha_inicio');
  const plazo_dias = get('plazo_dias');
  const fecha_fin = get('fecha_fin');
  const dias_ampliacion = get('dias_ampliacion') || '___';
  const causal = get('causal');
  const descripcion = get('descripcion');

  return `Genera la SOLICITUD DE AMPLIACIÓN DE PLAZO con los siguientes datos:

Título interno: ${title}

DATOS DEL CONTRATO:
- Número de contrato: ${numero_contrato}
- Objeto del contrato: ${objeto_contrato}
- Entidad contratante: ${entidad}

PLAZOS:
- Fecha de inicio del contrato: ${fecha_inicio || 'no proporcionada'}
- Plazo contractual original: ${plazo_dias ? `${plazo_dias} días calendario` : 'no proporcionado'}
- Fecha programada de culminación: ${fecha_fin || 'no proporcionada'}
- Días de ampliación solicitados: ${dias_ampliacion} días calendario

CAUSAL INVOCADA:
${causal || 'No especificada'}

DESCRIPCIÓN DETALLADA DEL HECHO QUE SUSTENTA LA SOLICITUD:
${descripcion || 'No proporcionada por el contratista.'}

Redacta el documento completo en markdown siguiendo EXACTAMENTE la estructura especificada en las instrucciones del sistema.`;
}
