import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function migrateEventTechnicians() {
  try {
    console.log('🚀 Starting event technicians migration...\n');

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables.');
      process.exit(1);
    }

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('❌ Database connection not established properly.');
      process.exit(1);
    }

    const collection = db.collection('events');

    // Find documents that have technician as ObjectId (not array)
    const cursor = collection.find({
      technician: { $exists: true, $ne: null, $type: 'objectId' }
    });

    let count = 0;
    let modified = 0;

    console.log('Processing documents...');

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      count++;
      const technicianId = doc.technician;

      // Update the document to make technician an array
      await collection.updateOne({ _id: doc._id }, { $set: { technician: [technicianId] } });

      modified++;

      if (count % 100 === 0) {
        process.stdout.write(`\rProcessed: ${count}`);
      }
    }

    console.log(`\n\n✅ Migration completed.`);
    console.log(`Found ${count} documents with technician as single ObjectId.`);
    console.log(`Updated ${modified} documents.`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  }
}

migrateEventTechnicians();
