const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  // 1. Restore the HTML for Lầy lội lần cuối
  const slidesData = JSON.parse(fs.readFileSync('components/admin/slides_data.json', 'utf8'));
  const layLoiSlideData = slidesData[13]; // In the original array, it was index 13
  
  const htmlContent = layLoiSlideData;
  
  if (!htmlContent || !htmlContent.includes('Lầy Lội Lần Cuối')) {
      console.log('Error: Could not find Lay Loi slide in slides_data.json');
      return;
  }
  
  const layLoiId = '71b647b9-fa41-4ad1-8c65-a736a419c3b0';
  await supabase.from('recap_slides').update({ 
      content: { html: htmlContent },
      duration: 15
  }).eq('id', layLoiId);
  console.log('Restored content for Lầy Lội Lần Cuối');

  // 2. Fix the order indices
  const orderMap = {
    '41266947-9b44-4862-b71c-6f1bb60d9baa': 12, // Chương III Lớp 12
    '51f490e0-27fe-4114-abad-36586f1c83db': 13, // Góc Sinh Hoạt Lạc Quan
    '71b647b9-fa41-4ad1-8c65-a736a419c3b0': 14, // Lầy Lội Lần Cuối
    '4d49d9d6-4889-431e-ad8c-7cbbc28fa308': 15, // Kỷ Yếu
    'e83a8478-886c-4d23-9083-3e1e062d83c9': 16, // Lời từ 12A5
    '8118456a-ead6-4794-834d-7661d7f1490f': 17, // Blank (or something else, wait let's check original)
    '1315f064-cabd-4f1d-9ff6-651a5625d636': 18, // A5K58 Thành viên (Credits)
    '5915d15c-bba3-4a20-b521-5ed32ee264ac': 19  // Hẹn gặp lại
  };

  for (const [id, order] of Object.entries(orderMap)) {
    await supabase.from('recap_slides').update({ order_index: order }).eq('id', id);
  }
  
  console.log('Fixed order indices!');
}
restore();
