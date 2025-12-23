import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as path from 'path';
import * as readline from 'readline';
import { AccountSchema } from '../src/accounts/schemas/account.schema';
import { EquipmentTypeSchema } from '../src/equipmentType/schemas/equipment-type.schema';
import { RoleSchema } from '../src/roles/schemas/role.schema';
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

async function initDB() {
  try {
    console.log('🚀 Starting database initialization...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Create models
    const Account = mongoose.model('Account', AccountSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const User = mongoose.model('User', UserSchema);
    const EquipmentType = mongoose.model('EquipmentType', EquipmentTypeSchema);

    // Get user input
    let accountName = await question('Enter account name: ');
    const firstName = await question('Enter admin first name: ');
    const lastName = await question('Enter admin last name: ');
    const email = await question('Enter admin email: ');
    const username = await question('Enter admin username: ');
    const password = await question('Enter admin password: ');

    console.log('\n📦 Creating database entries...\n');

    let adminRole = await Role.findOne({ name: 'ADMIN' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'ADMIN',
        description: 'Administrator with full account access',
        createdBy: 'system',
        updatedBy: 'system'
      });
      console.log('✅ Created ADMIN role');
    } else {
      console.log('ℹ️  ADMIN role already exists');
    }
    let supervisorRole = await Role.findOne({ name: 'SUPERVISOR' });
    if (!supervisorRole) {
      supervisorRole = await Role.create({
        name: 'SUPERVISOR',
        description: 'Supervisor with limited management access',
        createdBy: 'system',
        updatedBy: 'system'
      });
      console.log('✅ Created SUPERVISOR role');
    } else {
      console.log('ℹ️  SUPERVISOR role already exists');
    }
    let technicianRole = await Role.findOne({ name: 'TECHNICIAN' });
    if (!technicianRole) {
      technicianRole = await Role.create({
        name: 'TECHNICIAN',
        description: 'Technician with access to assigned tasks',
        createdBy: 'system',
        updatedBy: 'system'
      });
      console.log('✅ Created TECHNICIAN role');
    } else {
      console.log('ℹ️  TECHNICIAN role already exists');
    }

    // Create account
    // convert account name to lowercase and replace spaces and special characters with dashes for uniqueness
    accountName = accountName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingAccount = await Account.findOne({ name: accountName });
    if (existingAccount) {
      console.log(`❌ Account with the name ${accountName} already exists`);
      rl.close();
      process.exit(1);
    }

    const account = await Account.create({
      name: accountName,
      plan: 'pro',
      billingInfo: {},
      createdBy: 'system',
      updatedBy: 'system'
    });
    console.log(`✅ Created account: ${account.name}`);

    // Create admin user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User with this email already exists');
      rl.close();
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      account: account._id,
      firstName,
      lastName,
      email,
      passwordHash,
      username,
      status: 'active',
      roles: [adminRole._id],
      createdBy: 'system',
      updatedBy: 'system'
    });
    console.log(`✅ Created admin user: ${user.email}`);

    // Create global equipment types
    const equipmentTypes = [
      { name: 'Ar Condicionado Split', description: 'Split air conditioning system' },
      { name: 'Ar Condicionado Janela', description: 'Window air conditioning unit' },
      { name: 'Ar Condicionado Cassete', description: 'Cassette air conditioning system' },
      { name: 'Ar Condicionado Piso Teto', description: 'Floor-ceiling air conditioning system' },
      { name: 'Ventilador', description: 'Fan unit' },
      { name: 'Exaustor', description: 'Exhaust fan' }
    ];

    for (const typeData of equipmentTypes) {
      const existing = await EquipmentType.findOne({ name: typeData.name });
      if (!existing) {
        await EquipmentType.create({
          name: typeData.name,
          description: typeData.description,
          isActive: true,
          createdBy: user._id.toString(),
          updatedBy: user._id.toString()
        });
        console.log(`✅ Created equipment type: ${typeData.name}`);
      }
    }

    console.log('\n🎉 Database initialization completed successfully!\n');
    console.log('You can now login with:');
    console.log(`  Account: ${accountName}`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}\n`);

    await mongoose.disconnect();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    await mongoose.disconnect();
    rl.close();
    process.exit(1);
  }
}

initDB();
