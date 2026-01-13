
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function migratePhoneNumbers() {
  try {
    console.log('🚀 Starting phone number migration...\n');

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

    const collection = db.collection('customers');

    // Find documents that have the legacy phoneNumber field
    // We use the raw driver to avoid schema strict mode issues regarding the deprecated field
    const cursor = collection.find({ phoneNumber: { $exists: true, $ne: null } });

    let count = 0;
    let modified = 0;

    console.log('Processing documents...');

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      count++;
      const oldPhone = doc.phoneNumber;
      let newPhones = doc.phoneNumbers || [];

      // Ensure newPhones is an array
      if (!Array.isArray(newPhones)) {
        newPhones = [];
      }

      let shouldUpdate = false;

      // Migrate the old value if it's not already in the list
      if (oldPhone && typeof oldPhone === 'string' && !newPhones.includes(oldPhone)) {
        newPhones.push(oldPhone);
        shouldUpdate = true;
      }

      // We always want to unset the old field even if we didn't add it (e.g. it was already there)
      // But we only proceed if we have a valid doc ID
      if (doc._id) {
        const updateOp: any = {
          $unset: { phoneNumber: "" }
        };

        if (shouldUpdate) {
          updateOp.$set = { phoneNumbers: newPhones };
        } else if (!doc.phoneNumbers && newPhones.length > 0) {
          // Case where phoneNumbers didn't exist but we want to initialize it? 
          // Actually, if shouldUpdate is false, it means oldPhone was already in newPhones 
          // OR oldPhone was invalid.
          // If oldPhone was already in newPhones, we might want to ensure properties are set if they were missing, 
          // but the requirement is mainly to move data.
        }

        await collection.updateOne({ _id: doc._id }, updateOp);
        modified++;
      }

      if (count % 100 === 0) {
        process.stdout.write(`\rProcessed: ${count}`);
      }
    }

    console.log(`\n\n✅ Migration completed.`);
    console.log(`Found ${count} documents with legacy field.`);
    console.log(`Updated ${modified} documents.`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  }
}

migratePhoneNumbers();
