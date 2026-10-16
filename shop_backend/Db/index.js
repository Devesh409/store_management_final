import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js";
import Product from "../Models/productModal.js";
import Sale from "../Models/salesModal.js";
import User from "../Models/userModel.js";
dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri, {
      dbName: DB_NAME,
    });

    // Keep MongoDB indexes aligned with the current schemas. This removes
    // stale indexes such as the old `username_1` and `cust_email_1` indexes
    // from previous versions.
    await Promise.all([
      User.syncIndexes(),
      Sale.syncIndexes(),
      Product.syncIndexes(),
    ]);

    console.log("Connected to MongoDB");
  } catch (error) {
    console.log("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;
