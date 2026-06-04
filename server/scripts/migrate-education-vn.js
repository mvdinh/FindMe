require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../global/models/User');

function sanitizeEducationText(value) {
  if (value === null || value === undefined) return value;
  let output = String(value).trim();
  output = output.replace(/Graduated\s*:/gi, 'Tốt nghiệp:');
  output = output.replace(/\bCGPA\b/gi, 'GPA');
  return output;
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const normalized = { ...entry };
  normalized.qualification = sanitizeEducationText(normalized.qualification || '');
  normalized.fieldOfStudy = sanitizeEducationText(normalized.fieldOfStudy || '');
  normalized.universityName = sanitizeEducationText(normalized.universityName || '');
  normalized.cgpaPercentage = sanitizeEducationText(normalized.cgpaPercentage || '');
  return normalized;
}

async function run() {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD || 'mongodb://127.0.0.1:27017/findme';
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const users = await User.find({
    'profile.educationEntries.0': { $exists: true }
  }).select('_id profile.educationEntries');
  let updated = 0;
  for (const user of users) {
    const before = JSON.stringify(user.profile?.educationEntries || []);
    const afterEntries = (user.profile?.educationEntries || []).map(normalizeEntry);
    const after = JSON.stringify(afterEntries);
    if (before !== after) {
      user.profile.educationEntries = afterEntries;
      await user.save();
      updated += 1;
    }
  }
  console.log(`Migration done. Updated users: ${updated}/${users.length}`);
}

run()
  .catch(err => {
    console.error('Migration failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
