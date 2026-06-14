const mongoose = require('mongoose');
const Job = require('./server/global/models/Job');
require('dotenv').config({ path: './server/.env' });

const jobTypeMap = {
  'Toàn thời gian': 'Full-time',
  'Bán thời gian': 'Part-time',
  'Thực tập': 'Intern',
  'Internship': 'Intern',
  'Hợp đồng': 'Contract',
  'Tự do': 'Freelance',
  'Thời vụ': 'Freelance', // Map temporary/thời vụ to Freelance or Part-time since Temporary was removed
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
  'lead': 'Tech Lead'
};

const locationTypeMap = {
  'onsite': 'Onsite',
  'remote': 'Remote',
  'hybrid': 'Hybrid'
};

async function migrateJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const jobs = await Job.find({});
    let updatedCount = 0;

    for (let job of jobs) {
      let needsUpdate = false;

      if (jobTypeMap[job.jobType]) {
        job.jobType = jobTypeMap[job.jobType];
        needsUpdate = true;
      }

      if (experienceMap[job.experienceLevel]) {
        job.experienceLevel = experienceMap[job.experienceLevel];
        needsUpdate = true;
      }

      if (locationTypeMap[job.locationType]) {
        job.locationType = locationTypeMap[job.locationType];
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Disable validation for the migration to bypass any other strict rules
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

    console.log(`Successfully migrated ${updatedCount} jobs.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateJobs();
