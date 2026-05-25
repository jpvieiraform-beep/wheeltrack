import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
};

serve(async (req) => {
  // Tratar pedidos CORS (essencial para o teu site Vite conseguir comunicar)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email } = await req.json()

    // Criar a sessão de Checkout do Stripe para 2,99€ / mês
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'WheelTrack PRO',
              description: 'Matches inteligentes e chat ilimitado de colecionadores',
            },
            unit_amount: 299, // 2,99€ em cêntimos
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Redireciona de volta para o teu domínio da Mavicut após o pagamento
      success_url: `https://wheeltrack.mavicut.pt/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://wheeltrack.mavicut.pt/`,
      metadata: {
        userId: userId, // Guardamos o ID do utilizador para saber quem ativar no Webhook
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})