import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { fastModel } from '@/lib/ai/gemini';
import { SUGGESTIONS_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const maxDuration = 30;

const requestSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const { data: msgs } = await supabase
    .from('chat_messages')
    .select('role, content, conversation_id')
    .eq('conversation_id', parsed.data.conversationId)
    .order('created_at', { ascending: false })
    .limit(4);

  if (!msgs || msgs.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const tail = [...(msgs as Array<{ role: string; content: string }>)].reverse();
  const transcript = tail
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'LexIA'}: ${m.content.slice(0, 800)}`)
    .join('\n\n');

  try {
    const { text } = await generateText({
      model: fastModel,
      system: SUGGESTIONS_SYSTEM_PROMPT,
      prompt: `Aquí está la conversación reciente:\n\n${transcript}\n\nGenera 3 preguntas de seguimiento.`,
      temperature: 0.6,
      maxTokens: 200,
    });

    // Parse JSON array — be tolerant a fences ```json
    const clean = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let suggestions: string[] = [];
    try {
      const arr = JSON.parse(clean);
      if (Array.isArray(arr)) {
        suggestions = arr
          .map((s) => String(s).trim())
          .filter((s) => s.length > 3 && s.length < 200)
          .slice(0, 3);
      }
    } catch {
      // fallback: split por líneas
      suggestions = clean
        .split('\n')
        .map((l) => l.replace(/^[-*\d.\s"]+/, '').replace(/["[\],]+$/, '').trim())
        .filter((l) => l.includes('?') && l.length > 5)
        .slice(0, 3);
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('Suggestions error:', err);
    return NextResponse.json({ suggestions: [] });
  }
}
