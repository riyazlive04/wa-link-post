import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Verify payment function called - Method:', req.method);
  
  try {
    console.log('Creating Supabase client...');
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    console.log('Getting authenticated user...');
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }
    console.log('User authenticated:', user.id);

    // Parse request body
    console.log('Parsing request body...');
    const body = await req.json();
    console.log('Request body received:', body);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new Error("Missing required payment verification data");
    }

    // Get Razorpay secrets
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      console.error('Razorpay key secret not configured');
      throw new Error("Razorpay credentials not configured");
    }

    // Verify Razorpay signature
    console.log('Verifying Razorpay signature...');
    const crypto = await import("https://deno.land/std@0.190.0/crypto/mod.ts");
    const encoder = new TextEncoder();
    const data_to_sign = razorpay_order_id + "|" + razorpay_payment_id;
    
    const key = await crypto.crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data_to_sign)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error("Payment verification failed - invalid signature");
    }

    console.log('Signature verification successful');

    // Update payment record with success status
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('Updating payment record...');
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

    // Update payment status to success
    const { error: updateError } = await supabaseService
      .from('payment_history')
      .update({
        status: 'success',
        razorpay_payment_id: razorpay_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('Failed to update payment record:', updateError);
      throw new Error('Failed to update payment record');
    }

    console.log('Payment record updated successfully');

    // Add credits to user account
    console.log('Adding credits to user account...');
    const { error: creditError } = await supabaseService.rpc('add_credits', {
      user_uuid: user.id,
      credits: paymentRecord.credits_purchased,
      credit_source: 'purchase'
    });

    if (creditError) {
      console.error('Failed to add credits:', creditError);
      throw new Error('Failed to add credits to user account');
    }

    console.log('Credits added successfully');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and credits added successfully',
        credits_added: paymentRecord.credits_purchased
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