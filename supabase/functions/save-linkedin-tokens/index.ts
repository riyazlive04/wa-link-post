
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, access_token, refresh_token, expires_in, person_urn, scope } = await req.json()

    console.log('Saving LinkedIn tokens for user:', userId)

    // Fetch LinkedIn member ID using the People API
    let memberId = null;
    try {
      console.log('Fetching LinkedIn member ID...')
      const profileResponse = await fetch('https://api.linkedin.com/v2/people/(id~)', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        // Extract numeric ID from the response
        if (profileData.id) {
          memberId = profileData.id;
          console.log('Successfully fetched LinkedIn member ID:', memberId);
        } else {
          console.warn('No member ID found in LinkedIn profile response');
        }
      } else {
        console.error('Failed to fetch LinkedIn profile:', profileResponse.status, await profileResponse.text());
      }
    } catch (error) {
      console.error('Error fetching LinkedIn member ID:', error);
      // Continue without member_id - we'll handle this in publish-post
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString()

    // Upsert LinkedIn tokens including member_id
    const { error } = await supabase
      .from('linkedin_tokens')
      .upsert({
        user_id: userId,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt,
        person_urn: person_urn,
        member_id: memberId,
        scope: scope,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving LinkedIn tokens:', error)
      throw error
    }

    console.log('LinkedIn tokens saved successfully with member_id:', memberId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in save-linkedin-tokens function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
