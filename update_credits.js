const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envPath = '.env.local';

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  for (let line of envConfig) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) process.env[key.trim()] = valueParts.join('=').trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const htmlContent = fs.readFileSync('a5tongket/a5tongke.html', 'utf8');
  
  const startMarker = '<!-- ==================== PHẦN 5: KẾT BÀI ==================== -->';
  const endMarker = '<!-- Slide Final -->';
  
  const startIndex = htmlContent.indexOf(startMarker);
  const endIndex = htmlContent.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find slide markers');
    return;
  }
  
  // Extract just the slide
  const slideHtml = htmlContent.substring(startIndex + startMarker.length, endIndex).trim();
  
  // Also remove the <script> block from the slideHtml if it's in there, but we put it AFTER Slide Final in our manual edit?
  // Wait, I put the <script> before <script src="a5tongke-engine.js"> which is AFTER the Slide Final!
  // So the slideHtml won't contain the script. That's actually perfect!
  
  // The slide we want to update is the one that contains "A5K58 — Thành viên"
  const { data: slides, error } = await supabase.from('recap_slides').select('id, content, order_index').order('order_index');
  if (error) {
    console.error(error);
    return;
  }
  
  const targetSlide = slides.find(s => s.order_index === 17);
  
  if (targetSlide) {
    console.log(`Found target slide with id ${targetSlide.id} at index ${targetSlide.order_index}`);
    const { error: updateError } = await supabase
      .from('recap_slides')
      .update({ content: { html: slideHtml } })
      .eq('id', targetSlide.id);
      
    if (updateError) {
      console.error('Failed to update Supabase:', updateError);
    } else {
      console.log('✅ Supabase updated');
    }
  } else {
    console.log('Target slide not found in DB.');
  }

  // Update components/admin/slides_data.json if it exists
  const dataPath = 'components/admin/slides_data.json';
  if (fs.existsSync(dataPath)) {
    let jsonSlides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    // In JSON, it's index 19 (if there are 20 total slides)
    // Actually, just update index 19 because slides[19] is the Thành viên slide
    if (jsonSlides.length >= 20) {
      jsonSlides[19] = slideHtml;
      fs.writeFileSync(dataPath, JSON.stringify(jsonSlides, null, 2), 'utf8');
      console.log('✅ slides_data.json updated');
    }
  }
}

main();
