// @ts-nocheck
// Supabase Edge Function: ai-suggest-prompts
// Generates prompt improvement suggestions based on recent ai_message_feedback.
// Stores suggestions in public.ai_prompt_suggestions for super_admin review.
//
// Deploy: supabase functions deploy ai-suggest-prompts
//
// Env required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Current active prompt (latest)
    const { data: promptVersions } = await supabaseAdmin
      .from('ai_prompt_versions')
      .select('id, prompt, model, temperature, max_tokens, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const base = promptVersions && promptVersions.length ? promptVersions[0] : null;
    if (!base) {
      return json(400, { success: false, error: 'No active ai_prompt_versions found' });
    }

    // Pull recent feedback (last 7 days, max 200)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: feedback } = await supabaseAdmin
      .from('ai_message_feedback')
      .select('rating, comment, created_at, prompt_version_id')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);

    const total = feedback?.length ?? 0;
    const up = feedback?.filter((f: any) => f.rating === 1).length ?? 0;
    const down = feedback?.filter((f: any) => f.rating === -1).length ?? 0;
    const sampleComments = (feedback ?? [])
      .map((f: any) => (f.comment ? String(f.comment) : ''))
      .filter(Boolean)
      .slice(0, 25);

    // Use existing openai-chat helper to generate a suggestion using the stored OpenAI key.
    const messages = [
      {
        role: 'system',
        content:
          'You are an expert prompt engineer improving an in-app assistant for a mobile app called Committed. ' +
          'Produce one improved SYSTEM PROMPT. Keep it concise, action-oriented, and focused on helping users use the app and troubleshoot. ' +
          'Do NOT include secrets. Output ONLY the prompt text, nothing else.',
      },
      {
        role: 'user',
        content:
          `Current system prompt:\n\n${base.prompt}\n\n` +
          `Recent feedback stats (last 7 days): total=${total}, up=${up}, down=${down}\n\n` +
          `Sample user comments:\n- ${sampleComments.join('\n- ') || '(none)'}\n\n` +
          `Return an improved system prompt now.`,
      },
    ];

    const { data: openaiData, error: openaiErr } = await supabaseAdmin.functions.invoke('openai-chat', {
      body: { messages, temperature: 0.3, max_tokens: 900 },
    });

    if (openaiErr || !openaiData?.success) {
      return json(502, {
        success: false,
        error: openaiData?.error || openaiErr?.message || 'Failed to generate suggestion via openai-chat',
      });
    }

    const suggestedPrompt = String(openaiData.message ?? '').trim();
    if (!suggestedPrompt) return json(502, { success: false, error: 'Empty suggestion from OpenAI' });

    const { error: insertErr } = await supabaseAdmin.from('ai_prompt_suggestions').insert({
      base_prompt_version_id: base.id,
      suggested_prompt: suggestedPrompt,
      rationale: 'Generated from recent thumbs up/down feedback and comments.',
      stats: { since, total, up, down },
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (insertErr) return json(500, { success: false, error: insertErr.message });

    return json(200, { success: true, suggestedPrompt });
  } catch (e: any) {
    console.error('ai-suggest-prompts fatal:', e);
    return json(500, { success: false, error: e?.message ?? 'Internal server error' });
  }
});


