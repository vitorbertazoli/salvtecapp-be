import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as path from 'path';
import * as readline from 'readline';
import { UserSchema } from '../src/users/schemas/user.schema';

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function addMasterAdminFlag() {
  try {
    console.log('🚀 Starting master admin flag assignment...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Create User model
    const User = mongoose.model('User', UserSchema);

    // Get user input
    const email = await question('Enter user email to grant master admin privileges: ');

    console.log('\n📦 Searching for user...\n');

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found with the provided email');
      rl.close();
      process.exit(1);
    }

    // Check if user is already a master admin
    if (user.isMasterAdmin) {
      console.log('ℹ️  User is already a master admin');
      rl.close();
      process.exit(0);
    }

    // Update user to be master admin
    user.isMasterAdmin = true;
    await user.save();

    console.log(`✅ Successfully granted master admin privileges to:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Account: ${(user.account as any)?.name || 'N/A'}`);
    console.log(`   Status: ${user.status}\n`);

    console.log('🎉 Master admin flag assigned successfully!');
    console.log('The user will now have master admin privileges in their JWT token.\n');

    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error assigning master admin flag:', error);
    await mongoose.disconnect();
    rl.close();
    process.exit(1);
  }
}

addMasterAdminFlag();