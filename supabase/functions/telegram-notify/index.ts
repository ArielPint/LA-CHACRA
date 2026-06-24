import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { evento, message, imageUrls } = await req.json();

    if (!evento || !message) {
      return new Response(JSON.stringify({ error: 'Missing evento or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: chats, error } = await supabase
      .from('planta_telegram_chats')
      .select('bot_token, chat_id')
      .eq('active', true)
      .contains('eventos', [evento]);

    if (error) {
      console.error('DB error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!chats || chats.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hasImages = Array.isArray(imageUrls) && imageUrls.length > 0;

    const results = await Promise.allSettled(
      chats.map(async (ch: { bot_token: string; chat_id: string }) => {
        const apiBase = `https://api.telegram.org/bot${ch.bot_token}`;

        if (hasImages) {
          // Send photos as media group with caption on first item
          const media = imageUrls.slice(0, 10).map((url: string, i: number) => ({
            type: 'photo',
            media: url,
            ...(i === 0 ? { caption: message } : {}),
          }));
          return fetch(`${apiBase}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ch.chat_id, media }),
          });
        } else {
          return fetch(`${apiBase}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ch.chat_id, text: message }),
          });
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ sent, total: chats.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
