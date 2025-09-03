import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageId = url.searchParams.get('id');

    if (!imageId) {
      return new Response('Image ID is required', {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for RLS
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      supabase.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: '',
      });
    }

    // Fetch image data from database
    const { data: image, error } = await supabase
      .from('images')
      .select('image_data, mime_type, file_name')
      .eq('id', imageId)
      .single();

    if (error || !image) {
      console.error('Error fetching image:', error);
      return new Response('Image not found', {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Convert base64 to binary
    let binaryData: Uint8Array;
    try {
      // Remove data URL prefix if present (data:image/png;base64,)
      const base64Data = image.image_data.includes(',') 
        ? image.image_data.split(',')[1] 
        : image.image_data;
      
      binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    } catch (decodeError) {
      console.error('Error decoding base64:', decodeError);
      return new Response('Invalid image data', {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Return image with proper headers
    return new Response(binaryData, {
      headers: {
        ...corsHeaders,
        'Content-Type': image.mime_type || 'image/png',
        'Content-Disposition': `inline; filename="${image.file_name || 'image'}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error in get-image function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});