
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Precise byte-based size validation
function validateAudioSize(base64Data: string): { valid: boolean; sizeBytes: number; sizeMB: number; error?: string } {
  try {
    console.log(`Validating audio data of ${base64Data.length} base64 characters`);
    
    // Calculate actual byte size from base64
    // Remove padding and calculate precise bytes
    const paddingChars = (base64Data.match(/=/g) || []).length;
    const sizeBytes = Math.floor((base64Data.length * 3) / 4) - paddingChars;
    const sizeMB = sizeBytes / (1024 * 1024);
    
    console.log(`Precise audio size: ${sizeBytes} bytes (${sizeMB.toFixed(3)} MB)`);
    
    // 15MB limit in bytes
    const maxSizeBytes = 15 * 1024 * 1024;
    
    if (sizeBytes > maxSizeBytes) {
      return {
        valid: false,
        sizeBytes,
        sizeMB,
        error: `Audio file too large: ${sizeMB.toFixed(1)}MB exceeds 15MB limit`
      };
    }
    
    if (sizeBytes < 1024) { // Less than 1KB is likely corrupted
      return {
        valid: false,
        sizeBytes,
        sizeMB,
        error: 'Audio file too small or corrupted'
      };
    }
    
    return { valid: true, sizeBytes, sizeMB };
    
  } catch (error) {
    console.error('Size validation error:', error);
    return {
      valid: false,
      sizeBytes: 0,
      sizeMB: 0,
      error: `Size validation failed: ${error.message}`
    };
  }
}

// Background processing function
async function processAudioInBackground(postId: string, audioFile: string, audioFileName: string, language: string, linkedinToken: string, personUrn: string) {
  console.log(`=== Background processing started for post ${postId} ===`);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  try {
    // Update status to processing
    await supabase
      .from('posts')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    // Validate audio size
    const sizeValidation = validateAudioSize(audioFile);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    console.log(`Processing ${sizeValidation.sizeMB.toFixed(2)}MB audio file`);

    // Prepare multipart form data for N8N
    const formData = new FormData();
    
    // Convert base64 to blob for multipart upload
    const binaryData = Uint8Array.from(atob(audioFile), c => c.charCodeAt(0));
    const audioBlob = new Blob([binaryData], { type: 'audio/webm' });
    
    formData.append('audioFile', audioBlob, audioFileName || 'recording.webm');
    formData.append('postId', postId);
    formData.append('language', language || 'en-US');
    formData.append('linkedinToken', linkedinToken);
    formData.append('linkedin_person_urn', personUrn);

    console.log(`Sending multipart request to N8N for ${sizeValidation.sizeMB.toFixed(2)}MB file`);

    // Call N8N with multipart data (no timeout on background task)
    const webhookResponse = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Request-ID': `bg-${postId}`,
        'X-Audio-Size-MB': sizeValidation.sizeMB.toFixed(3),
      }
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('N8N webhook failed:', {
        status: webhookResponse.status,
        error: errorText.substring(0, 500)
      });
      throw new Error(`Content generation failed: ${errorText || webhookResponse.statusText}`);
    }

    // Parse response
    const responseText = await webhookResponse.text();
    console.log(`N8N response received: ${responseText.length} characters`);
    
    let webhookResult;
    try {
      webhookResult = JSON.parse(responseText);
    } catch {
      // If not JSON, treat as plain text content
      webhookResult = { content: responseText };
    }

    // Extract content
    let generatedContent = webhookResult?.content || webhookResult?.output || responseText;
    
    if (!generatedContent || generatedContent.trim().length < 10) {
      throw new Error('No meaningful content generated');
    }

    // Update post with generated content
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        content: generatedContent.trim(),
        status: 'generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      throw new Error(`Failed to save content: ${updateError.message}`);
    }

    console.log(`=== Background processing completed successfully for post ${postId} ===`);
    
  } catch (error) {
    console.error(`=== Background processing failed for post ${postId} ===`, error);
    
    // Update post status to failed
    await supabase
      .from('posts')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Generate post function started (async mode) ===')
    
    const requestData = await req.json()
    const { postId, audioFile, audioFileName, language, userId } = requestData

    // Validate required parameters
    if (!postId || !audioFile || !userId) {
      const missingFields = [];
      if (!postId) missingFields.push('postId');
      if (!audioFile) missingFields.push('audioFile');
      if (!userId) missingFields.push('userId');
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate audio size immediately
    const sizeValidation = validateAudioSize(audioFile);
    if (!sizeValidation.valid) {
      console.error('Audio size validation failed:', sizeValidation.error);
      throw new Error(sizeValidation.error);
    }

    console.log(`Audio validated: ${sizeValidation.sizeBytes} bytes (${sizeValidation.sizeMB.toFixed(3)} MB)`);

    // Fetch LinkedIn token
    console.log('Fetching LinkedIn token...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_tokens')
      .select('access_token, expires_at, person_urn')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('LinkedIn authentication required. Please reconnect your account.');
    }

    // Check token expiration with more lenient timing (allow tokens that expire within 10 minutes)
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now >= new Date(expiresAt.getTime() - 10 * 60 * 1000)) {
      console.log('LinkedIn token is close to expiration or expired, but proceeding with processing');
      // Don't throw an error, just log a warning and continue
      console.warn('Warning: LinkedIn token may be expired, but attempting to process anyway');
    }

    // Update post status to queued
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        status: 'queued',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      throw new Error(`Failed to queue post: ${updateError.message}`);
    }

    console.log(`Post ${postId} queued for background processing`);

    // Start background processing (don't await)
    EdgeRuntime.waitUntil(
      processAudioInBackground(
        postId,
        audioFile,
        audioFileName,
        language,
        tokenData.access_token,
        tokenData.person_urn
      )
    );

    // Return immediately with job ID
    return new Response(
      JSON.stringify({ 
        success: true,
        jobId: postId,
        status: 'queued',
        audioSizeMB: sizeValidation.sizeMB.toFixed(2),
        message: `Processing queued for ${sizeValidation.sizeMB.toFixed(1)}MB audio file`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== Generate post error ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
