const mongoose = require('mongoose');
const Job = require('./global/models/Job');
require('dotenv').config({ path: './.env' });

const jobTypeMap = {
  'Toàn thời gian': 'Full-time',
  'Bán thời gian': 'Part-time',
  'Thực tập': 'Intern',
  'Internship': 'Intern',
  'Hợp đồng': 'Contract',
  'Tự do': 'Freelance',
  'Thời vụ': 'Freelance',
};

const experienceMap = {
  'Mới vào nghề': 'Fresher',
  'Trung cấp': 'Middle',
  'Cao cấp': 'Senior',
  'Trưởng nhóm/Chuyên gia': 'Tech Lead',
  'Quản lý': 'Manager',
  'Giám đốc bộ phận': 'Director',
  'Cấp điều hành': 'Director',
  'entry': 'Fresher',
  'mid': 'Middle',
  'senior': 'Senior',
  'lead': 'Tech Lead',
  'entry-level': 'Fresher',
  'mid-level': 'Middle',
  'senior-level': 'Senior'
};

const locationTypeMap = {
  'onsite': 'Onsite',
  'remote': 'Remote',
  'hybrid': 'Hybrid'
};

async function migrateJobs() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const jobs = await Job.find({});
    let updatedCount = 0;

    for (let job of jobs) {
      let needsUpdate = false;

      // Allow fuzzy matching or fallback
      let rawJobType = job.jobType;
      let rawExp = job.experienceLevel;
      let rawLoc = job.locationType;

      if (jobTypeMap[rawJobType]) {
        job.jobType = jobTypeMap[rawJobType];
        needsUpdate = true;
      } else if (rawJobType && rawJobType.toLowerCase() === 'internship') {
        job.jobType = 'Intern';
        needsUpdate = true;
      }

      if (experienceMap[rawExp]) {
        job.experienceLevel = experienceMap[rawExp];
        needsUpdate = true;
      }

      if (locationTypeMap[rawLoc]) {
        job.locationType = locationTypeMap[rawLoc];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Job.updateOne({ _id: job._id }, {
          $set: {
            jobType: job.jobType,
            experienceLevel: job.experienceLevel,
            locationType: job.locationType
          }
        }, { runValidators: false });
        updatedCount++;
      }
    }

    console.log('Successfully migrated ' + updatedCount + ' jobs.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateJobs();
