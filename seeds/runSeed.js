require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const seedCategories = require('./seedCategories');

async function run() {
  try {
    await connectDB();
    await seedCategories();
    console.log('✅ Seeding completed.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

run();
