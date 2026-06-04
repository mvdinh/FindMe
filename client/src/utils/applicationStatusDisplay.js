
export function isPostInterviewRejection(application) {
  if (!application || application.status !== 'rejected') return false;
  const timeline = Array.isArray(application.timeline) ? application.timeline : [];
  const sorted = [...timeline].sort((a, b) => new Date(a?.date || 0) - new Date(b?.date || 0));
  let sawConfirmed = false;
  for (const item of sorted) {
    if (item?.status === 'interview_confirmed') sawConfirmed = true;
    if (item?.status === 'rejected' && sawConfirmed) return true;
  }
  return false;
}

/** @returns {'Đạt phỏng vấn' | 'Không đạt phỏng vấn' | null} */
export function getInterviewPassFailLabel(application) {
  if (!application) return null;
  const s = application.status;
  if (s === 'interview_passed') return 'Đạt phỏng vấn';
  if (s === 'rejected' && isPostInterviewRejection(application)) return 'Không đạt phỏng vấn';
  return null;
}

/** @returns {'interview_passed' | 'interview_failed' | null} */
export function getInterviewPassFailBadgeKey(application) {
  if (!application) return null;
  const s = application.status;
  if (s === 'interview_passed') return 'interview_passed';
  if (s === 'rejected' && isPostInterviewRejection(application)) return 'interview_failed';
  return null;
}
