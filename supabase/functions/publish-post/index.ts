
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Encryption utilities (copied from src/utils/encryption.ts since edge functions can't import from src)
const ENCRYPTION_KEY = 'linkedin-posts-app-2024'; // In production, this should be from environment

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
    return encryptedData; // Fallback to original if decryption fails
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

  let requestBody: any = null;
  
  try {
    requestBody = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, postId, content } = requestBody

    console.log('Publishing post for user:', userId)

    // Get LinkedIn tokens for the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_tokens')
      .select('access_token, expires_at, person_urn, member_id')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      console.error('No LinkedIn tokens found for user:', userId)
      throw new Error('LinkedIn authentication required. Please connect your LinkedIn account.')
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now >= expiresAt) {
      console.error('LinkedIn token expired for user:', userId)
      throw new Error('LinkedIn token expired. Please reconnect your LinkedIn account.')
    }

    // Update post status to publishing
    await supabase
      .from('posts')
      .update({ status: 'publishing' })
      .eq('id', postId)

    // Decrypt the access token before use
    const decryptedAccessToken = decryptData(tokenData.access_token);
    console.log('Decrypted access token for API use');

    // Always use UGC API with person URN format
    const authorUrn = `urn:li:person:${tokenData.member_id}`;
    const apiEndpoint = 'ugc';
    
    console.log('Using UGC API with person URN:', authorUrn);

    // Prepare webhook payload for n8n with decrypted token
    const webhookPayload = {
      postText: content,
      linkedinToken: decryptedAccessToken, // Use decrypted token here
      linkedinAuthorUrn: authorUrn,
      apiEndpoint: apiEndpoint,
      memberIdToUse: tokenData.member_id,
      // Keep backward compatibility
      linkedin_person_urn: tokenData.person_urn,
      linkedinMemberId: tokenData.member_id
    }

    console.log('Calling n8n publish webhook with payload:', {
      postId,
      hasContent: !!content,
      hasLinkedinToken: !!decryptedAccessToken,
      hasMemberId: !!tokenData.member_id,
      memberId: tokenData.member_id,
      linkedinAuthorUrn: authorUrn,
      apiEndpoint: apiEndpoint
    })

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout for publish

    try {
      // Call n8n webhook
      const webhookResponse = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/publish-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      })

      clearTimeout(timeoutId);

      console.log('n8n webhook response status:', webhookResponse.status)

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error('n8n webhook error:', errorText)
        throw new Error(`n8n webhook failed: ${webhookResponse.status} - ${errorText}`)
      }

      const webhookResult = await webhookResponse.json()
      console.log('n8n webhook response:', webhookResult)

      if (webhookResult.success) {
        // Store the actual LinkedIn post URL
        const linkedinPostUrl = webhookResult.postUrl || webhookResult.linkedinPostUrl || webhookResult.url;
        
        await supabase
          .from('posts')
          .update({ 
            linkedin_post_id: linkedinPostUrl || 'published',
            status: 'published'
          })
          .eq('id', postId)

        return new Response(
          JSON.stringify({ 
            success: true, 
            postUrl: linkedinPostUrl,
            linkedinPostId: webhookResult.linkedinPostId || webhookResult.id,
            usedApiEndpoint: apiEndpoint,
            authorUrn: authorUrn
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else {
        throw new Error(webhookResult?.error || 'Failed to publish post to LinkedIn')
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Publish webhook request timed out')
        throw new Error('Publish request timed out - please try again')
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Error publishing post:', error)
    
    // Update status to failed if we have the necessary data
    if (requestBody?.postId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('id', requestBody.postId)
      } catch (updateError) {
        console.error('Error updating failed status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
