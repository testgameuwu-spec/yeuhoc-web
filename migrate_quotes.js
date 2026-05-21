const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

const floatingData = [
  { text: "6r 67 ngu thì ngậm", type: "quote" },
  { text: "6r cn gam kl đá giải", type: "quote" },
  { text: "CBH", type: "group" },
  { text: "CBM", type: "group" },
  { text: "CBD", type: "group" },
  { text: "SBBH", type: "group" },
  { text: "HCTK", type: "quote" },
  { text: "Đã gọi là anh em thì đừng bao giờ yêu lại nyc nhau", type: "quote" },
  { text: "m cày ngày cày đêm trình m càng có, t cày ngày cày đêm thử thách 24h làm chó", type: "quote" },
  { text: "Gia Cát Khổng Minh", type: "quote" },
  { text: "Nhị Lang Trần", type: "quote" },
  { text: "Chúa Tể Địa Ngục", type: "quote" },
  { text: "Công Chúa Kẹo Bông", type: "quote" },
  { text: "NhímBeoMiXi", type: "quote" },
  { text: "Cà Chua", type: "quote" },
  { text: "Dâu Tây", type: "quote" },
  { text: "Phan Anh Boxxing", type: "quote" },
  { text: "Ngọc Thạch Vịnh Xuân Quyền", type: "quote" },
  { text: "Hà Nội ngày mưa đêm rét, tình cảm này anh dành cho em hết", type: "quote" },
  { text: "CBD gặp nhau cái là đê mê, nhưng tiếc cái ae toàn đâm nhau một cách tê tái", type: "quote" },
  { text: "Trọng Đức bổ lọ cho bảy chọ, Khung cảnh ấy khiến bố m phải bỏ chạy", type: "quote" },
  { text: "5maychanchuoi__", type: "group" },
  { text: "caibanghoi_", type: "group" },
  { text: "yeuhoc.site_", type: "group" },
  { text: "family_of_universes", type: "group" },
  { text: "@bong.acadu", type: "insta" },
  { text: "@baedauteii__", type: "insta" },
  { text: "@ahoni.cinak", type: "insta" },
  { text: "@lm__thng", type: "insta" },
  { text: "@nlh.ilhnn_", type: "insta" },
  { text: "@tiekhocchui", type: "insta" },
  { text: "@ducket_0606", type: "insta" },
  { text: "@gialam_08", type: "insta" },
  { text: "@phdtroolll", type: "insta" },
  { text: "@phucng402", type: "insta" },
  { text: "@qu4n_nh", type: "insta" },
  { text: "@dohung864", type: "insta" },
  { text: "@dangtuan6043", type: "insta" },
  { text: "@rice_291207", type: "insta" },
  { text: "@capsnotbusy", type: "insta" },
  { text: "@ngnhduyy_", type: "insta" },
  { text: "@bo_nguuu", type: "insta" },
  { text: "@tuila.neyu_", type: "insta" },
  { text: "@baopham1553", type: "insta" },
  { text: "@hntraans", type: "insta" },
  { text: "@duongma1912", type: "insta" },
  { text: "@duchuy.808", type: "insta" },
  { text: "@lbl77_7", type: "insta" },
  { text: "@babicuabadat", type: "insta" },
  { text: "@_trnminh", type: "insta" },
  { text: "@wavy.2907", type: "insta" },
  { text: "@danghuu1678", type: "insta" },
  { text: "@tmai.ngv", type: "insta" },
  { text: "@thangkongot_41", type: "insta" },
  { text: "@thaihha_76", type: "insta" },
  { text: "@tuelam_hoang", type: "insta" },
  { text: "@_leches.ht_", type: "insta" },
  { text: "@thuphuong__1406", type: "insta" },
  { text: "@myngocc2k8", type: "insta" },
  { text: "@_ngkh.huyen_", type: "insta" },
  { text: "@phuong_chiiii_273", type: "insta" }
];

async function migrateQuotes() {
  const { data: slides, error } = await supabase.from('recap_slides').select('*').order('order_index');
  if (error || !slides) {
    console.error('Error fetching slides:', error);
    return;
  }
  
  // The last slide is usually the credits slide
  const lastSlide = slides[slides.length - 1];
  console.log('Target slide:', lastSlide.id);
  
  const content = typeof lastSlide.content === 'string' ? JSON.parse(lastSlide.content) : lastSlide.content;
  if (!content.quotes) {
    content.quotes = floatingData.map((q, i) => ({ id: i.toString(), ...q }));
  }
  
  const { error: updateError } = await supabase.from('recap_slides').update({ content }).eq('id', lastSlide.id);
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Migration successful!');
  }
}
migrateQuotes();
