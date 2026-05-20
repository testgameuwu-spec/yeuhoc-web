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

const htmlSlide = `    <div class="slide">
        <h2 class="anim" data-delay="300">Vinh Danh Cá Nhân</h2>
        <p class="slide-desc anim" data-delay="500">Những cá nhân xuất sắc với thành tích nổi bật đáng tự hào.</p>

        <div class="gallery-slideshow anim" data-delay="800">
            <div class="gallery-track dir-left">
${createCard('haiminhvd.png', 'Trần Hải Minh', '120 HSA<br> IELTS 7.0<br> Trợ giảng Yêu Học <br> Trợ giảng HCTK')}
${createCard('hieunguyenvinhdanh.png', 'Đặng Hiếu Nguyên', 'HSK 6<br> IELTS 7.0 <br> Cổ đông Yêu Học')}
${createCard('nhatduyvinhdanh.png', 'Nguyễn Nhật Duy', 'Giải Nhất HSG Toán TP Hà Nội<br> Trợ giảng ÁiTDM<br> Trợ giảng Yêu Học')}
${createCard('duyminhvinhdanh.png', 'Phạm Duy Minh', '1590 SAT<br> IELTS 7.5<br> Giám đốc Yêu Học')}
${createCard('hainamvinhdanh.png', 'Trần Hoàng Hải Nam', '112 HSA<br> IELTS 7.5<br> Trợ Giảng Yêu Học <br> Trợ giảng HCTK')}
${createCard('quanganhvinhdanh.png', 'Nguyễn Quang Anh', 'Bố của các thành viên trên')}
            </div>
        </div>
    </div>`;

// Update slides_data.json
const dataPath = 'components/admin/slides_data.json';
let slides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
// In Next.js, images need /recap/ prefix
slides[15] = htmlSlide.replace(/src="([^"]+)"/g, 'src="/recap/$1"');
fs.writeFileSync(dataPath, JSON.stringify(slides, null, 2), 'utf8');

// Update Supabase
async function updateDb() {
  const { data, error } = await supabase
    .from('recap_slides')
    .update({ content: { html: slides[15] } })
    .eq('order_index', 15);
  if (error) console.error('Supabase Error:', error);
  else console.log('Supabase updated successfully');
}
updateDb();

// Update a5tongke.html
const htmlPath = 'a5tongket/a5tongke.html';
let fullHtml = fs.readFileSync(htmlPath, 'utf8');
const startToken = '<!-- Slide 16: Vinh Danh Cá Nhân -->';
const endToken = '<!-- ==================== PHẦN 5: KẾT BÀI ==================== -->';
const startIndex = fullHtml.indexOf(startToken);
const endIndex = fullHtml.indexOf(endToken);
if (startIndex !== -1 && endIndex !== -1) {
    const before = fullHtml.substring(0, startIndex + startToken.length + 1);
    const after = fullHtml.substring(endIndex);
    fs.writeFileSync(htmlPath, before + htmlSlide + '\\n\\n    ' + after, 'utf8');
    console.log('a5tongke.html updated successfully');
}
