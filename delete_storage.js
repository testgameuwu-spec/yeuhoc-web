const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const bucketsToCheck = ['recap_images', 'recap', 'tongket', 'recaptongket'];
  
  for (const bucket of bucketsToCheck) {
      console.log(`Attempting to empty and delete bucket: ${bucket}`);
      
      const { data: emptyData, error: emptyError } = await supabase.storage.emptyBucket(bucket);
      if (emptyError) {
          console.log(`Failed to empty bucket ${bucket}:`, emptyError.message);
      } else {
          console.log(`Successfully emptied bucket ${bucket}:`, emptyData);
      }
      
      const { data: deleteData, error: deleteError } = await supabase.storage.deleteBucket(bucket);
      
      if (deleteError) {
          console.log(`Failed to delete bucket ${bucket}:`, deleteError.message);
      } else {
          console.log(`Successfully deleted bucket: ${bucket}`);
      }
  }

  console.log('--- Now cleaning up public.recap_slides table ---');
  // Delete rows that contain the keywords
  const { data, error } = await supabase
    .from('recap_slides')
    .delete()
    .or('html.ilike.%recap%,html.ilike.%tongket%,html.ilike.%recaptongket%');
    
  if (error) {
      console.log('Error deleting from recap_slides:', error.message);
  } else {
      console.log('Successfully deleted related rows from recap_slides');
  }

  console.log('Cleanup complete!');
}

run();
