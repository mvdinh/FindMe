const mongoose = require('mongoose');
require('dotenv').config();

const Job = require('../global/models/Job');
const JobStatusChangeRequest = require('../global/models/JobStatusChangeRequest');

const run = async () => {
  try {
    const fallbackLocal = 'mongodb://127.0.0.1:27017/findme';
    const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || fallbackLocal;
    console.log(`Connecting to Database: ${mongoURI.replace(/:\/\/([^@]+)@/, '://***@')}`);
    
    await mongoose.connect(mongoURI, { family: 4 });
    console.log('Connected to Database');

    // Find all jobs that are active
    const activeJobs = await Job.find({ status: 'active' });
    console.log(`Found ${activeJobs.length} active jobs in DB.`);
    const activeJobIds = activeJobs.map(j => j._id);

    // Update any pending status requests for these jobs to 'approved'
    const result = await JobStatusChangeRequest.updateMany(
      { job: { $in: activeJobIds }, reviewStatus: 'pending' },
      {
        $set: {
          reviewStatus: 'approved',
          reviewNote: 'Hệ thống tự động đồng bộ (tin tuyển dụng đã ở trạng thái hoạt động).'
        }
      }
    );

    console.log(`Successfully updated ${result.modifiedCount} stale pending requests.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

run();
