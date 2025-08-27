
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
    const { userId, access_token, refresh_token, expires_in, scope } = await req.json()
    
    console.log('Saving LinkedIn tokens for user:', userId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to fetch LinkedIn member ID using the profile API
    let memberId = null;
    
    console.log('Fetching LinkedIn member ID...')
    
    try {
      // Try the userinfo endpoint first (works with openid scope)
      let profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        // Fallback to people endpoint with lite profile
        profileResponse = await fetch('https://api.linkedin.com/v2/people/(id~)', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('LinkedIn profile response:', profileData);
        
        // Extract member ID from the response
        if (profileData.sub) {
          // From userinfo endpoint - sub contains the member ID
          memberId = profileData.sub;
        } else if (profileData.id) {
          // From people endpoint - id contains the member ID
          memberId = profileData.id;
        }
        
        console.log('Extracted member ID:', memberId);
      } else {
        const errorText = await profileResponse.text();
        console.error('Failed to fetch LinkedIn profile:', profileResponse.status, errorText);
      }
    } catch (profileError) {
      console.error('Error fetching LinkedIn profile:', profileError);
    }

    // If we couldn't get the member ID from the API, generate a fallback
    // This should not happen with proper scopes, but provides a backup
    if (!memberId) {
      console.log('Could not fetch member ID from LinkedIn API, using user ID as fallback');
      memberId = userId; // Use the Supabase user ID as fallback
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000))

    // Save or update the LinkedIn tokens with member_id
    const { error } = await supabase
      .from('linkedin_tokens')
      .upsert({
        user_id: userId,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt.toISOString(),
        person_urn: `urn:li:person:${userId}`,
        member_id: memberId,
        scope: scope
      })

    if (error) {
      console.error('Error saving LinkedIn tokens:', error)
      throw error
    }

    console.log('LinkedIn tokens saved successfully with member_id:', memberId)

    return new Response(
      JSON.stringify({ success: true, member_id: memberId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in save-linkedin-tokens:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
