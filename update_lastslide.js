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

const newLastSlide = `<div class="slide slide-centered" data-manual="true">
        <div class="anim" data-delay="100">
            <img src="/recap/logo2.png" class="sponsor-logo" alt="A5K58" />
        </div>
        <h1 class="anim" data-delay="500" style="font-size: 2.5rem; color: #c62828;">
            Hẹn gặp lại ở ngày tháng sau này!
        </h1>
        <p class="typewriter" data-delay="2000">Dù mai này mỗi người một ngả, nhưng A5K58 mãi là thanh xuân đẹp nhất của chúng ta.</p>
        <div class="anim" data-delay="5000" style="margin-top: 30px;">
            <img src="/recap/xincamon.png" alt="Xin trân trọng cảm ơn!" style="width: min(280px, 60vw); height: auto; object-fit: contain;" />
        </div>
        <div class="anim" data-delay="6000" style="margin-top: 4px;">
            <p style="color: #888;">2023 — 2026</p>
        </div>
        <button class="start-btn anim" data-delay="7500" onclick="showSlide(0)" style="margin-top: 30px;">XEM LẠI TỪ ĐẦU</button>
        <div class="sponsor anim" data-delay="9000">
            <p class="sponsor-label">Sponsored by</p>
            <p class="sponsor-name">YeuHoc</p>
        </div>
    </div>`;

async function main() {
  const dataPath = 'components/admin/slides_data.json';
  let slides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  slides[slides.length - 1] = newLastSlide;
  fs.writeFileSync(dataPath, JSON.stringify(slides, null, 2), 'utf8');
  console.log('✅ slides_data.json updated');
  const { data: lastSlides } = await supabase.from('recap_slides').select('id, order_index').order('order_index', { ascending: false }).limit(1);
  if (lastSlides?.[0]) {
    const { error } = await supabase.from('recap_slides').update({ content: { html: newLastSlide } }).eq('id', lastSlides[0].id);
    if (error) console.error('❌', error.message);
    else console.log('✅ Supabase updated');
  }
}
main();
