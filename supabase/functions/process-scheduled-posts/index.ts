import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting process-scheduled-posts function');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find posts that are scheduled and due for publishing
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10); // Process up to 10 posts at a time

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledPosts?.length || 0} scheduled posts to process`);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No scheduled posts to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    const results = [];

    for (const post of scheduledPosts) {
      try {
        console.log(`Processing post ${post.id} scheduled for ${post.scheduled_at}`);
        
        // Update status to 'publishing' to prevent duplicate processing
        await supabase
          .from('posts')
          .update({ status: 'publishing', updated_at: new Date().toISOString() })
          .eq('id', post.id);

        // Call the publish-post function
        const { data: publishResult, error: publishError } = await supabase.functions.invoke(
          'publish-post',
          {
            body: {
              userId: post.user_id,
              postId: post.id,
              content: post.content,
              imageUrl: post.image_url,
            },
          }
        );

        if (publishError) {
          console.error(`Error publishing post ${post.id}:`, publishError);
          // Update status back to 'failed' if publishing failed
          await supabase
            .from('posts')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', post.id);
          
          results.push({ postId: post.id, status: 'failed', error: publishError.message });
        } else {
          console.log(`Successfully triggered publishing for post ${post.id}`);
          processedCount++;
          results.push({ postId: post.id, status: 'processing' });
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        // Update status to 'failed' if there was an error
        await supabase
          .from('posts')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', post.id);
        
        results.push({ postId: post.id, status: 'failed', error: error.message });
      }
    }

    console.log(`Processed ${processedCount} posts successfully`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} scheduled posts`,
        processed: processedCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-scheduled-posts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});