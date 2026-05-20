const fs = require('fs');
const cp = require('child_process');

const original = cp.execSync('git show HEAD~2:components/admin/slides_data.json', {encoding: 'utf8'});
const data = JSON.parse(original);

const names = [
'Nguyễn Bùi Hoài Anh', 'Nguyễn Ngọc Kiều Anh', 'Nguyễn Quang Anh', 'Trương Đức Phan Anh',
'Phạm Gia Bảo', 'Trần Hà Phương Chi', 'Đỗ Ngọc Diệp', 'Nguyễn Nhật Duy', 'Trần Hoàng Dương',
'Lê Bá Đạt', 'Nguyễn Hữu Đăng', 'Nguyễn Minh Đức', 'Nguyễn Trọng Đức', 'Trần Thái Hà',
'Quách Thanh Hải', 'Nguyễn Đức Huy', 'Trịnh Quang Huy', 'Nguyễn Khánh Huyền', 'Đỗ Minh Hưng',
'Nguyễn Quang Hưng', 'Phan Ngọc Khánh', 'Bùi Anh Kiệt', 'Hoàng Tuệ Lâm', 'Lê Bách Lâm',
'Nguyễn Hoàng Gia Lâm', 'Nguyễn Lê Hà Linh', 'Võ Ban Mai', 'Nguyễn Diệu Minh', 'Phạm Duy Minh',
'Trần Hải Minh', 'Nguyễn Hoàng Nam', 'Trần Hoàng Hải Nam', 'Bùi Thị Hà Ngân', 'Trần Thị Thảo Ngân',
'Nguyễn Anh Ngọc', 'Trương Mỹ Ngọc', 'Đặng Hiếu Nguyên', 'Đặng Tuấn Phong', 'Nguyễn Minh Phúc',
'Trần Thu Phương', 'Nguyễn Hoàng Quân', 'Nguyễn Ngọc Thạch', 'Nguyễn Duy Thắng', 'Nguyễn Hưng Thịnh',
'Đào Thủy Tiên', 'Trần Bảo Uyên', 'Tống Mỹ Vãn', 'Trịnh Lê Nguyên Vũ'
];

let html = `<div class="slide slide-centered">\\r\\n        <p class="chapter-label anim" data-delay="0">A5K58 — Thành viên</p>\\r\\n        <p class="slide-desc anim" data-delay="500">Những người đã cùng nhau viết nên câu chuyện này.</p>\\r\\n        <div class="credits-layout">\\r\\n            <div class="credits-wrapper" style="margin-top: 0;">\\r\\n                <div class="credits-scroll">\\r\\n                    <div class="credits-divider"></div>\\r\\n`;
names.forEach(n => {
    html += `                    <p class="credits-name">${n}</p>\\r\\n`;
});
html += `                    <div class="credits-divider"></div>\\r\\n                    <p class="credits-name" style="font-size:0.8rem; color:#999;">GVCN: Nguyễn Thị Vân Anh</p>\\r\\n                    <div class="credits-divider"></div>\\r\\n                </div>\\r\\n            </div>\\r\\n        </div>\\r\\n    </div>`;

data[17] = html; // Index 17 is Thành Viên

fs.writeFileSync('components/admin/slides_data.json', JSON.stringify(data, null, 2));
console.log('Fixed slides_data.json successfully');
