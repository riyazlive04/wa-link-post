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

    console.log(`Checking credits for user: ${user.id}`);

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError) {
      console.error('Error checking user role:', roleError);
    }

    // Get user's available credits using the database function
    const { data: creditsData, error: creditsError } = await supabaseClient.rpc(
      'get_available_credits', 
      { user_uuid: user.id }
    );

    if (creditsError) {
      console.error('Error fetching credits:', creditsError);
      throw new Error('Failed to fetch user credits');
    }

    // Get detailed credit breakdown
    const { data: creditBreakdown, error: breakdownError } = await supabaseClient
      .from('user_credits')
      .select('total_credits, used_credits, source, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (breakdownError) {
      console.error('Error fetching credit breakdown:', breakdownError);
      // Don't throw error here, just log it
    }

    // Get recent payment history
    const { data: paymentHistory, error: historyError } = await supabaseClient
      .from('payment_history')
      .select('amount, currency, credits_purchased, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('Error fetching payment history:', historyError);
      // Don't throw error here, just log it
    }

    console.log(`User ${user.id} has ${creditsData || 0} available credits${isAdmin ? ' (admin - unlimited)' : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        available_credits: creditsData || 0,
        is_admin: isAdmin || false,
        credit_breakdown: creditBreakdown || [],
        recent_payments: paymentHistory || [],
        user_id: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Check user credits error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to check user credits',
        available_credits: 0,
        is_admin: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});