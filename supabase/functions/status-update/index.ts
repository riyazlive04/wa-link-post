
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

    const { postId, status, linkedinPostId } = await req.json()

    // Update post status
    const updateData: any = { 
      status: status,
      updated_at: new Date().toISOString()
    }

    if (linkedinPostId) {
      updateData.linkedin_post_id = linkedinPostId
    }

    await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)

    // Call n8n webhook for status update
    await fetch('https://n8n.srv930949.hstgr.cloud/webhook/status-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postId: postId,
        status: status,
        linkedinPostId: linkedinPostId
      })
    })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error updating status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
