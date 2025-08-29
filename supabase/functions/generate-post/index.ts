
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Calculate timeout based on audio file size and estimated duration
function calculateTimeout(audioFileSizeKB: number): number {
  // Base timeout of 3 minutes
  let timeoutSeconds = 180;
  
  // Estimate audio duration: assume ~1KB per second of audio (rough estimate for webm)
  const estimatedDurationSeconds = audioFileSizeKB / 1;
  
  console.log(`Estimated audio duration: ${estimatedDurationSeconds} seconds`);
  
  // Processing time estimation:
  // - Transcription: ~0.1x realtime (very fast with Whisper)
  // - Content generation: ~30-60 seconds regardless of audio length
  // - Safety buffer: 2x multiplier
  const processingTimeSeconds = (estimatedDurationSeconds * 0.1) + 60;
  const totalTimeoutSeconds = processingTimeSeconds * 2;
  
  // Minimum 3 minutes, maximum 15 minutes
  timeoutSeconds = Math.max(180, Math.min(900, totalTimeoutSeconds));
  
  console.log(`Calculated timeout: ${timeoutSeconds} seconds (${timeoutSeconds/60} minutes)`);
  return timeoutSeconds * 1000; // Convert to milliseconds
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let requestData: any = null;
  
  try {
    console.log('Generate post function started')
    
    requestData = await req.json()
    console.log('Parsed request data:', {
      postId: requestData.postId,
      audioFileName: requestData.audioFileName,
      audioFilePresent: !!requestData.audioFile,
      audioFileLength: requestData.audioFile ? requestData.audioFile.length : 0,
      language: requestData.language || 'en-US',
      userId: requestData.userId
    })
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { postId, audioFile, audioFileName, language, userId } = requestData

    if (!postId) {
      throw new Error('postId is required')
    }

    if (!audioFile) {
      throw new Error('audioFile is required')
    }

    if (!userId) {
      throw new Error('userId is required')
    }

    const estimatedSizeKB = (audioFile.length * 3) / (4 * 1024)
    console.log('Audio file analysis:', {
      base64Length: audioFile.length,
      estimatedSizeKB: estimatedSizeKB,
      fileName: audioFileName
    })
    
    if (estimatedSizeKB > 10240) {
      throw new Error('Audio file too large. Please use a shorter recording (max 10MB).')
    }

    // Clean up stuck posts
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    console.log('Cleaning up stuck posts older than:', tenMinutesAgo)
    
    const { error: cleanupError } = await supabase
      .from('posts')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'generating')
      .lt('created_at', tenMinutesAgo)

    if (cleanupError) {
      console.error('Error cleaning up stuck posts:', cleanupError)
    } else {
      console.log('Cleaned up stuck posts successfully')
    }

    // Update post status
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

    // Fetch LinkedIn token
    console.log('Fetching LinkedIn token for user:', userId)
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_tokens')
      .select('access_token, expires_at, person_urn')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      console.error('No LinkedIn tokens found for user:', userId)
      throw new Error('LinkedIn authentication required. Please connect your LinkedIn account.')
    }

    // Check token expiration
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now >= expiresAt) {
      console.error('LinkedIn token expired for user:', userId)
      throw new Error('LinkedIn token expired. Please reconnect your LinkedIn account.')
    }

    console.log('LinkedIn token retrieved successfully')

    // Prepare webhook payload
    const webhookPayload = {
      postId: postId,
      audioFile: audioFile,
      audioFileName: audioFileName || 'recording.wav',
      language: language || 'en-US',
      linkedinToken: tokenData.access_token,
      linkedin_person_urn: tokenData.person_urn
    }

    // Calculate dynamic timeout
    const timeoutDuration = calculateTimeout(estimatedSizeKB);

    console.log('Calling n8n webhook with enhanced configuration:', {
      postId,
      audioFileName: audioFileName || 'recording.wav',
      audioFileSize: audioFile.length,
      estimatedSizeKB: estimatedSizeKB,
      timeoutMinutes: timeoutDuration / (1000 * 60),
      language: language || 'en-US',
      hasLinkedinToken: !!tokenData.access_token,
      hasPersonUrn: !!tokenData.person_urn,
      webhookUrl: 'https://n8n.srv930949.hstgr.cloud/webhook/generate-post'
    })

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Request timed out after ${timeoutDuration/1000} seconds`);
      controller.abort();
    }, timeoutDuration);

    try {
      const requestStartTime = Date.now();
      
      // Call n8n webhook
      const webhookResponse = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      })

      clearTimeout(timeoutId);
      
      const processingTime = (Date.now() - requestStartTime) / 1000;
      console.log(`N8N webhook completed in ${processingTime} seconds`);
      console.log('N8N webhook response status:', webhookResponse.status)
      console.log('N8N webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()))
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error('N8N webhook failed:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          errorText: errorText,
          processingTime: processingTime
        })
        throw new Error(`N8N webhook failed: ${webhookResponse.status} - ${errorText}`)
      }

      // Parse response
      let webhookResult;
      try {
        const responseText = await webhookResponse.text();
        console.log('N8N response details:', {
          responseLength: responseText.length,
          processingTime: processingTime,
          responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
        });
        
        if (!responseText.trim()) {
          throw new Error('Empty response from n8n webhook');
        }
        
        webhookResult = JSON.parse(responseText);
        console.log('N8N parsed response structure:', {
          hasContent: !!webhookResult.content,
          hasOutput: !!webhookResult.output,
          isString: typeof webhookResult === 'string',
          keys: Object.keys(webhookResult || {})
        });
      } catch (parseError) {
        console.error('Failed to parse n8n response:', {
          parseError: parseError.message,
          processingTime: processingTime
        });
        throw new Error('Invalid JSON response from content generation service');
      }

      // Extract content
      let generatedContent = null;
      
      if (webhookResult?.content) {
        generatedContent = webhookResult.content;
      } else if (webhookResult?.output) {
        generatedContent = webhookResult.output;
      } else if (typeof webhookResult === 'string') {
        generatedContent = webhookResult;
      }
      
      console.log('Content extraction result:', {
        contentFound: !!generatedContent,
        contentLength: generatedContent ? generatedContent.length : 0,
        processingTime: processingTime
      });
      
      if (generatedContent) {
        console.log('Updating post with generated content...')
        
        // Update post with content
        const { error: contentError } = await supabase
          .from('posts')
          .update({ 
            content: generatedContent,
            status: 'generated',
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)

        if (contentError) {
          console.error('Error updating post content:', contentError)
          throw contentError
        }

        console.log('Post updated successfully:', {
          postId: postId,
          contentLength: generatedContent.length,
          totalProcessingTime: processingTime
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            content: generatedContent,
            postId: postId,
            processingTime: processingTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.error('No content found in n8n response after processing')
        throw new Error('Content generation service returned no content')
      }
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        const timeoutMinutes = Math.round(timeoutDuration / (1000 * 60));
        console.error(`N8N webhook request timed out after ${timeoutMinutes} minutes for audio file:`, {
          fileName: audioFileName,
          sizeKB: estimatedSizeKB,
          timeoutUsed: timeoutMinutes
        });
        throw new Error(`Processing timed out after ${timeoutMinutes} minutes. This may happen with very long audio files. Try breaking your audio into shorter segments (under 5 minutes each).`);
      }
      
      console.error('Network/fetch error when calling n8n webhook:', {
        errorName: fetchError.name,
        errorMessage: fetchError.message,
        audioSize: estimatedSizeKB
      });
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in generate-post function:', {
      errorMessage: error.message,
      errorStack: error.stack,
      postId: requestData?.postId,
      audioSize: requestData?.audioFile ? (requestData.audioFile.length * 3) / (4 * 1024) : null
    });
    
    // Update post status to failed
    if (requestData?.postId) {
      try {
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
          .eq('id', requestData.postId)
          
        console.log('Updated post status to failed for postId:', requestData.postId)
      } catch (updateError) {
        console.error('Error updating failed status:', updateError)
      }
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
