
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// More aggressive timeout calculation for large files
function calculateTimeout(audioFileSizeKB: number): number {
  console.log(`Calculating timeout for audio file size: ${audioFileSizeKB} KB`);
  
  // Base timeout of 5 minutes for small files
  let timeoutSeconds = 300;
  
  // For files larger than 1MB, increase timeout significantly
  if (audioFileSizeKB > 1024) {
    // Estimate 2 minutes per MB for processing
    const sizeMB = audioFileSizeKB / 1024;
    timeoutSeconds = Math.max(300, sizeMB * 120);
  }
  
  // Maximum 20 minutes for very large files
  timeoutSeconds = Math.min(1200, timeoutSeconds);
  
  console.log(`Calculated timeout: ${timeoutSeconds} seconds (${timeoutSeconds/60} minutes) for ${audioFileSizeKB} KB file`);
  return timeoutSeconds * 1000;
}

// Process large audio in chunks if needed - FIXED validation logic
function processAudioData(audioFile: string): { success: boolean; data?: string; error?: string } {
  try {
    console.log(`Processing audio data of length: ${audioFile.length} characters`);
    
    // Check if the audio data is too large for memory processing
    // Base64 encoding increases size by ~33%, so actual file size = base64_length * 3/4
    const estimatedSizeKB = (audioFile.length * 3) / (4 * 1024);
    const estimatedSizeMB = estimatedSizeKB / 1024;
    console.log(`Estimated audio size: ${estimatedSizeKB} KB (${estimatedSizeMB.toFixed(2)} MB)`);
    
    // FIXED: Use 15MB limit correctly (15 * 1024 KB = 15360 KB)
    const maxSizeKB = 15 * 1024; // 15MB in KB
    if (estimatedSizeKB > maxSizeKB) {
      return {
        success: false,
        error: `Audio file too large (${estimatedSizeMB.toFixed(1)}MB). Please use files smaller than 15MB or shorter recordings.`
      };
    }
    
    // Validate base64 format
    if (!audioFile || typeof audioFile !== 'string') {
      return {
        success: false,
        error: 'Invalid audio data format'
      };
    }
    
    // Additional validation for very small files (likely corrupted)
    if (estimatedSizeKB < 1) {
      return {
        success: false,
        error: 'Audio file appears to be corrupted or too small'
      };
    }
    
    console.log(`Audio validation passed: ${estimatedSizeMB.toFixed(2)}MB file (under ${maxSizeKB/1024}MB limit)`);
    
    return {
      success: true,
      data: audioFile
    };
  } catch (error) {
    console.error('Error processing audio data:', error);
    return {
      success: false,
      error: `Failed to process audio data: ${error.message}`
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let requestData: any = null;
  let postId: string | null = null;
  
  try {
    console.log('=== Generate post function started ===')
    const requestStartTime = Date.now();
    
    requestData = await req.json()
    postId = requestData.postId;
    
    console.log('Request received:', {
      postId: requestData.postId,
      audioFileName: requestData.audioFileName,
      audioFileLength: requestData.audioFile ? requestData.audioFile.length : 0,
      language: requestData.language || 'en-US',
      userId: requestData.userId,
      timestamp: new Date().toISOString()
    });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { postId: pid, audioFile, audioFileName, language, userId } = requestData

    // Validate required parameters
    if (!pid || !audioFile || !userId) {
      const missingFields = [];
      if (!pid) missingFields.push('postId');
      if (!audioFile) missingFields.push('audioFile');
      if (!userId) missingFields.push('userId');
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Process and validate audio data - FIXED
    console.log('Processing audio data...');
    const audioProcessResult = processAudioData(audioFile);
    if (!audioProcessResult.success) {
      console.error('Audio processing failed:', audioProcessResult.error);
      throw new Error(audioProcessResult.error);
    }

    const estimatedSizeKB = (audioFile.length * 3) / (4 * 1024);
    const estimatedSizeMB = estimatedSizeKB / 1024;
    console.log('Audio validation passed:', {
      originalLength: audioFile.length,
      estimatedSizeKB: Math.round(estimatedSizeKB),
      estimatedSizeMB: estimatedSizeMB.toFixed(2),
      fileName: audioFileName || 'unknown'
    });

    // Clean up stuck posts before processing
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    console.log('Cleaning up stuck posts older than:', tenMinutesAgo);
    
    try {
      const { error: cleanupError } = await supabase
        .from('posts')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'generating')
        .lt('created_at', tenMinutesAgo);

      if (cleanupError) {
        console.error('Cleanup error (non-critical):', cleanupError);
      } else {
        console.log('Cleanup completed successfully');
      }
    } catch (cleanupErr) {
      console.error('Cleanup failed (continuing anyway):', cleanupErr);
    }

    // Update post status
    console.log('Updating post status to generating...');
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        status: 'generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', pid);

    if (updateError) {
      console.error('Error updating post status:', updateError);
      throw new Error(`Failed to update post status: ${updateError.message}`);
    }

    // Fetch and validate LinkedIn token
    console.log('Fetching LinkedIn token for user:', userId);
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_tokens')
      .select('access_token, expires_at, person_urn')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      console.error('LinkedIn token fetch failed:', tokenError);
      throw new Error('LinkedIn authentication required. Please reconnect your LinkedIn account.');
    }

    // Check token expiration with buffer
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    const bufferMinutes = 5;
    const expirationBuffer = new Date(expiresAt.getTime() - bufferMinutes * 60 * 1000);
    
    if (now >= expirationBuffer) {
      console.error('LinkedIn token expired or expiring soon:', {
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        expiringSoon: now >= expirationBuffer
      });
      throw new Error('LinkedIn token expired. Please reconnect your LinkedIn account.');
    }

    console.log('LinkedIn token validated successfully');

    // Calculate dynamic timeout and prepare webhook payload
    const timeoutDuration = calculateTimeout(estimatedSizeKB);
    const webhookPayload = {
      postId: pid,
      audioFile: audioFile,
      audioFileName: audioFileName || 'recording.wav',
      language: language || 'en-US',
      linkedinToken: tokenData.access_token,
      linkedin_person_urn: tokenData.person_urn,
      processingTimeout: Math.floor(timeoutDuration / 1000) // Send timeout to N8N
    };

    console.log('=== Calling N8N webhook ===', {
      postId: pid,
      audioFileName: audioFileName || 'recording.wav',
      estimatedSizeKB: Math.round(estimatedSizeKB),
      estimatedSizeMB: estimatedSizeMB.toFixed(2),
      timeoutMinutes: Math.round(timeoutDuration / (1000 * 60)),
      language: language || 'en-US',
      hasLinkedinToken: !!tokenData.access_token,
      webhookUrl: 'https://n8n.srv930949.hstgr.cloud/webhook/generate-post',
      requestId: `req-${Date.now()}`
    });

    // Create timeout controller with enhanced error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`=== REQUEST TIMEOUT ===`, {
        timeoutDuration: timeoutDuration / 1000,
        audioSize: Math.round(estimatedSizeKB),
        postId: pid,
        elapsedTime: (Date.now() - requestStartTime) / 1000
      });
      controller.abort();
    }, timeoutDuration);

    try {
      console.log('Making webhook request...');
      const webhookResponse = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `lovable-${pid}`,
          'X-Audio-Size': Math.round(estimatedSizeKB).toString(),
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const processingTime = (Date.now() - requestStartTime) / 1000;
      console.log(`=== N8N Response Received ===`, {
        status: webhookResponse.status,
        processingTime: Math.round(processingTime),
        contentType: webhookResponse.headers.get('content-type'),
        contentLength: webhookResponse.headers.get('content-length')
      });
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('N8N webhook failed:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          errorBody: errorText.substring(0, 500),
          processingTime: Math.round(processingTime)
        });
        
        throw new Error(`Content generation service failed (${webhookResponse.status}): ${errorText || webhookResponse.statusText}`);
      }

      // Parse response with better error handling
      let webhookResult;
      try {
        const responseText = await webhookResponse.text();
        console.log('N8N response details:', {
          responseLength: responseText.length,
          processingTime: Math.round(processingTime),
          responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
          isValidJson: (() => {
            try { JSON.parse(responseText); return true; } catch { return false; }
          })()
        });
        
        if (!responseText.trim()) {
          throw new Error('Empty response from content generation service');
        }
        
        webhookResult = JSON.parse(responseText);
        console.log('Parsed response structure:', {
          hasContent: !!webhookResult.content,
          hasOutput: !!webhookResult.output,
          hasError: !!webhookResult.error,
          isString: typeof webhookResult === 'string',
          keys: typeof webhookResult === 'object' ? Object.keys(webhookResult || {}) : []
        });
      } catch (parseError) {
        console.error('Failed to parse N8N response:', {
          parseError: parseError.message,
          processingTime: Math.round(processingTime)
        });
        throw new Error(`Invalid response format from content generation service: ${parseError.message}`);
      }

      // Extract content with better fallback handling
      let generatedContent = null;
      
      if (webhookResult?.content) {
        generatedContent = webhookResult.content;
      } else if (webhookResult?.output) {
        generatedContent = webhookResult.output;
      } else if (typeof webhookResult === 'string' && webhookResult.trim().length > 10) {
        generatedContent = webhookResult;
      } else if (webhookResult?.error) {
        throw new Error(`Content generation failed: ${webhookResult.error}`);
      }
      
      console.log('Content extraction result:', {
        contentFound: !!generatedContent,
        contentLength: generatedContent ? generatedContent.length : 0,
        contentPreview: generatedContent ? generatedContent.substring(0, 100) : null,
        totalProcessingTime: Math.round(processingTime)
      });
      
      if (!generatedContent || generatedContent.trim().length < 10) {
        console.error('No meaningful content generated');
        throw new Error('Content generation service returned no meaningful content');
      }

      // Update post with generated content
      console.log('Updating post with generated content...');
      const { error: contentError } = await supabase
        .from('posts')
        .update({ 
          content: generatedContent.trim(),
          status: 'generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', pid);

      if (contentError) {
        console.error('Error updating post content:', contentError);
        throw new Error(`Failed to save generated content: ${contentError.message}`);
      }

      console.log('=== SUCCESS ===', {
        postId: pid,
        contentLength: generatedContent.length,
        totalProcessingTime: Math.round(processingTime),
        audioSize: Math.round(estimatedSizeKB)
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          content: generatedContent.trim(),
          postId: pid,
          processingTime: Math.round(processingTime),
          audioSize: Math.round(estimatedSizeKB)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        const timeoutMinutes = Math.round(timeoutDuration / (1000 * 60));
        const elapsedMinutes = Math.round((Date.now() - requestStartTime) / (1000 * 60));
        
        console.error(`=== TIMEOUT ERROR ===`, {
          timeoutMinutes,
          elapsedMinutes,
          audioSize: Math.round(estimatedSizeKB),
          postId: pid
        });
        
        throw new Error(`Processing timed out after ${timeoutMinutes} minutes. Large audio files (${Math.round(estimatedSizeKB)} KB) need more processing time. Try using shorter audio segments (under 5 minutes each) for faster processing.`);
      }
      
      console.error('Network error calling N8N:', {
        errorName: fetchError.name,
        errorMessage: fetchError.message,
        audioSize: Math.round(estimatedSizeKB),
        postId: pid
      });
      
      throw new Error(`Network error: ${fetchError.message}. Please check your internet connection and try again.`);
    }

  } catch (error) {
    const errorDetails = {
      errorMessage: error.message,
      errorName: error.name,
      postId: postId || requestData?.postId,
      audioSize: requestData?.audioFile ? Math.round((requestData.audioFile.length * 3) / (4 * 1024)) : null,
      timestamp: new Date().toISOString()
    };
    
    console.error('=== GENERATE POST ERROR ===', errorDetails);
    
    // Update post status to failed if we have a postId
    if (postId || requestData?.postId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('posts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', postId || requestData.postId);
          
        console.log('Updated post status to failed');
      } catch (updateError) {
        console.error('Error updating failed status:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
