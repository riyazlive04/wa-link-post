
import { supabase } from '@/integrations/supabase/client';

export const ensureImageBucket = async () => {
  try {
    console.log('Checking for post-images bucket...');
    
    // Try to list files in the bucket to see if it exists
    const { error } = await supabase.storage
      .from('post-images')
      .list('', { limit: 1 });

    if (error && error.message.includes('not found')) {
      console.log('post-images bucket does not exist, will use recordings bucket');
      return false;
    }

    console.log('post-images bucket exists and is accessible');
    return true;
  } catch (error) {
    console.error('Error checking bucket:', error);
    return false;
  }
};
