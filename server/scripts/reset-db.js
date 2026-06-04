require('dotenv').config();
const mongoose = require('mongoose');
const { runSeedAdmin } = require('./seed-admin');

async function resetDb() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://127.0.0.1:27017/findme';
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected. Dropping database...');
  await mongoose.connection.dropDatabase();
  console.log('Database dropped successfully.');
  await mongoose.connection.close();
  await runSeedAdmin();
  console.log('Reset completed. Seeded default admin account.');
}

if (require.main === module) {
  resetDb().catch(err => {
    console.error('Reset DB failed:', err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = { resetDb };
