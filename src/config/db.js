const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }
    // ✅ Remove deprecated options – just pass URI
    cached.promise = mongoose.connect(uri).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;