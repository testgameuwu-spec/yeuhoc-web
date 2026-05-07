const WISHES = [
  'Mã đáo thành công!',
  'Chúc bạn may mắn!',
  'Bình tĩnh, tự tin, làm bài thật tốt!',
  'Chúc bạn bứt phá trong kỳ thi này!',
  'Giữ vững phong độ đến ngày thi!',
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

export function getStableWish(seed = '') {
  const todayKey = new Date().toISOString().slice(0, 10);
  const source = `${seed}-${todayKey}`;
  const hash = source.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return WISHES[hash % WISHES.length];
}
