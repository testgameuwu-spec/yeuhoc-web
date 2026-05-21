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

const names = [
  "Nguyễn Bùi Hoài Anh", "Nguyễn Ngọc Kiều Anh", "Nguyễn Quang Anh", "Trương Đức Phan Anh", "Phạm Gia Bảo",
  "Trần Hà Phương Chi", "Đỗ Ngọc Diệp", "Nguyễn Nhật Duy", "Trần Hoàng Dương", "Lê Bá Đạt", "Nguyễn Hữu Đăng",
  "Nguyễn Minh Đức", "Nguyễn Trọng Đức", "Trần Thái Hà", "Quách Thanh Hải", "Nguyễn Đức Huy", "Trịnh Quang Huy",
  "Nguyễn Khánh Huyền", "Đỗ Minh Hưng", "Nguyễn Quang Hưng", "Phan Ngọc Khánh", "Bùi Anh Kiệt", "Hoàng Tuệ Lâm",
  "Lê Bách Lâm", "Nguyễn Hoàng Gia Lâm", "Nguyễn Lê Hà Linh", "Võ Ban Mai", "Nguyễn Diệu Minh", "Phạm Duy Minh",
  "Trần Hải Minh", "Nguyễn Hoàng Nam", "Trần Hoàng Hải Nam", "Bùi Thị Hà Ngân", "Trần Thị Thảo Ngân",
  "Nguyễn Anh Ngọc", "Trương Mỹ Ngọc", "Đặng Hiếu Nguyên", "Đặng Tuấn Phong", "Nguyễn Minh Phúc", "Trần Thu Phương",
  "Nguyễn Hoàng Quân", "Nguyễn Ngọc Thạch", "Nguyễn Duy Thắng", "Nguyễn Hưng Thịnh", "Đào Thủy Tiên",
  "Trần Bảo Uyên", "Tống Mỹ Vãn", "Trịnh Lê Nguyên Vũ"
];

const slideHtml = `<div class="slide slide-centered">
    <p class="chapter-label anim" data-delay="0">A5K58 — Thành viên</p>
    <p class="slide-desc anim" data-delay="500">Những người đã cùng nhau viết nên câu chuyện này.</p>
    <!-- Floating Quotes Left -->
    <div class="floating-quotes left-quotes" id="leftQuotesBox"></div>
    
    <!-- Floating Quotes Right -->
    <div class="floating-quotes right-quotes" id="rightQuotesBox"></div>

    <div class="credits-wrapper" style="margin-top: 20px;">
        <div class="credits-scroll">
            <div class="credits-divider"></div>
            ${names.map(name => `<p class="credits-name">${name}</p>`).join('\n            ')}
            <div class="credits-divider"></div>
            <p class="credits-name" style="font-size:1.3rem; color:#c62828; font-weight:800; text-transform:uppercase; margin-top:20px;">Giáo viên chủ nhiệm<br>Cô Nguyễn Thị Vân Anh</p>
            <div class="credits-divider"></div>
        </div>
    </div>
</div>`;

async function main() {
  const { data: slides, error } = await supabase.from('recap_slides').select('id, order_index').order('order_index');
  if (error) {
    console.error(error);
    return;
  }
  
  const targetSlide = slides.find(s => s.order_index === 17);
  
  if (targetSlide) {
    const { error: updateError } = await supabase
      .from('recap_slides')
      .update({ content: { html: slideHtml } })
      .eq('id', targetSlide.id);
      
    if (updateError) {
      console.error('Failed to update Supabase:', updateError);
    } else {
      console.log('✅ Supabase updated with correct 48 names');
    }
  }

  // Update components/admin/slides_data.json if it exists
  const dataPath = 'components/admin/slides_data.json';
  if (fs.existsSync(dataPath)) {
    let jsonSlides = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (jsonSlides.length >= 20) {
      jsonSlides[19] = slideHtml; // Update Thành viên slide at index 19
      fs.writeFileSync(dataPath, JSON.stringify(jsonSlides, null, 2), 'utf8');
      console.log('✅ slides_data.json updated');
    }
  }
}

main();
