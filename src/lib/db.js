import mongoose from "mongoose";

const connection = {};

async function dbConnect() {
  if (connection.isConnected) {
    console.log("✅ Already connected to MongoDB");
    return;
  }

  try {
    console.log("🔗 Connecting to MongoDB...");
    const db = await mongoose.connect(process.env.MONGO_URI); // Removed deprecated options
    connection.isConnected = db.connections[0].readyState;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("MongoDB connection failed");
  }
}

export default dbConnect;
