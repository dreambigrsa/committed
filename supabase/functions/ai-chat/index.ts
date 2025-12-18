// @ts-nocheck
// Supabase Edge Function: ai-chat
// Calls OpenAI server-side using an API key stored in `public.app_settings` (key = 'openai_api_key').
// Deploy: supabase functions deploy ai-chat

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

    const body = await req.json().catch(() => ({}));
    const userMessage = String(body?.userMessage ?? '').trim();
    const conversationHistory = Array.isArray(body?.conversationHistory) ? body.conversationHistory : [];
    const systemPrompt = body?.systemPrompt ? String(body.systemPrompt) : null;

    if (!userMessage) {
      return json(400, { success: false, error: 'Missing userMessage' });
    }

    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'openai_api_key')
      .maybeSingle();

    if (keyErr) return json(500, { success: false, error: keyErr.message });
    const apiKey = keyRow?.value ? String(keyRow.value).trim() : '';
    if (!apiKey) return json(400, { success: false, error: 'OpenAI API key not configured' });

    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...conversationHistory.slice(-20),
      { role: 'user', content: userMessage },
    ];

    // Use a modern, cost-effective model. If your key lacks access, OpenAI will return a clear error.
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 600,
      }),
    });

    const openaiJson = await openaiRes.json().catch(() => ({}));
    if (!openaiRes.ok) {
      return json(502, {
        success: false,
        error: openaiJson?.error?.message || `OpenAI error: ${openaiRes.status}`,
      });
    }

    const content = openaiJson?.choices?.[0]?.message?.content;
    if (!content) return json(502, { success: false, error: 'No content returned from OpenAI' });

    return json(200, { success: true, message: content });
  } catch (e: any) {
    console.error('ai-chat fatal error:', e);
    return json(500, { success: false, error: e?.message ?? 'Internal server error' });
  }
});


