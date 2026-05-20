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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// P1: ~250 chars × 50ms = 12500ms. Start 1500, end ~14000
// P2: ~245 chars × 50ms = 12250ms. Start 15000, end ~27250
// P3: ~245 chars × 50ms = 12250ms. Start 28500, end ~40750
// P4: ~185 chars × 50ms = 9250ms. Start 42000, end ~51250
// Quote: 52500, Signature: 54000, Duration: 58s

async function main() {
  const dataPath = 'components/admin/slides_data.json';
  let slides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const idx = slides.findIndex(s => s.includes('balloon-container'));
  if (idx === -1) { console.error('❌ Farewell slide not found'); return; }

  // Update only the delay values in the existing HTML
  let html = slides[idx];
  html = html.replace(/class="typewriter" data-delay="1500"/, 'class="typewriter" data-delay="1500"');
  html = html.replace(/class="typewriter" data-delay="11000"/, 'class="typewriter" data-delay="15000"');
  html = html.replace(/class="typewriter" data-delay="20500"/, 'class="typewriter" data-delay="28500"');
  html = html.replace(/class="typewriter" data-delay="30000"/, 'class="typewriter" data-delay="42000"');
  html = html.replace(/class="slide-quote anim" data-delay="37000"/, 'class="slide-quote anim" data-delay="52500"');
  html = html.replace(/class="farewell-signature anim" data-delay="38500"/, 'class="farewell-signature anim" data-delay="54000"');
  
  slides[idx] = html;
  fs.writeFileSync(dataPath, JSON.stringify(slides, null, 2), 'utf8');
  console.log('✅ slides_data.json delays updated');

  const { error } = await supabase
    .from('recap_slides')
    .update({ content: { html }, duration: 58 })
    .eq('order_index', 16);
  if (error) console.error('❌', error.message);
  else console.log('✅ Supabase updated (duration: 58s)');
}
main();
