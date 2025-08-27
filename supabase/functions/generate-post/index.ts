
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

    const { postId, audioFile, audioFileName } = await req.json()

    console.log('Received request for postId:', postId)

    // Update post status to generating
    const { error: updateError } = await supabase
      .from('posts')
      .update({ status: 'generating' })
      .eq('id', postId)

    if (updateError) {
      console.error('Error updating post status:', updateError)
      throw updateError
    }

    // Convert blob to base64 if it's not already
    let base64Audio = audioFile
    if (audioFile instanceof Blob) {
      const arrayBuffer = await audioFile.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      base64Audio = btoa(String.fromCharCode.apply(null, uint8Array))
    }

    console.log('Calling n8n webhook for post generation')

    // Call n8n webhook to generate post
    const formData = new FormData()
    formData.append('audio', base64Audio)
    formData.append('postId', postId)
    formData.append('audioFileName', audioFileName || 'recording.wav')

    const response = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
      method: 'POST',
      body: formData
    })

    console.log('N8N response status:', response.status)
    const result = await response.json()
    console.log('N8N response data:', result)

    if (response.ok && result.content) {
      // Update post with generated content
      const { error: contentError } = await supabase
        .from('posts')
        .update({ 
          content: result.content,
          status: 'generated'
        })
        .eq('id', postId)

      if (contentError) {
        console.error('Error updating post content:', contentError)
        throw contentError
      }

      return new Response(
        JSON.stringify({ success: true, content: result.content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('N8N webhook failed:', result)
      
      // Update post status to failed
      await supabase
        .from('posts')
        .update({ status: 'failed' })
        .eq('id', postId)

      throw new Error(result.error || 'Failed to generate post')
    }

  } catch (error) {
    console.error('Error generating post:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
