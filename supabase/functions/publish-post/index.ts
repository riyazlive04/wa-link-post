
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

    const { userId, postId, content } = await req.json()

    console.log('Publishing post for user:', userId)

    // Get LinkedIn tokens for the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_tokens')
      .select('access_token, expires_at')
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

    // Prepare LinkedIn post data
    const postData = {
      author: tokenData.person_urn || 'urn:li:person:unknown',
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    }

    // Post to LinkedIn
    const linkedinResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    })

    if (!linkedinResponse.ok) {
      const errorText = await linkedinResponse.text()
      console.error('LinkedIn API error:', errorText)
      throw new Error(`LinkedIn API error: ${linkedinResponse.status} ${errorText}`)
    }

    const linkedinResult = await linkedinResponse.json()
    console.log('LinkedIn post created:', linkedinResult.id)

    // Update post with LinkedIn post ID and status
    const linkedinPostUrl = `https://www.linkedin.com/feed/update/${linkedinResult.id}`
    
    await supabase
      .from('posts')
      .update({ 
        linkedin_post_id: linkedinPostUrl,
        status: 'published'
      })
      .eq('id', postId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        postUrl: linkedinPostUrl,
        linkedinPostId: linkedinResult.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error publishing post:', error)
    
    // Update status to failed if we have the necessary data
    try {
      const requestData = await req.json()
      if (requestData.postId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('id', requestData.postId)
      }
    } catch (updateError) {
      console.error('Error updating failed status:', updateError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
