
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

    const { postId, audioFile } = await req.json()

    // Update post status to generating
    await supabase
      .from('posts')
      .update({ status: 'generating' })
      .eq('id', postId)

    // Call n8n webhook to generate post
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('postId', postId)

    const response = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (response.ok) {
      // Update post with generated content
      await supabase
        .from('posts')
        .update({ 
          content: result.content,
          status: 'generated'
        })
        .eq('id', postId)

      return new Response(
        JSON.stringify({ success: true, content: result.content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Failed to generate post')
    }

  } catch (error) {
    console.error('Error generating post:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
