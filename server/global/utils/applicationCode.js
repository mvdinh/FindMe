function getRecruitmentCodeFromJob(job) {
  if (!job || typeof job !== 'object') return '';
  const raw = job.jobCode ?? job.code ?? job.referenceCode ?? job._id ?? job.id;
  if (raw == null || raw === '') return '';
  return String(raw);
}

function enrichApplicationForApplicantList(app) {
  if (!app || typeof app !== 'object') return app;
  const out = {
    ...app
  };
  out.recruitmentCode = getRecruitmentCodeFromJob(out.job);
  return out;
}

module.exports = {
  getRecruitmentCodeFromJob,
  enrichApplicationForApplicantList
};
