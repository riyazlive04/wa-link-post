
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
    console.log('Generate post function started')
    
    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { postId, audioFile, audioFileName } = await req.json()
    console.log('Received request for postId:', postId, 'audioFileName:', audioFileName)

    if (!postId) {
      throw new Error('postId is required')
    }

    if (!audioFile) {
      throw new Error('audioFile is required')
    }

    // Update post status to generating
    console.log('Updating post status to generating...')
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (updateError) {
      console.error('Error updating post status:', updateError)
      throw updateError
    }

    console.log('Post status updated successfully')
    console.log('Preparing to call n8n webhook...')

    // Prepare data for n8n webhook
    const webhookData = {
      postId: postId,
      audioFile: audioFile,
      audioFileName: audioFileName || 'recording.wav'
    }

    console.log('Calling n8n webhook with data:', {
      postId,
      audioFileName: audioFileName || 'recording.wav',
      audioFileSize: audioFile.length
    })

    // Call n8n webhook to generate post
    const webhookResponse = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    })

    console.log('N8N webhook response status:', webhookResponse.status)
    
    let webhookResult;
    try {
      const responseText = await webhookResponse.text();
      console.log('N8N raw response:', responseText);
      webhookResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse n8n response as JSON:', parseError);
      throw new Error('Invalid response from content generation service');
    }

    console.log('N8N parsed response:', webhookResult)

    if (webhookResponse.ok && webhookResult?.content) {
      console.log('N8N webhook successful, updating post with content...')
      
      // Update post with generated content
      const { error: contentError } = await supabase
        .from('posts')
        .update({ 
          content: webhookResult.content,
          status: 'generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)

      if (contentError) {
        console.error('Error updating post content:', contentError)
        throw contentError
      }

      console.log('Post updated successfully with generated content')

      return new Response(
        JSON.stringify({ 
          success: true, 
          content: webhookResult.content,
          postId: postId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('N8N webhook failed with status:', webhookResponse.status)
      console.error('N8N error response:', webhookResult)
      
      // Update post status to failed
      await supabase
        .from('posts')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)

      throw new Error(webhookResult?.error || `N8N webhook failed with status ${webhookResponse.status}`)
    }

  } catch (error) {
    console.error('Error in generate-post function:', error)
    
    // Try to update post status to failed if we have a postId
    try {
      const { postId } = await req.json()
      if (postId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('posts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)
      }
    } catch (updateError) {
      console.error('Error updating failed status:', updateError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
