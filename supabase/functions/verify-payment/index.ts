import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',  
};

// Verify Razorpay signature
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const body = `${orderId}|${paymentId}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const hmacBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(hmacBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Parse request body
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing required payment data");
    }

    console.log('Verifying payment:', { razorpay_order_id, razorpay_payment_id });

    // Get Razorpay secret
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      throw new Error("Razorpay secret not configured");
    }

    // Verify signature
    const isValidSignature = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      console.error('Invalid signature for payment:', razorpay_payment_id);
      throw new Error("Invalid payment signature");
    }

    console.log('Payment signature verified successfully');

    // Use service role to update payment and add credits
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get payment record
    const { data: paymentRecord, error: fetchError } = await supabaseService
      .from('payment_history')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !paymentRecord) {
      console.error('Payment record not found:', fetchError);
      throw new Error('Payment record not found');
    }

    if (paymentRecord.status === 'success') {
      console.log('Payment already processed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed',
          credits_added: paymentRecord.credits_purchased
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status
    const { error: updateError } = await supabaseService
      .from('payment_history')
      .update({
        razorpay_payment_id,
        status: 'success',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      throw new Error('Failed to update payment status');
    }

    // Add credits to user account
    const { error: creditsError } = await supabaseService.rpc('add_credits', {
      user_uuid: user.id,
      credits: paymentRecord.credits_purchased,
      credit_source: 'purchase'
    });

    if (creditsError) {
      console.error('Failed to add credits:', creditsError);
      // Try to revert payment status
      await supabaseService
        .from('payment_history')
        .update({ status: 'failed' })
        .eq('id', paymentRecord.id);
      
      throw new Error('Failed to add credits to account');
    }

    console.log(`Successfully added ${paymentRecord.credits_purchased} credits to user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and credits added successfully',
        credits_added: paymentRecord.credits_purchased,
        amount_paid: paymentRecord.amount,
        currency: paymentRecord.currency
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Verify payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Payment verification failed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});