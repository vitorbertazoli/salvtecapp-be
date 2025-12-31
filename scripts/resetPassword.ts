import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as path from 'path';
import * as readline from 'readline';
import { AccountSchema } from '../src/accounts/schemas/account.schema';
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

async function resetPassword() {
  try {
    console.log('🔐 Starting password reset...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Create models
    const Account = mongoose.model('Account', AccountSchema);
    const User = mongoose.model('User', UserSchema);

    // Get user input
    const accountName = await question('Enter account name: ');
    const email = await question('Enter email: ');
    const newPassword = await question('Enter new password: ');

    console.log('\n🔍 Finding user...\n');

    // Find the account
    const account = await Account.findOne({ name: accountName });
    if (!account) {
      console.log('❌ Account not found');
      return;
    }

    // Find the user within the account
    const user = await User.findOne({
      email: email,
      account: account._id
    });

    if (!user) {
      console.log('❌ User not found in the specified account');
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log('🔒 Hashing new password...\n');

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword
    });

    console.log('✅ Password reset successfully!');
    console.log(`🔑 New password set for user: ${user.email} in account: ${accountName}`);

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    // Close readline interface
    rl.close();

    // Close database connection
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
resetPassword().catch(console.error);