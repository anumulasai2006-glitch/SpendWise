const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spendwise';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`✅ MongoDB Connected to: ${mongoose.connection.host || uri}`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Could not connect to MongoDB at "${uri}": ${err.message}`);
    console.log('💡 Tip: Configure your MongoDB Atlas connection string in .env (MONGODB_URI) or start local MongoDB.');
    return false;
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log('MongoDB disconnected.');
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
};

module.exports = { connectDB, disconnectDB };
