import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const clearHallsData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear halls collection
    await mongoose.connection.db.collection('halls').deleteMany({});
    console.log("✅ Cleared all halls");

    // Clear hall messages collection
    await mongoose.connection.db.collection('hallmessages').deleteMany({});
    console.log("✅ Cleared all hall messages");

    console.log("🎉 All hall data cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

clearHallsData();