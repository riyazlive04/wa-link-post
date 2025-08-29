
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
    console.log('Cleanup stuck posts function started')
    
    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Clean up posts stuck in generating status for more than 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    
    console.log('Cleaning up posts stuck in generating status since:', fifteenMinutesAgo)
    
    const { data: stuckPosts, error: selectError } = await supabase
      .from('posts')
      .select('id, user_id, created_at, audio_file_name')
      .eq('status', 'generating')
      .lt('created_at', fifteenMinutesAgo)

    if (selectError) {
      console.error('Error selecting stuck posts:', selectError)
      throw selectError
    }

    console.log('Found stuck posts:', stuckPosts?.length || 0)

    if (stuckPosts && stuckPosts.length > 0) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .in('id', stuckPosts.map(post => post.id))

      if (updateError) {
        console.error('Error updating stuck posts:', updateError)
        throw updateError
      }

      console.log('Successfully cleaned up', stuckPosts.length, 'stuck posts')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleanedUp: stuckPosts?.length || 0,
        posts: stuckPosts || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in cleanup-stuck-posts function:', error)
    
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
