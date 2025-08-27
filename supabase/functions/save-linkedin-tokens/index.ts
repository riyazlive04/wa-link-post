
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
    const { userId, access_token, refresh_token, expires_in, scope } = await req.json()
    
    console.log('Saving LinkedIn tokens for user:', userId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Try to fetch LinkedIn member ID using multiple approaches
    let memberId = null;
    let legacyMemberId = null;
    let profileUrl = null;
    
    console.log('Fetching LinkedIn member ID...')
    
    try {
      // Try the userinfo endpoint first (works with openid scope)
      let profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        // Fallback to people endpoint with lite profile
        profileResponse = await fetch('https://api.linkedin.com/v2/people/(id~)', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('LinkedIn profile response:', profileData);
        
        // Extract member ID from the response
        if (profileData.sub) {
          // From userinfo endpoint - sub contains the member ID
          memberId = profileData.sub;
        } else if (profileData.id) {
          // From people endpoint - id contains the member ID
          memberId = profileData.id;
        }
        
        console.log('Extracted member ID:', memberId);
      } else {
        const errorText = await profileResponse.text();
        console.error('Failed to fetch LinkedIn profile:', profileResponse.status, errorText);
      }

      // Try to get the user's public profile URL for scraping
      if (memberId) {
        console.log('Attempting to get profile URL for web scraping...');
        
        try {
          const profileUrlResponse = await fetch('https://api.linkedin.com/v2/people/(id~)?projection=(publicProfileUrl)', {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (profileUrlResponse.ok) {
            const profileUrlData = await profileUrlResponse.json();
            profileUrl = profileUrlData.publicProfileUrl;
            console.log('Got profile URL:', profileUrl);
          } else {
            console.log('Could not get profile URL, will construct default');
          }
        } catch (urlError) {
          console.log('Error getting profile URL:', urlError.message);
        }
      }

      // Web scrape the profile page to get the numeric data-member-id
      if (memberId) {
        console.log('Attempting to scrape numeric member ID from profile page...');
        
        try {
          // Use the public profile URL if available, otherwise construct one
          let scrapeUrl = profileUrl;
          if (!scrapeUrl) {
            // Fallback: try common LinkedIn profile URL patterns
            scrapeUrl = `https://www.linkedin.com/in/${memberId}/`;
          }
          
          console.log('Scraping URL:', scrapeUrl);
          
          const scrapeResponse = await fetch(scrapeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            }
          });

          if (scrapeResponse.ok) {
            const html = await scrapeResponse.text();
            console.log('Successfully fetched profile HTML, length:', html.length);
            
            // Look for data-member-id attribute in the HTML
            const dataMemberIdMatch = html.match(/data-member-id["\s]*=["\s]*([0-9]+)/i);
            if (dataMemberIdMatch && dataMemberIdMatch[1]) {
              legacyMemberId = dataMemberIdMatch[1];
              console.log('Successfully scraped numeric member ID:', legacyMemberId);
            } else {
              // Try alternative patterns
              const altPatterns = [
                /memberToken["\s]*:["\s]*([0-9]+)/i,
                /memberId["\s]*:["\s]*([0-9]+)/i,
                /"memberId":"([0-9]+)"/i,
                /data-li-member-id["\s]*=["\s]*([0-9]+)/i
              ];
              
              for (const pattern of altPatterns) {
                const match = html.match(pattern);
                if (match && match[1]) {
                  legacyMemberId = match[1];
                  console.log('Found numeric member ID with alternative pattern:', legacyMemberId);
                  break;
                }
              }
              
              if (!legacyMemberId) {
                console.log('Could not find numeric member ID in profile HTML');
                // Log a small sample of the HTML for debugging (first 500 chars)
                console.log('HTML sample:', html.substring(0, 500));
              }
            }
          } else {
            console.log('Failed to scrape profile page:', scrapeResponse.status, scrapeResponse.statusText);
          }
        } catch (scrapeError) {
          console.log('Error during web scraping:', scrapeError.message);
        }
      }

    } catch (profileError) {
      console.error('Error fetching LinkedIn profile:', profileError);
    }

    // If we couldn't get the member ID from the API, generate a fallback
    if (!memberId) {
      console.log('Could not fetch member ID from LinkedIn API, using user ID as fallback');
      memberId = userId; // Use the Supabase user ID as fallback
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000))

    // Save or update the LinkedIn tokens with both member IDs
    const { error } = await supabase
      .from('linkedin_tokens')
      .upsert({
        user_id: userId,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt.toISOString(),
        person_urn: `urn:li:person:${userId}`,
        member_id: memberId,
        legacy_member_id: legacyMemberId, // Store the scraped numeric ID
        scope: scope
      })

    if (error) {
      console.error('Error saving LinkedIn tokens:', error)
      throw error
    }

    console.log('LinkedIn tokens saved successfully with member_id:', memberId, 'scraped_legacy_member_id:', legacyMemberId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        member_id: memberId,
        legacy_member_id: legacyMemberId,
        scraped: !!legacyMemberId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in save-linkedin-tokens:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
