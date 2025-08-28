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

    // Always use UGC API with person URN format
    const authorUrn = `urn:li:person:${tokenData.member_id}`;
    const apiEndpoint = 'ugc';
    
    console.log('Using UGC API with person URN:', authorUrn);

    // Prepare webhook payload for n8n
    const webhookPayload = {
      postText: content,
      linkedinToken: tokenData.access_token,
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
      hasLinkedinToken: !!tokenData.access_token,
      hasMemberId: !!tokenData.member_id,
      memberId: tokenData.member_id,
      linkedinAuthorUrn: authorUrn,
      apiEndpoint: apiEndpoint
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
          authorUrn: authorUrn
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
