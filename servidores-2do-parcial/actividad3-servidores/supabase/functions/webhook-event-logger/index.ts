// Webhook Event Logger - Edge Function
// Valida firmas HMAC y registra eventos de webhook en Supabase
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'your-super-secret-key-change-this-in-production';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Verificar firma HMAC-SHA256
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Obtener firma del header
    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Leer el payload
    const body = await req.text();
    const payload = JSON.parse(body);

    // Validar firma HMAC
    const isValid = await verifySignature(body, signature);
    if (!isValid) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar idempotencia
    const { event, idempotency_key, data, metadata } = payload;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verificar si ya fue procesado
    const { data: existing } = await supabase
      .from('processed_webhooks')
      .select('id')
      .eq('idempotency_key', idempotency_key)
      .single();

    if (existing) {
      console.log(`Event ${idempotency_key} already processed`);
      return new Response(JSON.stringify({ 
        status: 'already_processed',
        idempotency_key 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Registrar evento
    const { error: eventError } = await supabase
      .from('webhook_events')
      .insert({
        event_type: event,
        idempotency_key,
        payload
      });

    if (eventError) throw eventError;

    // Marcar como procesado
    const { error: processedError } = await supabase
      .from('processed_webhooks')
      .insert({
        idempotency_key,
        event_type: event,
        metadata: { ...metadata, processed_by: 'webhook-event-logger' }
      });

    if (processedError) throw processedError;

    console.log(`✅ Event logged: ${event} (${idempotency_key})`);

    return new Response(JSON.stringify({
      status: 'success',
      event,
      idempotency_key,
      logged_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
})
