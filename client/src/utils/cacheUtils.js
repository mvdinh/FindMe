const CACHE_PREFIXES = {
  JOBS: 'findme_jobs_',
  JOB_DETAILS: 'findme_job_details_',
  PROFILE: 'findme_profile_'
};
const CACHE_DURATIONS = {
  JOBS: 5 * 60 * 1000,
  JOB_DETAILS: 10 * 60 * 1000,
  PROFILE: 15 * 60 * 1000
};
export { CACHE_PREFIXES, CACHE_DURATIONS };
