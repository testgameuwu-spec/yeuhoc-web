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

const createCard = (imgSrc, name, achievements) => `
                <div class="personal-award-card static-card">
                    <div class="card-photo"><img src="${imgSrc}" alt="${name}"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">${name}</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">${achievements}</div>
                        </div>
                    </div>
                </div>`;

const fallbackCards = [
  createCard('/recap/haiminhvd.png', 'Trần Hải Minh', '120 HSA<br> IELTS 7.0<br> Trợ giảng Yêu Học <br> Trợ giảng HCTK'),
  createCard('/recap/hieunguyenvinhdanh.png', 'Đặng Hiếu Nguyên', 'HSK 6<br> IELTS 7.0 <br> Cổ đông Yêu Học'),
  createCard('/recap/nhatduyvinhdanh.png', 'Nguyễn Nhật Duy', 'Giải Nhất HSG Toán TP Hà Nội<br> Trợ giảng ÁiTDM<br> Trợ giảng Yêu Học'),
  createCard('/recap/duyminhvinhdanh.png', 'Phạm Duy Minh', '1590 SAT<br> IELTS 7.5<br> Giám đốc Yêu Học'),
  createCard('/recap/hainamvinhdanh.png', 'Trần Hoàng Hải Nam', '112 HSA<br> IELTS 7.5<br> Trợ Giảng Yêu Học <br> Trợ giảng HCTK'),
  createCard('/recap/quanganhvinhdanh.png', 'Nguyễn Quang Anh', 'Bố của các thành viên trên'),
].join('');

// Slide HTML: fallback cards are inside the track, marker wraps them for dynamic replacement
const newVinhDanhHTML = `    <div class="slide">
        <h2 class="anim" data-delay="300">Vinh Danh Cá Nhân</h2>
        <p class="slide-desc anim" data-delay="500">Những cá nhân xuất sắc với thành tích nổi bật đáng tự hào.</p>

        <div class="gallery-slideshow vd-compact-gallery anim" data-delay="800">
            <div class="gallery-track dir-left">
<!-- VINH_DANH_START -->${fallbackCards}
<!-- VINH_DANH_END -->
            </div>
        </div>

        <div class="vd-stats-section anim" data-delay="1200">
            <div class="vd-stats-title">Con Số Của A5K58</div>
            <div class="vd-stats-grid">
                <div class="vd-stat-card">
                    <div class="vd-stat-number">30+</div>
                    <div class="vd-stat-label">giải HSG<br>cấp trường & TP</div>
                </div>
                <div class="vd-stat-card">
                    <div class="vd-stat-number">3</div>
                    <div class="vd-stat-label">năm<br>liên tiếp</div>
                </div>
                <div class="vd-stat-card">
                    <div class="vd-stat-number">6+</div>
                    <div class="vd-stat-label">giải thưởng<br>tập thể</div>
                </div>
            </div>

            <div class="vd-collective-section">
                <div class="vd-collective-label">🏆 Giải Thưởng Tập Thể</div>
                <div class="vd-award-tags">
                    <span class="vd-award-tag"><span class="tag-icon">🥈</span> Nhì Đồng Ca Thăng Long 2026</span>
                    <span class="vd-award-tag"><span class="tag-icon">🥇</span> Nhất Podcast 2026</span>
                    <span class="vd-award-tag"><span class="tag-icon">🥇</span> Nhất Poster 2025</span>
                </div>
            </div>

            <div class="vd-fun-fact">
                Mỗi thành viên A5 là một <strong>mảnh ghép không thể thay thế</strong> trong bức tranh thanh xuân này.
            </div>
        </div>
    </div>`;

// Seed members data
const seedMembers = [
  { name: 'Trần Hải Minh', photo_url: '/recap/haiminhvd.png', achievements: '120 HSA\nIELTS 7.0\nTrợ giảng Yêu Học\nTrợ giảng HCTK', order_index: 0 },
  { name: 'Đặng Hiếu Nguyên', photo_url: '/recap/hieunguyenvinhdanh.png', achievements: 'HSK 6\nIELTS 7.0\nCổ đông Yêu Học', order_index: 1 },
  { name: 'Nguyễn Nhật Duy', photo_url: '/recap/nhatduyvinhdanh.png', achievements: 'Giải Nhất HSG Toán TP Hà Nội\nTrợ giảng ÁiTDM\nTrợ giảng Yêu Học', order_index: 2 },
  { name: 'Phạm Duy Minh', photo_url: '/recap/duyminhvinhdanh.png', achievements: '1590 SAT\nIELTS 7.5\nGiám đốc Yêu Học', order_index: 3 },
  { name: 'Trần Hoàng Hải Nam', photo_url: '/recap/hainamvinhdanh.png', achievements: '112 HSA\nIELTS 7.5\nTrợ Giảng Yêu Học\nTrợ giảng HCTK', order_index: 4 },
  { name: 'Nguyễn Quang Anh', photo_url: '/recap/quanganhvinhdanh.png', achievements: 'Bố của các thành viên trên', order_index: 5 },
];

async function main() {
  // 1. Update slide HTML in slides_data.json
  const dataPath = 'components/admin/slides_data.json';
  let slides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  slides[15] = newVinhDanhHTML;
  fs.writeFileSync(dataPath, JSON.stringify(slides, null, 2), 'utf8');
  console.log('✅ slides_data.json updated');

  // 2. Update Supabase recap_slides (order_index 15)
  const { error: slideErr } = await supabase
    .from('recap_slides')
    .update({ content: { html: newVinhDanhHTML } })
    .eq('order_index', 15);
  if (slideErr) console.error('❌ Slide update error:', slideErr.message);
  else console.log('✅ Supabase slide updated');

  // 3. Try to seed vinh_danh_members (if table exists)
  const { data: existing, error: checkErr } = await supabase
    .from('vinh_danh_members')
    .select('id')
    .limit(1);

  if (checkErr) {
    console.log('⚠️  vinh_danh_members table not found yet.');
    console.log('   Run the SQL migration first, then re-run this script.');
    console.log('   File: supabase/migrations/20260520_create_vinh_danh_members.sql');
  } else if (existing && existing.length > 0) {
    console.log('ℹ️  vinh_danh_members already has data, skipping seed');
  } else {
    const { error: seedErr } = await supabase
      .from('vinh_danh_members')
      .insert(seedMembers);
    if (seedErr) console.error('❌ Seed error:', seedErr.message);
    else console.log('✅ Seeded 6 vinh danh members');
  }

  console.log('\n🎉 Done!');
}

main();
