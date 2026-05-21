'use server'
import { createClient } from '@supabase/supabase-js';

export async function uploadRecapImage(formData) {
  try {
    const file = formData.get('file');
    const bucket = formData.get('bucket');
    const path = formData.get('path');

    if (!file || !bucket || !path) {
      return { error: 'Missing parameters' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.storage.from(bucket).upload(path, file);

    if (error) {
      return { error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: publicUrlData.publicUrl };
  } catch (err) {
    return { error: err.message };
  }
}
