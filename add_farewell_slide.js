const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  for (let line of envConfig) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Generate balloon photos HTML (10 on each side with staggered timing)
function generateBalloons() {
  const photos = [];
  for (let i = 180; i <= 224; i++) photos.push(i);
  
  // Shuffle
  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  
  const leftPhotos = photos.slice(0, 10);
  const rightPhotos = photos.slice(10, 20);
  
  const makeBalloon = (id, idx, side) => {
    const duration = 10 + Math.random() * 8; // 10-18s
    const delay = idx * 1.8 + Math.random() * 1.5; // staggered
    const sway = (side === 'left' ? 1 : -1) * (10 + Math.random() * 20);
    const leftPos = 5 + Math.random() * 80; // random horizontal position within the side
    return `<img src="/recap/members/${id}.jpg" class="balloon-photo" style="--float-duration:${duration.toFixed(1)}s;--float-delay:${delay.toFixed(1)}s;--sway:${sway.toFixed(0)}px;left:${leftPos.toFixed(0)}%" alt="">`;
  };
  
  let html = '<div class="balloon-container">\n';
  html += '    <div class="balloon-side left">\n';
  leftPhotos.forEach((id, i) => { html += '        ' + makeBalloon(id, i, 'left') + '\n'; });
  html += '    </div>\n';
  html += '    <div class="balloon-side right">\n';
  rightPhotos.forEach((id, i) => { html += '        ' + makeBalloon(id, i, 'right') + '\n'; });
  html += '    </div>\n';
  html += '</div>';
  return html;
}

const balloonsHtml = generateBalloons();

const farewellSlideHTML = `    <div class="slide slide-centered">
        ${balloonsHtml}
        <div class="farewell-content">
            <p class="chapter-label anim" data-delay="300">Lời từ 12A5</p>
            <h2 class="anim" data-delay="600" style="font-size:1.4rem; margin-bottom:14px;">Không phải lớp giỏi nhất, nhưng là lớp đáng nhớ nhất.</h2>
            <p class="typewriter" data-delay="1500">Chúng mình không phải lớp xuất phát với những con số ấn tượng. Không có nhiều giải thưởng lấp lánh từ đầu, không có danh hiệu nào được đặt sẵn trên vai. Nhưng có lẽ chính vì thế, hành trình của 12A5 lại là hành trình đáng nhớ theo một cách rất riêng.</p>
            <p class="typewriter" data-delay="7000">Có cô Vân Anh — người không chỉ đứng trên bục giảng mà còn đứng bên cạnh từng đứa trong những lúc chông chênh nhất. Cô dìu dắt, đôn đúc, đôi khi la rầy, nhưng luôn là người tin vào tập thể này hơn cả những lúc chúng mình tự nghi ngờ bản thân.</p>
            <p class="typewriter" data-delay="14000">Còn chúng mình — 12A5 — có lẽ không phải lớp giỏi nhất trường. Nhưng nếu hỏi về sự đoàn kết, về việc không bỏ lại ai phía sau, về những buổi học muộn cùng nhau, những lần kéo nhau dậy khi chỉ muốn buông — thì chúng mình dám tự hào về điều đó.</p>
            <p class="typewriter" data-delay="21000">Phía trước là kỳ thi cuối cùng. Gác lại lo âu, bước vào phòng thi với tất cả những gì 12A5 đã tích lũy — kiến thức, ý chí, và cả tình đồng đội đã được tôi luyện suốt những năm qua.</p>
            <p class="slide-quote anim" data-delay="27000" style="margin-top:12px;">Chúc cả lớp vượt vũ môn thành công. Dù sau này mỗi người một ngả, 12A5 vẫn mãi là một chương đẹp không thể xóa.</p>
            <p class="farewell-signature anim" data-delay="29000">— 12A5 ♥</p>
        </div>
    </div>`;

async function main() {
  // 1. Update slides_data.json — insert after index 15 (vinh danh), before 16 (credits)
  const dataPath = 'components/admin/slides_data.json';
  let slides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Check if farewell slide already exists
  const existingIdx = slides.findIndex(s => s.includes('Lời từ 12A5') || s.includes('balloon-container'));
  if (existingIdx !== -1) {
    slides[existingIdx] = farewellSlideHTML;
    console.log(`ℹ️  Farewell slide already exists at index ${existingIdx}, updated.`);
  } else {
    slides.splice(16, 0, farewellSlideHTML);
    console.log('✅ Inserted farewell slide at index 16 in slides_data.json');
  }
  fs.writeFileSync(dataPath, JSON.stringify(slides, null, 2), 'utf8');

  // 2. Update Supabase
  // First shift all slides with order_index >= 16 up by 1
  const { data: allSlides } = await supabase
    .from('recap_slides')
    .select('id, order_index')
    .gte('order_index', 16)
    .order('order_index', { ascending: false });

  if (allSlides) {
    for (const s of allSlides) {
      await supabase.from('recap_slides').update({ order_index: s.order_index + 1 }).eq('id', s.id);
    }
    console.log(`✅ Shifted ${allSlides.length} slides up`);
  }

  // Insert new slide at order_index 16
  const { error: insertErr } = await supabase
    .from('recap_slides')
    .insert({
      order_index: 16,
      slide_type: 'farewell',
      content: { html: farewellSlideHTML },
      duration: 35
    });
  
  if (insertErr) console.error('❌ Insert error:', insertErr.message);
  else console.log('✅ Farewell slide inserted into Supabase at order_index 16');

  console.log('\n🎉 Done! Slide 17 (Lời từ 12A5) has been added between Vinh Danh and Credits.');
}

main();
