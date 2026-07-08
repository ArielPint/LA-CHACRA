import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAMPOS = ['numero_oc', 'proveedor', 'proveedor_rut', 'fecha', 'total'] as const;

const PROMPT = `Eres un extractor de datos de órdenes de compra con estructura fija.

TAREA:
Analiza el PDF adjunto y extrae estos 5 campos:
1. numero_oc
2. proveedor (nombre del proveedor)
3. proveedor_rut (RUT del proveedor tal como aparece en el documento, ej. 12.345.678-9)
4. fecha (formato YYYY-MM-DD)
5. total (solo el número, sin símbolos ni separadores de miles; usa punto como separador decimal si corresponde)

REGLAS:
- Si un campo no existe en el documento o no se puede leer con certeza, retorna "NO_ENCONTRADO"
- Retorna SOLO JSON válido
- Sin explicaciones adicionales
- Sin Markdown ni backticks

RESPUESTA (usa exactamente estas claves):
{
  "numero_oc": "",
  "proveedor": "",
  "proveedor_rut": "",
  "fecha": "",
  "total": "",
  "status": "OK"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta pdfBase64' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('anthropic');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Secret "anthropic" no configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const detalle = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, detalle);
      return new Response(JSON.stringify({ error: 'Error al llamar a la API de Claude' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicData = await anthropicRes.json();
    const textoRespuesta = anthropicData.content?.[0]?.text ?? '';
    // El modelo a veces envuelve el JSON en fences de Markdown pese a la
    // instrucción de no hacerlo; se limpia antes de parsear.
    const textoLimpio = textoRespuesta.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let extraido: Record<string, string>;
    try {
      extraido = JSON.parse(textoLimpio);
    } catch {
      console.error('Respuesta no era JSON válido:', textoRespuesta);
      return new Response(JSON.stringify({ error: 'El modelo no devolvió JSON válido' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resultado: Record<string, string> = { status: 'OK' };
    for (const campo of CAMPOS) {
      resultado[campo] = typeof extraido[campo] === 'string' ? extraido[campo] : 'NO_ENCONTRADO';
    }

    return new Response(JSON.stringify(resultado), {
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
