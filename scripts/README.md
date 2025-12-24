# Database Scripts

This folder contains scripts for managing and populating the database.

## Available Scripts

### Initialize Database (`initDB.ts`)
Creates the initial database structure with a default account, roles, and admin user.

```bash
npm run initDB
```

### Generate Dummy Data (`dummyData.ts`)
Populates the database with realistic test data for development and testing purposes.

**What it does:**
- Asks for an account name to populate data for
- Checks if the account exists (must be created with `initDB.ts` first)
- Deletes all existing data for that account (except users)
- Creates dummy data including:
  - Addresses
  - Technicians
  - Customers (clients)
  - Services
  - Products
  - Quotes
  - Service Orders
  - Events
  - Follow-ups

```bash
npm run dummyData <account-name>
```

Example:
```bash
npm run dummyData mycompany
```

## Dummy Data Generation

The `dummyData.ts` script generates comprehensive test data including:

### Data Generated

| Entity | Default Count | Description |
|--------|---------------|-------------|
| **Technicians** | 5 | Service technicians with addresses and contact info |
| **Customers** | 20 | Customer profiles with CPF, addresses, and assigned technicians |
| **Services** | 15 | Service catalog items (installations, maintenance, repairs) |
| **Products** | 25 | Product inventory (filters, gas, parts, equipment) |
| **Equipment** | 40-80 | Customer equipment (1-4 per customer) |
| **Quotes** | 10 | Price quotes with services and products |
| **Service Orders** | 8 | Work orders linked to accepted quotes |
| **Events** | 15-40 | Calendar appointments (3-8 per technician) |

### Features

- **Brazilian Localization**: Uses `pt_BR` locale for realistic names, addresses, and data
- **Valid CPF Generation**: Creates properly formatted and validated Brazilian CPF numbers
- **Realistic Relationships**: Links customers to technicians, equipment to customers, quotes to service orders, etc.
- **Status Variety**: Includes various statuses (active/inactive, pending/completed, etc.)
- **Time-based Data**: Events span past 30 days to future 60 days
- **Configurable Amounts**: Edit the `CONFIG` object in `dummyData.ts` to adjust quantities

### Configuration

To customize the amount of data generated, edit the `CONFIG` object at the top of `dummyData.ts`:

```typescript
const CONFIG = {
  customers: 20,              // Number of customers to create
  technicians: 5,             // Number of technicians to create
  services: 15,               // Number of services to create
  products: 25,               // Number of products to create
  equipmentsPerCustomer: {    // Range of equipment per customer
    min: 1,
    max: 4
  },
  quotes: 10,                 // Number of quotes to create
  serviceOrders: 8,           // Number of service orders to create
  eventsPerTechnician: {      // Range of events per technician
    min: 3,
    max: 8
  },
};
```

### Data Clearing

⚠️ **Warning**: By default, the script clears existing data for the account before generating new data. 

To keep existing data and only add new data, comment out the data clearing section:

```typescript
// Comment out this section in dummyData.ts:
// await Promise.all([
//   Event.deleteMany({ account: accountId }),
//   ServiceOrder.deleteMany({ account: accountId }),
//   // ... etc
// ]);
```

### Requirements

- An existing account must be in the database (created by `initDB.ts`)
- MongoDB connection configured in `.env.local`
- Node.js and npm installed

### Example Output

```
🚀 Starting dummy data generation...

✅ Using account: Servyzo Demo (507f1f77bcf86cd799439011)

🗑️  Clearing existing data...
✅ Existing data cleared

👷 Creating 5 technicians...
✅ Created 5 technicians

👥 Creating 20 customers...
✅ Created 20 customers

🔧 Creating 15 services...
✅ Created 15 services

📦 Creating 25 products...
✅ Created 25 products

❄️  Creating equipment for customers...
✅ Created 52 equipment items

💰 Creating 10 quotes...
✅ Created 10 quotes

📋 Creating 8 service orders...
✅ Created 8 service orders

📅 Creating calendar events...
✅ Created 28 calendar events

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ SUMMARY - Dummy Data Created Successfully

👷 Technicians:     5
👥 Customers:       20
🔧 Services:        15
📦 Products:        25
❄️  Equipment:       52
💰 Quotes:          10
📋 Service Orders:  8
📅 Events:          28
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Done! Your application is now populated with test data.

👋 Database connection closed.
```

## Troubleshooting

### "No account found" error
Run `npm run init` first to create the initial account and admin user.

### MongoDB connection error
Check your `.env.local` file and ensure `MONGODB_URI` is correctly set.

### TypeScript errors
Ensure all dependencies are installed with `npm install`.
