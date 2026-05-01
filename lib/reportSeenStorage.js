const STORAGE_KEY = 'yeuhoc_seen_resolved_report_ids';

export function getSeenResolvedReportIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markResolvedReportsAsSeen(reportIds) {
  if (typeof window === 'undefined' || !reportIds?.length) return;
  const set = getSeenResolvedReportIds();
  reportIds.forEach((id) => {
    if (id) set.add(id);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new Event('yeuhoc-reports-seen'));
}

export function countUnseenResolvedReports(reports) {
  if (!reports?.length) return 0;
  const seen = getSeenResolvedReportIds();
  return reports.filter((r) => r.status === 'resolved' && r.id && !seen.has(r.id)).length;
}
