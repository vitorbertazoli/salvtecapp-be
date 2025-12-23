import { faker } from '@faker-js/faker/locale/pt_BR';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'path';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Import existing schemas
import { AccountSchema } from '../src/accounts/schemas/account.schema';
import { CustomerSchema } from '../src/customers/schemas/customer.schema';
import { ProductSchema } from '../src/products/schemas/product.schema';
import { RoleSchema } from '../src/roles/schemas/role.schema';
import { ServiceSchema } from '../src/services/schemas/service.schema';
import { TechnicianSchema } from '../src/technicians/schemas/technician.schema';
import { UserSchema } from '../src/users/schemas/user.schema';

// Define missing schemas
const AddressSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    street: { type: String, required: true },
    number: { type: String, required: true },
    complement: { type: String },
    neighborhood: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'Brazil' },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);

const QuoteSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    equipments: [],
    services: [
      {
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
        quantity: { type: Number, required: true },
        unitValue: { type: Number, required: true }
      }
    ],
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        unitValue: { type: Number, required: true }
      }
    ],
    totalValue: { type: Number, required: true },
    description: { type: String },
    discount: { type: Number },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
    validUntil: { type: Date, required: true },
    issuedAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);

const ServiceOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    equipments: [],
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    items: [
      {
        type: { type: String, enum: ['service', 'product'], required: true },
        itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, required: true },
        unitValue: { type: Number, required: true },
        totalValue: { type: Number, required: true }
      }
    ],
    description: { type: String },
    discount: { type: Number },
    subtotal: { type: Number, required: true },
    totalValue: { type: Number, required: true },
    issuedAt: { type: Date, required: true },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
    status: { type: String, enum: ['pending', 'scheduled', 'completed', 'cancelled'], default: 'pending' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    notes: { type: String },
    customerNotes: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid', 'refunded'], default: 'pending' },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);

const EventSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    serviceOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOrder' },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);

const FollowUpSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending', index: true },
    completedAt: { type: Date },
    completedBy: { type: String },
    notes: { type: String, trim: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const CONFIG = {
  customers: 120,
  technicians: 15,
  services: 15,
  products: 25,
  equipmentsPerCustomer: { min: 1, max: 4 },
  quotes: 200,
  serviceOrders: 80,
  eventsPerTechnician: { min: 3, max: 8 },
  followUps: 100
};

// Helper function to generate Brazilian CPF (unformatted)
function generateCPF(): string {
  const n1 = Math.floor(Math.random() * 10);
  const n2 = Math.floor(Math.random() * 10);
  const n3 = Math.floor(Math.random() * 10);
  const n4 = Math.floor(Math.random() * 10);
  const n5 = Math.floor(Math.random() * 10);
  const n6 = Math.floor(Math.random() * 10);
  const n7 = Math.floor(Math.random() * 10);
  const n8 = Math.floor(Math.random() * 10);
  const n9 = Math.floor(Math.random() * 10);

  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

// Helper function to generate Brazilian phone number (unformatted)
function generatePhone(): string {
  const ddd = faker.helpers.arrayElement(['11', '21', '27', '31', '41', '47', '48', '51', '61', '71', '81', '85']);
  const prefix = faker.helpers.arrayElement(['9', '8', '7']);
  const number = faker.string.numeric(4) + faker.string.numeric(4);
  return `${ddd}${prefix}${number}`;
}

// Helper function to generate Brazilian ZIP code (unformatted)
function generateZipCode(): string {
  return faker.string.numeric(5) + faker.string.numeric(3);
}

function getServiceOrderStatus() {
  const status = faker.helpers.arrayElement(['pending', 'scheduled', 'completed', 'cancelled']);
  if (status === 'completed') {
    return {
      status,
      completedAt: faker.date.recent({ days: 10 })
    };
  }
  return { status };
}

// Helper to create addresses
async function createAddress(accountId: mongoose.Types.ObjectId, createdBy: string): Promise<mongoose.Types.ObjectId> {
  const address = await Address.create({
    account: accountId,
    street: faker.location.street(),
    number: faker.location.buildingNumber(),
    complement: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.3 }),
    neighborhood: faker.location.county(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: generateZipCode(),
    country: 'Brazil',
    createdBy,
    updatedBy: createdBy
  });
  return address._id;
}

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function populateDummyData() {
  try {
    console.log('🚀 Starting dummy data generation...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Create models
    const Account = mongoose.model('Account', AccountSchema);
    const Role = mongoose.model('Role', RoleSchema);
    const User = mongoose.model('User', UserSchema);
    const Customer = mongoose.model('Customer', CustomerSchema);
    const Product = mongoose.model('Product', ProductSchema);
    const Service = mongoose.model('Service', ServiceSchema);
    const Technician = mongoose.model('Technician', TechnicianSchema);
    const Address = mongoose.model('Address', AddressSchema);
    const Quote = mongoose.model('Quote', QuoteSchema);
    const ServiceOrder = mongoose.model('ServiceOrder', ServiceOrderSchema);
    const Event = mongoose.model('Event', EventSchema);
    const FollowUp = mongoose.model('FollowUp', FollowUpSchema);

    // Ask for the account name to associate data
    let accountName = await question('Enter account name: ');

    // Find existing account or use the first one
    // convert account name to lowercase and replace spaces and special characters with dashes for uniqueness
    accountName = accountName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let account = await Account.findOne({ name: accountName });
    if (!account) {
      account = await Account.create({ name: accountName, createdBy: 'system', updatedBy: 'system' });
      console.log('❌ No account found. Created a new one.');
    }

    const accountId = account._id;
    const createdBy = 'system';
    console.log(`✅ Using account: ${account.name} (${accountId})\n`);

    // Clear existing data for this account (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Event.deleteMany({ account: accountId }),
      ServiceOrder.deleteMany({ account: accountId }),
      Quote.deleteMany({ account: accountId }),
      Product.deleteMany({ account: accountId }),
      Service.deleteMany({ account: accountId }),
      Customer.deleteMany({ account: accountId }),
      Technician.deleteMany({ account: accountId }),
      User.deleteMany({ account: accountId }),
      Address.deleteMany({ account: accountId }),
      FollowUp.deleteMany({ account: accountId })
    ]);
    console.log('✅ Existing data cleared\n');

    // Create admin user after clearing data
    let adminUser = await User.findOne({ username: 'admin', account: accountId });

    if (!adminUser) {
      const adminRole = await Role.findOne({ name: 'ADMIN' }); // this should exist from initDB.ts
      const hashedPassword = await bcrypt.hash('password123', 10);
      adminUser = await User.create({
        account: account._id,
        firstName: 'Admin',
        lastName: 'User',
        email: `admin@${accountName}.com.br`,
        passwordHash: hashedPassword,
        username: 'admin',
        status: 'active',
        roles: [adminRole._id],
        createdBy: 'system',
        updatedBy: 'system'
      });
      console.log(`✅ Created admin user: ${adminUser.email}`);
    }

    // Create supervisor user after clearing data
    let supervisorUser = await User.findOne({ username: 'supervisor', account: accountId });
    if (!supervisorUser) {
      const supervisorRole = await Role.findOne({ name: 'SUPERVISOR' }); // this should exist from initDB.ts
      const hashedPassword = await bcrypt.hash('password123', 10);
      supervisorUser = await User.create({
        account: account._id,
        firstName: 'Supervisor',
        lastName: 'User',
        email: `supervisor@${accountName}.com.br`,
        passwordHash: hashedPassword,
        username: 'supervisor',
        status: 'active',
        roles: [supervisorRole._id],
        createdBy: 'system',
        updatedBy: 'system'
      });
      console.log(`✅ Created supervisor user: ${supervisorUser.email}\n`);
    }

    // Create technician user after clearing data
    let technicianUser = await User.findOne({ username: 'technician', account: accountId });
    if (!technicianUser) {
      const technicianRole = await Role.findOne({ name: 'TECHNICIAN' }); // this should exist from initDB.ts
      const hashedPassword = await bcrypt.hash('password123', 10);
      technicianUser = await User.create({
        account: account._id,
        firstName: 'Technician',
        lastName: 'User',
        email: `technician@${accountName}.com.br`,
        passwordHash: hashedPassword,
        username: 'technician',
        status: 'active',
        roles: [technicianRole._id],
        createdBy: 'system',
        updatedBy: 'system'
      });
      console.log(`✅ Created technician user: ${technicianUser.email}\n`);
    }

    // 1. Create Technicians
    console.log(`👷 Creating ${CONFIG.technicians} technicians...`);
    const technicians = [];
    for (let i = 0; i < CONFIG.technicians; i++) {
      const addressId = await createAddress(accountId, createdBy);
      const technician = await Technician.create({
        account: accountId,
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        cpf: generateCPF(),
        status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive']),
        startDate: faker.date.past({ years: 2 }),
        address: addressId,
        phoneNumber: generatePhone(),
        createdBy,
        updatedBy: createdBy
      });
      technicians.push(technician);
    }
    console.log(`✅ Created ${technicians.length} technicians\n`);

    // 2. Create Customers
    console.log(`👥 Creating ${CONFIG.customers} customers...`);
    const customers = [];
    const equipmentTypes = ['Ar Condicionado Split', 'Ar Condicionado Janela', 'Ar Condicionado Cassete', 'Ar Condicionado Piso Teto'];
    const rooms = ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Escritório', 'Varanda'];
    for (let i = 0; i < CONFIG.customers; i++) {
      const addressId = await createAddress(accountId, createdBy);
      const numEquipments = faker.number.int(CONFIG.equipmentsPerCustomer);
      const equipments = [];
      for (let j = 0; j < numEquipments; j++) {
        equipments.push({
          name: `${faker.helpers.arrayElement(equipmentTypes)} - ${faker.helpers.arrayElement(rooms)}`,
          room: faker.helpers.arrayElement(rooms),
          btus: faker.helpers.arrayElement([9000, 12000, 18000, 24000]),
          type: faker.helpers.arrayElement(equipmentTypes),
          subType: faker.lorem.word(),
          maker: faker.company.name(),
          model: faker.vehicle.model(),
          createdBy,
          updatedBy: createdBy
        });
      }
      const customer = await Customer.create({
        account: accountId,
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        cpf: generateCPF(),
        status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive', 'suspended']),
        phoneNumber: generatePhone(),
        technicianResponsible: faker.helpers.arrayElement(technicians)._id,
        address: addressId,
        equipments,
        createdBy,
        updatedBy: createdBy
      });
      customers.push(customer);
    }
    console.log(`✅ Created ${customers.length} customers\n`);

    // 3. Create Services
    console.log(`🔧 Creating ${CONFIG.services} services...`);
    const services = [];
    const serviceNames = [
      'Instalação de Ar Condicionado',
      'Manutenção Preventiva',
      'Limpeza de Filtros',
      'Recarga de Gás',
      'Troca de Compressor',
      'Instalação Elétrica',
      'Manutenção Corretiva',
      'Higienização Completa',
      'Troca de Peças',
      'Diagnóstico Técnico',
      'Desinstalação',
      'Relocação de Equipamento',
      'Teste de Performance',
      'Reparo de Vazamento',
      'Instalação de Split'
    ];

    for (let i = 0; i < CONFIG.services; i++) {
      const service = await Service.create({
        account: accountId,
        name: serviceNames[i] || faker.commerce.productName(),
        description: faker.lorem.sentence(),
        value: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
        createdBy,
        updatedBy: createdBy
      });
      services.push(service);
    }
    console.log(`✅ Created ${services.length} services\n`);

    // 4. Create Products
    console.log(`📦 Creating ${CONFIG.products} products...`);
    const products = [];
    const makers = ['Samsung', 'LG', 'Daikin', 'Carrier', 'Midea', 'Gree', 'Fujitsu', 'Electrolux'];
    const productTypes = [
      'Filtro de Ar',
      'Gás R410A',
      'Gás R22',
      'Controle Remoto',
      'Sensor de Temperatura',
      'Placa Eletrônica',
      'Compressor',
      'Capacitor',
      'Suporte de Parede',
      'Dreno',
      'Tubulação de Cobre',
      'Isolamento Térmico',
      'Condensador',
      'Evaporador',
      'Ventilador'
    ];

    for (let i = 0; i < CONFIG.products; i++) {
      const maker = faker.helpers.arrayElement(makers);
      const product = await Product.create({
        account: accountId,
        name: productTypes[i % productTypes.length],
        description: faker.commerce.productDescription(),
        maker,
        model: `${maker}-${faker.string.alphanumeric(5).toUpperCase()}`,
        value: parseFloat(faker.commerce.price({ min: 20, max: 2000 })),
        sku: faker.string.alphanumeric(8).toUpperCase(),
        createdBy,
        updatedBy: createdBy
      });
      products.push(product);
    }
    console.log(`✅ Created ${products.length} products\n`);

    // 5. Create Quotes
    console.log(`💰 Creating ${CONFIG.quotes} quotes...`);
    const quotes = [];
    for (let i = 0; i < CONFIG.quotes; i++) {
      const customer = faker.helpers.arrayElement(customers);
      const customerEquipments = customer.equipments || [];

      const numServices = faker.number.int({ min: 1, max: 3 });
      const numProducts = faker.number.int({ min: 0, max: 4 });

      const quoteServices = [];
      let subtotal = 0;

      for (let j = 0; j < numServices; j++) {
        const service = faker.helpers.arrayElement(services);
        const quantity = faker.number.int({ min: 1, max: 3 });
        const unitValue = service.value;
        quoteServices.push({
          service: service._id,
          quantity,
          unitValue
        });
        subtotal += quantity * unitValue;
      }

      const quoteProducts = [];
      for (let j = 0; j < numProducts; j++) {
        const product = faker.helpers.arrayElement(products);
        const quantity = faker.number.int({ min: 1, max: 5 });
        const unitValue = product.value;
        quoteProducts.push({
          product: product._id,
          quantity,
          unitValue
        });
        subtotal += quantity * unitValue;
      }

      const discount = faker.helpers.maybe(() => faker.number.int({ min: 5, max: 20 }), { probability: 0.3 }) || 0;
      const totalValue = subtotal * (1 - discount / 100);

      const quote = await Quote.create({
        account: accountId,
        customer: customer._id,
        equipments: [],
        services: quoteServices,
        products: quoteProducts,
        totalValue,
        description: faker.lorem.paragraph(),
        discount,
        status: faker.helpers.arrayElement(['draft', 'sent', 'accepted', 'rejected']),
        validUntil: faker.date.future({ years: 0.1 }),
        issuedAt: faker.date.recent({ days: 30 }),
        createdBy,
        updatedBy: createdBy
      });
      quotes.push(quote);
    }
    console.log(`✅ Created ${quotes.length} quotes\n`);

    // 7. Create Service Orders (from accepted quotes)
    console.log(`📋 Creating ${CONFIG.serviceOrders} service orders...`);
    const acceptedQuotes = quotes.filter((q) => q.status === 'accepted').slice(0, CONFIG.serviceOrders);
    const serviceOrders = [];

    for (let i = 0; i < Math.min(CONFIG.serviceOrders, acceptedQuotes.length); i++) {
      const quote = acceptedQuotes[i] || faker.helpers.arrayElement(quotes);
      const customer = customers.find((c) => c._id.toString() === quote.customer.toString())!;
      const customerEquipments = customer.equipments || [];

      // Build items array
      const items = [];
      for (const svc of quote.services || []) {
        const service = services.find((s) => s._id.toString() === svc.service.toString());
        if (service) {
          items.push({
            type: 'service' as const,
            itemId: service._id,
            name: service.name,
            description: service.description,
            quantity: svc.quantity,
            unitValue: svc.unitValue,
            totalValue: svc.quantity * svc.unitValue
          });
        }
      }

      for (const prod of quote.products || []) {
        const product = products.find((p) => p._id.toString() === prod.product.toString());
        if (product) {
          items.push({
            type: 'product' as const,
            itemId: product._id,
            name: product.name,
            description: product.description,
            quantity: prod.quantity,
            unitValue: prod.unitValue,
            totalValue: prod.quantity * prod.unitValue
          });
        }
      }

      const subtotal = items.reduce((sum, item) => sum + item.totalValue, 0);
      const totalValue = quote.totalValue;

      const serviceOrder = await ServiceOrder.create({
        ...getServiceOrderStatus(),
        orderNumber: `SO${Math.random().toString().slice(2, 16)}`,
        quote: quote._id,
        customer: customer._id,
        equipments: [],
        account: accountId,
        items,
        description: quote.description,
        discount: quote.discount || 0,
        subtotal,
        totalValue,
        issuedAt: quote.issuedAt,
        scheduledDate: faker.date.soon({ days: 7 }),
        assignedTechnician: faker.helpers.arrayElement(technicians)._id,
        priority: faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent']),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
        paymentStatus: faker.helpers.arrayElement(['pending', 'partial', 'paid']),
        paidAmount: 0
      });
      serviceOrders.push(serviceOrder);
    }
    console.log(`✅ Created ${serviceOrders.length} service orders\n`);

    // 8. Create Events (Calendar appointments)
    console.log(`📅 Creating calendar events...`);
    const events = [];
    for (const technician of technicians) {
      const numEvents = faker.number.int(CONFIG.eventsPerTechnician);

      for (let i = 0; i < numEvents; i++) {
        const customer = faker.helpers.arrayElement(customers);
        const eventDate = faker.date.between({
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
        });

        const startHour = faker.number.int({ min: 8, max: 17 });
        const startTime = `${String(startHour).padStart(2, '0')}:${faker.helpers.arrayElement(['00', '30'])}`;
        const endHour = startHour + faker.number.int({ min: 1, max: 3 });
        const endTime = `${String(endHour).padStart(2, '0')}:${faker.helpers.arrayElement(['00', '30'])}`;

        // Link to service order if available
        const technicianOrders = serviceOrders.filter((so) => so.assignedTechnician?.toString() === technician._id.toString());
        const linkedServiceOrder =
          technicianOrders.length > 0 ? faker.helpers.maybe(() => faker.helpers.arrayElement(technicianOrders)._id, { probability: 0.4 }) : undefined;

        const event = await Event.create({
          account: accountId,
          date: eventDate.toISOString().split('T')[0],
          startTime,
          endTime,
          customer: customer._id,
          technician: technician._id,
          serviceOrder: linkedServiceOrder,
          title: faker.helpers.arrayElement(['Manutenção Preventiva', 'Instalação', 'Reparo', 'Visita Técnica', 'Diagnóstico']),
          description: faker.lorem.sentence(),
          status: faker.helpers.arrayElement(['scheduled', 'completed', 'cancelled']),
          createdBy,
          updatedBy: createdBy
        });
        events.push(event);
      }
    }
    console.log(`✅ Created ${events.length} calendar events\n`);

    // 9. Create Follow-Ups
    console.log(`📞 Creating ${CONFIG.followUps} follow-ups...`);
    const followUps = [];
    for (let i = 0; i < CONFIG.followUps; i++) {
      const customer = faker.helpers.arrayElement(customers);

      // Mix of overdue, due today, and future follow-ups
      let startDate;
      const randomType = faker.number.int({ min: 0, max: 100 });
      if (randomType < 30) {
        // 30% overdue (1-15 days ago)
        startDate = faker.date.recent({ days: 15 });
      } else if (randomType < 50) {
        // 20% due today
        startDate = new Date();
      } else {
        // 50% future (1-30 days from now)
        startDate = faker.date.soon({ days: 30 });
      }

      // 70% pending, 30% completed
      const status = faker.helpers.weightedArrayElement([
        { weight: 7, value: 'pending' },
        { weight: 3, value: 'completed' }
      ]);

      const followUpData: any = {
        account: accountId,
        customer: customer._id,
        startDate,
        status,
        createdBy,
        updatedBy: createdBy
      };

      // If completed, add completion details
      if (status === 'completed') {
        // Only set completedAt if startDate is in the past
        const now = new Date();
        if (startDate <= now) {
          followUpData.completedAt = faker.date.between({
            from: startDate,
            to: now
          });
        } else {
          // If startDate is in the future, set completedAt to a bit after startDate
          followUpData.completedAt = faker.date.soon({ days: 2, refDate: startDate });
        }
        followUpData.completedBy = createdBy;
        followUpData.notes = faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 });
      }

      const followUp = await FollowUp.create(followUpData);
      followUps.push(followUp);
    }
    console.log(`✅ Created ${followUps.length} follow-ups\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ SUMMARY - Dummy Data Created Successfully\n');
    console.log(`👷 Technicians:     ${technicians.length}`);
    console.log(`👥 Customers:       ${customers.length}`);
    console.log(`🔧 Services:        ${services.length}`);
    console.log(`📦 Products:        ${products.length}`);
    console.log(`❄️  Equipment:       ${equipments.length}`);
    console.log(`💰 Quotes:          ${quotes.length}`);
    console.log(`📋 Service Orders:  ${serviceOrders.length}`);
    console.log(`📅 Events:          ${events.length}`);
    console.log(`📞 Follow-Ups:      ${followUps.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Done! Your application is now populated with test data.');
  } catch (error) {
    console.error('❌ Error generating dummy data:', error);
    await mongoose.disconnect();
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Database connection closed.');
    process.exit(0);
  }
}

// Run the script
populateDummyData();
