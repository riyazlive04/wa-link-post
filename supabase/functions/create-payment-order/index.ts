import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Payment plans configuration
const PAYMENT_PLANS = {
  'free-tier': {
    amount: 00000, // ₹000 in paise
    currency: 'INR',
    credits: 5
  },
  'solo-in': {
    amount: 49900, // ₹499 in paise
    currency: 'INR',
    credits: 30
  },
  'startup-in': {
    amount: 99900, // ₹999 in paise
    currency: 'INR',
    credits: 60
  },
  'solo-global': {
    amount: 99900, // ₹999 in paise
    currency: 'INR',
    credits: 30
  },
  'startup-global': {
    amount: 149900, // ₹1499 in paise
    currency: 'INR',
    credits: 60
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Function called - Method:', req.method);
  
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
    const { planId = 'solo-global' } = body;
    console.log('Plan ID extracted:', planId);

    // Validate plan and get plan details
    if (!PAYMENT_PLANS[planId as keyof typeof PAYMENT_PLANS]) {
      console.error('Invalid plan ID:', planId);
      throw new Error("Invalid plan. Supported: solo-in, startup-in, solo-global, startup-global");
    }

    const plan = PAYMENT_PLANS[planId as keyof typeof PAYMENT_PLANS];
    console.log('Creating order for plan:', plan);

    // Create Razorpay order
    console.log('Creating order for plan:', plan);

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials not configured');
      throw new Error("Razorpay credentials not configured");
    }

    // Generate unique receipt ID
    const receiptId = `receipt_${user.id.substring(0, 8)}_${Date.now()}`;

    // Create Razorpay order
    const orderData = {
      amount: plan.amount,
      currency: plan.currency,
      receipt: receiptId,
      notes: {
        user_id: user.id,
        credits: plan.credits.toString(),
        email: user.email || 'unknown'
      }
    };

    console.log('Creating Razorpay order:', orderData);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay order creation failed:', response.status, errorText);
      throw new Error(`Razorpay order creation failed: ${response.status}`);
    }

    const razorpayOrder = await response.json();
    console.log('Razorpay order created:', razorpayOrder.id);

    // Store payment record with pending status
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: insertError } = await supabaseService
      .from('payment_history')
      .insert({
        user_id: user.id,
        amount: plan.amount,
        currency: plan.currency,
        credits_purchased: plan.credits,
        transaction_id: receiptId,
        razorpay_order_id: razorpayOrder.id,
        status: 'pending'
      });

    if (insertError) {
      console.error('Failed to store payment record:', insertError);
      throw new Error('Failed to store payment record');
    }

    console.log('Payment record stored successfully');

    // Return order details for frontend
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: plan.amount,
          currency: plan.currency,
          credits: plan.credits,
          key_id: razorpayKeyId // Safe to expose
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Create payment order error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create payment order',
        details: error.stack || 'No stack trace available'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});