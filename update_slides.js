const fs = require('fs');
const path = 'components/admin/slides_data.json';
let slides = JSON.parse(fs.readFileSync(path, 'utf8'));
slides[15] = `    <div class="slide">
        <h2 class="anim" data-delay="300">Vinh Danh Cá Nhân</h2>
        <p class="slide-desc anim" data-delay="500">Những cá nhân xuất sắc với thành tích nổi bật đáng tự hào.</p>

        <div class="vinhdanh-carousel anim" data-delay="700" id="vdCarousel">
            <button class="vd-nav prev" id="vdPrev" onclick="vdPrev()">‹</button>
            <div id="vdTrack" style="width: 100%; height: 100%; position: absolute;">
                <div class="personal-award-card">
                    <div class="card-photo"><img src="/recap/haiminhvd.png" alt="Trần Hải Minh"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">Trần Hải Minh</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">120 HSA<br> IELTS 7.0<br> Trợ giảng Yêu Học <br> Trợ giảng HCTK</div>
                        </div>
                    </div>
                </div>
                <div class="personal-award-card">
                    <div class="card-photo"><img src="/recap/hieunguyenvinhdanh.png" alt="Đặng Hiếu Nguyên"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">Đặng Hiếu Nguyên</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">HSK 6<br> IELTS 7.0 <br> Cổ đông Yêu Học</div>
                        </div>
                    </div>
                </div>
                <div class="personal-award-card">
                    <div class="card-photo"><img src="/recap/nhatduyvinhdanh.png" alt="Nguyễn Nhật Duy"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">Nguyễn Nhật Duy</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">Giải Nhất HSG Toán TP Hà Nội<br> Trợ giảng ÁiTDM<br> Trợ giảng Yêu Học</div>
                        </div>
                    </div>
                </div>
                <div class="personal-award-card">
                    <div class="card-photo"><img src="/recap/duyminhvinhdanh.png" alt="Phạm Duy Minh"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">Phạm Duy Minh</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">1590 SAT<br> IELTS 7.5<br> Giám đốc Yêu Học</div>
                        </div>
                    </div>
                </div>
                <div class="personal-award-card">
                    <div class="card-photo"><img src="/recap/hainamvinhdanh.png" alt="Trần Hoàng Hải Nam"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">Trần Hoàng Hải Nam</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">112 HSA<br> IELTS 7.5<br> Trợ Giảng Yêu Học <br> Trợ giảng HCTK</div>
                        </div>
                    </div>
                </div>
                <div class="personal-award-card">
                    <div class="card-photo"><img src="/recap/quanganhvinhdanh.png" alt="Nguyễn Quang Anh"></div>
                    <div class="card-info-wrap">
                        <div class="card-name">Nguyễn Quang Anh</div>
                        <div class="card-name-divider"></div>
                        <div class="card-achievements">
                            <div class="ach-label">Thành Tích</div>
                            <div class="ach-text">Bố của các thành viên trên</div>
                        </div>
                    </div>
                </div>
            </div>
            <button class="vd-nav next" id="vdNext" onclick="vdNext()">›</button>
        </div>
    </div>`;
fs.writeFileSync(path, JSON.stringify(slides, null, 2), 'utf8');
console.log('Done');
