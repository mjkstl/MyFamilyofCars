// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy check-photo
// Requires a secret set with:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Classifies whether an uploaded photo contains a vehicle, so the client
// never has to hold an Anthropic API key. Never throws on ambiguous
// results — returns low confidence instead, and the client treats that as
// 'pending' rather than blocking the user.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-6';

interface RequestBody {
  photoUrl: string;
}

interface ClassificationResult {
  isVehicle: boolean;
  confidence: number; // 0..1
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY secret is not set for this Edge Function.');
    }

    const { photoUrl }: RequestBody = await req.json();
    if (!photoUrl) {
      return new Response(JSON.stringify({ error: 'photoUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'url', url: photoUrl },
              },
              {
                type: 'text',
                text:
                  'Does this image clearly show a car, truck, motorcycle, or other ' +
                  'personal motor vehicle as its main subject? Respond with ONLY a ' +
                  'JSON object, no other text: {"isVehicle": boolean, "confidence": number} ' +
                  'where confidence is 0 to 1.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((c: { type: string }) => c.type === 'text');
    const raw = textBlock?.text?.trim() ?? '{}';

    let parsed: ClassificationResult;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Model didn't return clean JSON — treat as low-confidence/unknown
      // rather than failing the whole request.
      parsed = { isVehicle: false, confidence: 0 };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Fail soft: client treats any error response as 'pending', never
    // blocking the user from saving their car.
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
