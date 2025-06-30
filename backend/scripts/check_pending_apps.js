const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const CommunityMember = require('../backend/models/CommunityMember'); 
const db = require('../backend/config/database');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const checkApplications = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in .env file');
    process.exit(1);
  }

  try {
    await db.connectDB();
    console.log('MongoDB Connected...');

    const recentApplications = await CommunityMember.find({})
      .sort({ applicationDate: -1 }) 
      .limit(5);

    if (recentApplications.length > 0) {
      console.log('Most recent 5 applications:');
      console.log(JSON.stringify(recentApplications, null, 2));
    } else {
      console.log('No applications found in the database.');
    }

  } catch (error) {
    console.error('Error checking applications:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
};

checkApplications(); 