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

  let requestBody: any = null;
  
  try {
    requestBody = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, postId, content } = requestBody

    console.log('Publishing post for user:', userId)

    // Get LinkedIn tokens for the user - include both member IDs
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_tokens')
      .select('access_token, expires_at, person_urn, member_id, legacy_member_id')
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

    // Determine which member ID to use and API endpoint
    let authorUrn;
    let apiEndpoint = 'ugc'; // Default to UGC API which works with numeric IDs
    let memberIdToUse = tokenData.member_id;
    
    // Prioritize scraped numeric member ID for UGC API
    if (tokenData.legacy_member_id && tokenData.legacy_member_id !== null) {
      authorUrn = `urn:li:member:${tokenData.legacy_member_id}`;
      memberIdToUse = tokenData.legacy_member_id;
      apiEndpoint = 'ugc';
      console.log('Using scraped numeric member ID for UGC API:', tokenData.legacy_member_id);
    } else {
      // Fall back to shares API with alphanumeric member ID
      authorUrn = `urn:li:member:${tokenData.member_id}`;
      memberIdToUse = tokenData.member_id;
      apiEndpoint = 'shares';
      console.log('Using alphanumeric member ID with shares API:', tokenData.member_id);
    }

    // Prepare webhook payload
    const webhookPayload = {
      postText: content,
      linkedinToken: tokenData.access_token,
      linkedinAuthorUrn: authorUrn,
      apiEndpoint: apiEndpoint,
      memberIdToUse: memberIdToUse,
      // Keep backward compatibility
      linkedin_person_urn: tokenData.person_urn,
      linkedinMemberId: tokenData.member_id,
      legacyMemberId: tokenData.legacy_member_id || undefined,
      // Additional context for n8n
      isNumericMemberId: !!(tokenData.legacy_member_id && tokenData.legacy_member_id !== null)
    }

    console.log('Calling n8n publish webhook with payload:', {
      postId,
      hasContent: !!content,
      hasLinkedinToken: !!tokenData.access_token,
      hasMemberId: !!tokenData.member_id,
      hasScrapedLegacyMemberId: !!(tokenData.legacy_member_id && tokenData.legacy_member_id !== null),
      memberId: tokenData.member_id,
      scrapedLegacyMemberId: tokenData.legacy_member_id,
      memberIdToUse: memberIdToUse,
      linkedinAuthorUrn: authorUrn,
      apiEndpoint: apiEndpoint,
      isNumericMemberId: !!(tokenData.legacy_member_id && tokenData.legacy_member_id !== null)
    })

    // Call n8n webhook
    const webhookResponse = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/publish-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    })

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
          usedScrapedId: !!(tokenData.legacy_member_id && tokenData.legacy_member_id !== null)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      throw new Error(webhookResult?.error || 'Failed to publish post to LinkedIn')
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
