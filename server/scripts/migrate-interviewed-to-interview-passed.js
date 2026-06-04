
require('dotenv').config();
const mongoose = require('mongoose');
const Application = require('../global/models/Application');

const LEGACY = 'interviewed';
const NEXT = 'interview_passed';

async function main() {
  const uri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI_PROD (hoặc MONGODB_URI / MONGO_URI) trong .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const col = Application.collection;

  const top = await col.updateMany({ status: LEGACY }, { $set: { status: NEXT } });
  const tl = await col.updateMany(
    { 'timeline.status': LEGACY },
    { $set: { 'timeline.$[t].status': NEXT } },
    { arrayFilters: [{ 't.status': LEGACY }] }
  );
  console.log('migrate interviewed → interview_passed:', {
    applicationsMatched: top.matchedCount,
    applicationsModified: top.modifiedCount,
    timelineDocsMatched: tl.matchedCount,
    timelineDocsModified: tl.modifiedCount
  });
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
