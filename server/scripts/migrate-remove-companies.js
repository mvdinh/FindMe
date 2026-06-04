require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_PROD ||
    'mongodb://127.0.0.1:27017/findme';

  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const db = mongoose.connection.db;

  // Unset legacy company fields
  const usersRes = await db.collection('users').updateMany(
    {},
    { $unset: { company: '', companyId: '', assignedCompanies: '', isCompanyAdmin: '' } }
  );

  const jobsRes = await db.collection('jobs').updateMany({}, { $unset: { company: '' } });
  const notifsRes = await db.collection('notifications').updateMany({}, { $unset: { company: '' } });
  const jscrRes = await db.collection('jobstatuschangerequests').updateMany({}, { $unset: { company: '' } });
  const interviewsRes = await db.collection('interviews').updateMany({}, { $unset: { company: '' } });

  // Drop companies collection if exists
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const hasCompanies = collections.some(c => c.name === 'companies');
  if (hasCompanies) {
    await db.collection('companies').drop();
  }

  console.log('Migration complete.');
  console.log({
    usersModified: usersRes.modifiedCount,
    jobsModified: jobsRes.modifiedCount,
    notificationsModified: notifsRes.modifiedCount,
    jobStatusChangeRequestsModified: jscrRes.modifiedCount,
    interviewsModified: interviewsRes.modifiedCount,
    companiesDropped: hasCompanies
  });

  await mongoose.connection.close();
}

if (require.main === module) {
  run().catch(err => {
    console.error('migrate-remove-companies failed:', err?.message || err);
    process.exitCode = 1;
    try {
      mongoose.connection.close();
    } catch (_) {}
  });
}

module.exports = { run };

