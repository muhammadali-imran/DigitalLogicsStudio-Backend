const mongoose = require("mongoose");

async function cleanupStaleUserIndexes() {
  try {
    const User = require("../models/User");
    const indexes = await User.collection.indexes();

    for (const index of indexes) {
      if (index.key?.username) {
        await User.collection.dropIndex(index.name);
        console.log(`[db] Dropped stale username index: ${index.name}`);
      }
    }

    await User.syncIndexes();
  } catch (err) {
    console.warn("[db] Could not clean up user indexes:", err.message);
  }
}

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  const connection = await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log(`MongoDB connected: ${connection.connection.host}`);
  await cleanupStaleUserIndexes();
};

module.exports = connectDB;
