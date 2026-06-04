export function getRecruitmentCode(job) {
  if (job == null || typeof job !== 'object') return '-';
  const raw = job.jobCode ?? job.code ?? job.referenceCode ?? job.id ?? job._id;
  if (raw == null || raw === '') return '-';
  return String(raw);
}

export function sanitizeCompanyDisplayName(name) {
  if (name == null || typeof name !== 'string') return null;
  const t = name.trim();
  if (!t || /^findme-\d+$/i.test(t)) return null;
  return t;
}
