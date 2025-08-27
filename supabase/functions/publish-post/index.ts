
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

    const { postId } = await req.json()

    // Get post content
    const { data: post } = await supabase
      .from('posts')
      .select('content')
      .eq('id', postId)
      .single()

    if (!post) {
      throw new Error('Post not found')
    }

    // Update status to publishing
    await supabase
      .from('posts')
      .update({ status: 'publishing' })
      .eq('id', postId)

    // Call n8n webhook to publish post
    const response = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/publish-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: post.content,
        postId: postId
      })
    })

    const result = await response.json()

    if (response.ok) {
      // Update post with LinkedIn post ID and status
      await supabase
        .from('posts')
        .update({ 
          linkedin_post_id: result.linkedinPostId,
          status: 'published'
        })
        .eq('id', postId)

      return new Response(
        JSON.stringify({ success: true, linkedinPostId: result.linkedinPostId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Failed to publish post')
    }

  } catch (error) {
    console.error('Error publishing post:', error)
    
    // Update status to failed
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabase
      .from('posts')
      .update({ status: 'failed' })
      .eq('id', req.json().then(data => data.postId))

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
