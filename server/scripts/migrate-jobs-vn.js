require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../global/models/Job');
const { normalizeJobPayload } = require('../global/utils/jobLocalization');

async function run() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://127.0.0.1:27017/findme';
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const jobs = await Job.find({}).select('_id department jobType experienceLevel qualification defaultInterviewRounds salaryRange');
  let updated = 0;

  for (const job of jobs) {
    const before = JSON.stringify({
      department: job.department,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      qualification: job.qualification,
      defaultInterviewRounds: job.defaultInterviewRounds,
      salaryRange: job.salaryRange
    });

    const normalized = normalizeJobPayload({
      department: job.department,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      qualification: job.qualification,
      defaultInterviewRounds: job.defaultInterviewRounds,
      salaryRange: job.salaryRange
    });

    const after = JSON.stringify(normalized);
    if (before !== after) {
      job.department = normalized.department;
      job.jobType = normalized.jobType;
      job.experienceLevel = normalized.experienceLevel;
      job.qualification = normalized.qualification;
      job.defaultInterviewRounds = normalized.defaultInterviewRounds;
      job.salaryRange = normalized.salaryRange;
      await job.save();
      updated += 1;
    }
  }

  console.log(`Job migration done. Updated: ${updated}/${jobs.length}`);
}

run()
  .catch(err => {
    console.error('Job migration failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
