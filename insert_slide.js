const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSlide() {
  const insertIndex = 14;
  
  // Fetch all slides >= insertIndex
  const { data: slidesToShift, error: shiftError } = await supabase
    .from('recap_slides')
    .select('id, order_index')
    .gte('order_index', insertIndex)
    .order('order_index', { ascending: false }); // descending to avoid unique constraint issues if any, though normally order_index might not have unique constraint

  if (shiftError) {
    console.error('Error fetching slides:', shiftError);
    return;
  }

  // Shift them all by 1
  for (const slide of slidesToShift) {
    await supabase.from('recap_slides').update({ order_index: slide.order_index + 1 }).eq('id', slide.id);
  }

  // Content for the new slide
  const newHtml = `
<div class="slide slide-centered" bis_skin_checked="1">
    <h1 class="anim show" data-delay="500" style="color: rgb(21, 101, 192); min-height: 20px; min-width: 20px;">Góc Sinh Hoạt Lạc Quan...</h1>
    
    <div class="anim show" data-delay="1500" style="margin-top: 20px; margin-bottom: 20px;" bis_skin_checked="1">
        <div class="img-placeholder" style="max-width: 600px; border-width: medium; border-style: none; border-color: currentcolor; border-image: initial;" bis_skin_checked="1">
            <span class="ph-icon">📸</span>
            <span style="min-height: 20px; min-width: 20px;">Ảnh/GIF sinh hoạt 1</span>
        </div>
    </div>
    
    <p class="typewriter" data-delay="2000" style="font-size: 1.1rem; line-height: 1.6; max-width: 800px; margin: 0 auto; min-height: 20px; min-width: 20px;" data-text-original="Là những chuỗi ngày vật lộn với núi bài tập khổng lồ, những đêm thức trắng chạy deadline hay áp lực thi cử đè nặng trên vai.">Là những chuỗi ngày vật lộn với núi bài tập khổng lồ, những đêm thức trắng chạy deadline hay áp lực thi cử đè nặng trên vai.</p>
    
    <div class="scattered-gallery" style="margin-top: 30px;">
        <div class="img-placeholder anim show" data-delay="4000" style="border-width: medium; border-style: none; border-color: currentcolor; border-image: initial;" bis_skin_checked="1">
            <span class="ph-icon">📸</span>
            <span style="min-height: 20px; min-width: 20px;">GIF 2</span>
        </div>
        <div class="img-placeholder anim show" data-delay="5000" style="border-width: medium; border-style: none; border-color: currentcolor; border-image: initial;" bis_skin_checked="1">
            <span class="ph-icon">📸</span>
            <span style="min-height: 20px; min-width: 20px;">GIF 3</span>
        </div>
        <div class="img-placeholder anim show" data-delay="6000" style="border-width: medium; border-style: none; border-color: currentcolor; border-image: initial;" bis_skin_checked="1">
            <span class="ph-icon">📸</span>
            <span style="min-height: 20px; min-width: 20px;">GIF 4</span>
        </div>
    </div>

    <p class="slide-desc anim show" data-delay="8000" style="font-size: 1.2rem; font-style: italic; color: #c62828; margin-top: 40px; min-height: 20px; min-width: 20px;">Thế nhưng, sau tất cả, những nụ cười lạc quan vẫn luôn nở trên môi. Áp lực không làm chúng ta chùn bước, mà chỉ làm thanh xuân thêm phần rực rỡ và đáng nhớ hơn bao giờ hết!</p>
</div>
`;

  const newSlide = {
    order_index: insertIndex,
    slide_type: 'a5k58_slide',
    content: { html: newHtml.trim() },
    duration: 25
  };

  const { data: inserted, error: insertError } = await supabase.from('recap_slides').insert([newSlide]).select();
  if (insertError) {
    console.error('Error inserting slide:', insertError);
  } else {
    console.log('Successfully inserted new slide at index', insertIndex, inserted[0].id);
  }
}
insertSlide();
