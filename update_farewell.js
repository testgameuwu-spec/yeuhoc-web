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

// Generate all 45 balloon photos
function generateBalloons() {
  const photos = [];
  for (let i = 180; i <= 224; i++) photos.push(i);
  
  // Shuffle deterministically
  const seed = 42;
  for (let i = photos.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 7 + 13) % (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  
  // Split: ~23 left, ~22 right
  const half = Math.ceil(photos.length / 2);
  const leftPhotos = photos.slice(0, half);
  const rightPhotos = photos.slice(half);
  
  const makeBalloon = (id, idx, total, side) => {
    const duration = 10 + (idx % 5) * 2; // 10-18s varied
    const delay = (idx * 1.2) + (idx % 3) * 0.5; // staggered
    const sway = (side === 'left' ? 1 : -1) * (8 + (idx % 6) * 4);
    const leftPos = 5 + ((idx * 37) % 80); // deterministic spread
    return `<img src="/recap/members/${id}.jpg" class="balloon-photo" style="--float-duration:${duration}s;--float-delay:${delay.toFixed(1)}s;--sway:${sway}px;left:${leftPos}%" alt="">`;
  };
  
  let html = '<div class="balloon-container">\n';
  html += '    <div class="balloon-side left">\n';
  leftPhotos.forEach((id, i) => { html += '        ' + makeBalloon(id, i, leftPhotos.length, 'left') + '\n'; });
  html += '    </div>\n';
  html += '    <div class="balloon-side right">\n';
  rightPhotos.forEach((id, i) => { html += '        ' + makeBalloon(id, i, rightPhotos.length, 'right') + '\n'; });
  html += '    </div>\n';
  html += '</div>';
  return html;
}

const balloonsHtml = generateBalloons();

// Timing: each paragraph ~250 chars × 35ms = ~8750ms  
// P1: start 1500, end ~10250  
// P2: start 11000, end ~19750
// P3: start 20500, end ~29250
// P4: start 30000, end ~36000
// Quote: 37000, Signature: 38500
const farewellSlideHTML = `    <div class="slide slide-centered">
        ${balloonsHtml}
        <div class="farewell-content">
            <p class="chapter-label anim" data-delay="300">Lời từ 12A5</p>
            <h2 class="anim" data-delay="600" style="font-size:1.4rem; margin-bottom:14px;">Không phải lớp giỏi nhất, nhưng là lớp đáng nhớ nhất.</h2>
            <p class="typewriter" data-delay="1500">Chúng mình không phải lớp xuất phát với những con số ấn tượng. Không có nhiều giải thưởng lấp lánh từ đầu, không có danh hiệu nào được đặt sẵn trên vai. Nhưng có lẽ chính vì thế, hành trình của 12A5 lại là hành trình đáng nhớ theo một cách rất riêng.</p>
            <p class="typewriter" data-delay="11000">Có cô Vân Anh — người không chỉ đứng trên bục giảng mà còn đứng bên cạnh từng đứa trong những lúc chông chênh nhất. Cô dìu dắt, đôn đúc, đôi khi la rầy, nhưng luôn là người tin vào tập thể này hơn cả những lúc chúng mình tự nghi ngờ bản thân.</p>
            <p class="typewriter" data-delay="20500">Còn chúng mình — 12A5 — có lẽ không phải lớp giỏi nhất trường. Nhưng nếu hỏi về sự đoàn kết, về việc không bỏ lại ai phía sau, về những buổi học muộn cùng nhau, những lần kéo nhau dậy khi chỉ muốn buông — thì chúng mình dám tự hào về điều đó.</p>
            <p class="typewriter" data-delay="30000">Phía trước là kỳ thi cuối cùng. Gác lại lo âu, bước vào phòng thi với tất cả những gì 12A5 đã tích lũy — kiến thức, ý chí, và cả tình đồng đội đã được tôi luyện suốt những năm qua.</p>
            <p class="slide-quote anim" data-delay="37000" style="margin-top:12px;">Chúc cả lớp vượt vũ môn thành công. Dù sau này mỗi người một ngả, 12A5 vẫn mãi là một chương đẹp không thể xóa.</p>
            <p class="farewell-signature anim" data-delay="38500">— 12A5 ♥</p>
        </div>
    </div>`;

async function main() {
  // 1. Update slides_data.json — find and replace farewell slide
  const dataPath = 'components/admin/slides_data.json';
  let slides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  const idx = slides.findIndex(s => s.includes('balloon-container') || s.includes('Lời từ 12A5'));
  if (idx !== -1) {
    slides[idx] = farewellSlideHTML;
    console.log(`✅ Updated farewell slide at index ${idx}`);
  } else {
    console.error('❌ Could not find farewell slide in slides_data.json');
    return;
  }
  fs.writeFileSync(dataPath, JSON.stringify(slides, null, 2), 'utf8');

  // 2. Update Supabase (order_index 16)
  const { error } = await supabase
    .from('recap_slides')
    .update({ content: { html: farewellSlideHTML }, duration: 42 })
    .eq('order_index', 16);
  
  if (error) console.error('❌ Supabase error:', error.message);
  else console.log('✅ Supabase slide 16 updated');

  console.log('\n🎉 Done! Fixed: all 45 photos, bigger balloons, correct typewriter timing.');
}

main();
