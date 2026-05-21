const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Update CSS
  let css = fs.readFileSync('public/recap/recap.css', 'utf8');
  css = css.replace(/grid-template-columns:\s*repeat\(3,\s*1fr\);/, 'grid-template-columns: repeat(2, 1fr);');
  fs.writeFileSync('public/recap/recap.css', css);
  console.log('Updated recap.css for 2x2 grid.');

  // 2. Update DB HTML
  const layLoiId = 'e83a8478-886c-4d23-9083-3e1e062d83c9'; // "Nơi Tài Năng Tỏa Sáng"
  
  const { data } = await supabase.from('recap_slides').select('content').eq('id', layLoiId).single();
  let html = data.content && data.content.html ? data.content.html : data.content;
  
  // Replace stats grid
  const oldStatsRegex = /<div class="vd-stats-grid"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<div class="vd-collective-section"/;
  const newStats = `<div class="vd-stats-grid" bis_skin_checked="1">
                <div class="vd-stat-card" bis_skin_checked="1">
                    <div class="vd-stat-number" bis_skin_checked="1" style="font-size:1.8rem">30+</div>
                    <div class=\"vd-stat-label\" bis_skin_checked=\"1\">giải thưởng<br>cấp trường & TP</div>
                </div>
                <div class="vd-stat-card" bis_skin_checked="1">
                    <div class="vd-stat-number" bis_skin_checked="1" style="font-size:1.8rem">6+</div>
                    <div class=\"vd-stat-label\" bis_skin_checked=\"1\">giải thưởng<br>tập thể</div>
                </div>
                <div class="vd-stat-card" bis_skin_checked="1">
                    <div class="vd-stat-number" bis_skin_checked="1" style="font-size:1.8rem">10+</div>
                    <div class=\"vd-stat-label\" bis_skin_checked=\"1\">đôi yêu nhau<br>trong lớp</div>
                </div>
                <div class="vd-stat-card" bis_skin_checked="1">
                    <div class="vd-stat-number" bis_skin_checked="1" style="font-size:1.8rem">100+</div>
                    <div class=\"vd-stat-label\" bis_skin_checked=\"1\">buổi nghỉ học<br>toàn thành viên</div>
                </div>
            </div>

            <div class="vd-collective-section"`;
            
  html = html.replace(oldStatsRegex, newStats);
  
  // Replace collective awards
  const oldAwardsRegex = /<div class="vd-award-tags"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<div class="vd-fun-fact"/;
  const newAwards = `<div class="vd-award-tags" bis_skin_checked="1">
                    <span class="vd-award-tag" style="white-space:nowrap;">🥇 Giải Nhất Podcast 2025</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥇 Giải Nhất Báo Tường 2024</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥇 Giải Nhất Poster Thành Lập Trường 2024</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥇 Giải Nhất Nhảy Dây Hội Khỏe 2023</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥈 Giải Nhì Kéo Co Hội Khỏe 2023</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥈 Giải Nhì Đồng Ca Thăng Long 2024</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥉 Giải Ba Flashmob 2024</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🥉 Giải Ba Thăng Long Champion League 2024</span>
                    <span class="vd-award-tag" style="white-space:nowrap;">🏵️ Giải Khuyến Khích Cắm hoa 20/10 2023</span>
                </div>
            </div>

            <div class="vd-fun-fact"`;
            
  html = html.replace(oldAwardsRegex, newAwards);

  await supabase.from('recap_slides').update({ content: { html } }).eq('id', layLoiId);
  console.log('Updated slide HTML in DB.');
}

run();
