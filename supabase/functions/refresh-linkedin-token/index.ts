
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Encryption utilities
const ENCRYPTION_KEY = 'linkedin-posts-app-2024';

const decryptData = (encryptedData: string): string => {
  try {
    const data = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(
        data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return decrypted;
  } catch {
    return encryptedData;
  }
};

const encryptData = (data: string): string => {
  try {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return btoa(encrypted);
  } catch {
    return data;
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()
    
    console.log('Refreshing LinkedIn token for user:', userId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current token data
    const { data: tokenData, error: fetchError } = await supabase
      .from('linkedin_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single()

    if (fetchError || !tokenData?.refresh_token) {
      console.error('No refresh token found:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No refresh token available' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt the refresh token
    const decryptedRefreshToken = decryptData(tokenData.refresh_token)

    // Get LinkedIn app credentials from environment
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('LinkedIn credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LinkedIn credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Refresh the access token using LinkedIn API
    const refreshResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      console.error('LinkedIn token refresh failed:', refreshResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to refresh LinkedIn token' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const refreshData = await refreshResponse.json()
    console.log('LinkedIn token refreshed successfully')

    // Encrypt the new tokens
    const encryptedAccessToken = encryptData(refreshData.access_token)
    const encryptedRefreshToken = refreshData.refresh_token ? 
      encryptData(refreshData.refresh_token) : tokenData.refresh_token // Keep old refresh token if new one not provided

    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + (refreshData.expires_in * 1000))

    // Update the tokens in database
    const { error: updateError } = await supabase
      .from('linkedin_tokens')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating tokens:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save refreshed tokens' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('LinkedIn tokens updated successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in refresh-linkedin-token:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
