require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../global/models/User');

const adminEmail = 'admin@findme.com';
const adminPassword = 'admin';

async function seedAdmin() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://127.0.0.1:27017/findme';
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const existing = await User.findOne({ email: adminEmail }).select('+password');
  if (existing) {
    existing.role = 'admin';
    existing.accountStatus = 'active';
    existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    existing.password = hashedPassword;
    await existing.save();
    console.log(`Updated existing admin account: ${adminEmail} / ${adminPassword}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({
    firstName: 'Platform',
    lastName: 'Admin',
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    accountStatus: 'active',
    emailVerifiedAt: new Date()
  });
  console.log(`Seeded admin account: ${adminEmail} / ${adminPassword}`);
}

async function runSeedAdmin() {
  await seedAdmin();
  await mongoose.connection.close();
}

if (require.main === module) {
  runSeedAdmin().catch(err => {
    console.error('Seed admin failed:', err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = {
  seedAdmin,
  runSeedAdmin
};
