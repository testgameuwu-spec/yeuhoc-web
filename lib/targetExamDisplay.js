const WISHES = [
  'Hãy ăn đủ bữa, ngủ đủ giấc mới có sức để ôn thi nhé bạn hiền.',
  'Học ngày, học đêm, học quên cả ngủ.',
  'Hãy bình tĩnh, tự tin để làm bài thật tốt, tất cả mọi người đều tin tưởng ở bạn.',
  'Đỗ Đại học nhé, bạn của tôi ơi. Chúc cho những ước mơ của bạn thành hiện thực.',
  'Mùa thi xin chúc bạn có: Giấy báo về nhà, chuẩn bị xôi gà, và sẽ phải xa nhà!',
  'Các bạn của tôi ơi, thi tốt nhé. Hẹn gặp lại ở cổng trường đại học.',
  'Vấn đề của bạn là tránh quên kiến thức 3 năm qua, chứ không phải nhồi thêm kiến thức trong một vài ngày. Vững tâm lý nào, tôi biết bạn làm được mà!',
  'Cầu trời cho bạn con thi thật tốt!🙏',
  'Mã Đáo Thành Công!'
];

export function getLocalDaysUntil(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(year, month - 1, day);
  return Math.round((targetDate - today) / 86400000);
}

export function formatTargetExamDate(dateString) {
  if (!dateString) return 'Chưa đặt ngày';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('vi-VN');
}

export function getCountdownSentence(exam) {
  const diff = getLocalDaysUntil(exam?.examDate);
  if (diff === null) return 'Kỳ thi của bạn chưa có ngày thi.';
  if (diff >= 0) return `Kỳ thi: ${exam.name} của bạn còn ${diff} ngày nữa!`;
  return `Kỳ thi: ${exam.name} của bạn đã diễn ra ${Math.abs(diff)} ngày trước.`;
}

export function findNearestTargetExam(exams) {
  const validExams = (exams || [])
    .map((exam) => ({ exam, days: getLocalDaysUntil(exam.examDate) }))
    .filter((item) => item.days !== null);

  const upcoming = validExams
    .filter((item) => item.days >= 0)
    .sort((a, b) => a.days - b.days || a.exam.name.localeCompare(b.exam.name));

  if (upcoming.length > 0) return upcoming[0].exam;

  const past = validExams
    .filter((item) => item.days < 0)
    .sort((a, b) => b.days - a.days || a.exam.name.localeCompare(b.exam.name));

  return past[0]?.exam || null;
}

export function getRandomWish() {
  return WISHES[Math.floor(Math.random() * WISHES.length)];
}
